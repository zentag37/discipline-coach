import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import Stripe from "stripe";

export const getSubscriptionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, subscription_status, stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    let currentPeriodEnd: number | null = null;
    let cancelAtPeriodEnd = false;

    if (profile?.stripe_subscription_id) {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (secret) {
        try {
          const stripe = new Stripe(secret);
          const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
          currentPeriodEnd = (sub as unknown as { current_period_end: number }).current_period_end ?? null;
          cancelAtPeriodEnd = sub.cancel_at_period_end;
        } catch {/* ignore */}
      }
    }

    return {
      plan: profile?.plan ?? "solo",
      status: profile?.subscription_status ?? "inactive",
      subscriptionId: profile?.stripe_subscription_id ?? null,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.stripe_subscription_id) {
      throw new Error("No active subscription");
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(secret);
    await stripe.subscriptions.cancel(profile.stripe_subscription_id);

    await supabaseAdmin
      .from("profiles")
      .update({ subscription_status: "cancelled", plan: "solo" })
      .eq("id", userId);

    return { ok: true };
  });
