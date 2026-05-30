import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRICE_TO_PLAN: Record<string, "solo" | "pro" | "elite"> = {
  price_1TcqsSAX0VXOEOzwRBK7CtRb: "solo",
  price_1TcqrwAX0VXOEOzwwWIjgdxD: "pro",
  price_1TcqrCAX0VXOEOzwJBNS76yA: "elite",
};

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) {
          return new Response("Stripe env not configured", { status: 500 });
        }

        const stripe = new Stripe(secret);
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, whSecret);
        } catch (err) {
          console.error("[stripe-webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const userId = session.metadata?.user_id;
              if (!userId) {
                console.warn("[stripe-webhook] checkout.session.completed missing user_id metadata");
                break;
              }

              const subscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id ?? null;
              const customerId =
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id ?? null;

              let plan: "solo" | "pro" | "elite" | null = null;
              if (subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = sub.items.data[0]?.price.id;
                if (priceId && PRICE_TO_PLAN[priceId]) plan = PRICE_TO_PLAN[priceId];
              }

              const { error } = await supabaseAdmin
                .from("profiles")
                .update({
                  ...(plan ? { plan } : {}),
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  subscription_status: "active",
                })
                .eq("id", userId);
              if (error) throw error;
              break;
            }

            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
              const { error } = await supabaseAdmin
                .from("profiles")
                .update({ plan: "solo", subscription_status: "cancelled" })
                .eq("stripe_customer_id", customerId);
              if (error) throw error;
              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              const customerId =
                typeof invoice.customer === "string"
                  ? invoice.customer
                  : invoice.customer?.id ?? null;
              if (!customerId) break;
              const { error } = await supabaseAdmin
                .from("profiles")
                .update({ subscription_status: "past_due" })
                .eq("stripe_customer_id", customerId);
              if (error) throw error;
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", event.type, err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
