import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { z } from "zod";

export const PLAN_PRICE_IDS = {
  solo: "price_1TcqsSAX0VXOEOzwRBK7CtRb",
  pro: "price_1TcqrwAX0VXOEOzwwWIjgdxD",
  elite: "price_1TcqrCAX0VXOEOzwJBNS76yA",
} as const;

export type PlanKey = keyof typeof PLAN_PRICE_IDS;

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        plan: z.enum(["solo", "pro", "elite"]).optional(),
        price_id: z.string().optional(),
      })
      .refine((v) => v.plan || v.price_id, {
        message: "plan or price_id required",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email;
    const priceId = data.price_id ?? PLAN_PRICE_IDS[data.plan as PlanKey];

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(secret);

    const origin =
      getRequestHeader("origin") ??
      getRequestHeader("referer")?.replace(/\/$/, "") ??
      "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?subscribed=true`,
      cancel_url: `${origin}/pricing`,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
    });

    return { url: session.url };
  });
