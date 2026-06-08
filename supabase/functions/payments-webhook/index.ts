import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env: StripeEnv = url.searchParams.get("env") === "live" ? "live" : "sandbox";
  const stripe = createStripeClient(env);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, getWebhookSecret(env));
  } catch (err) {
    console.error("Webhook signature failed", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (event.type === "transaction.completed" || event.type === "checkout.session.completed") {
      const data: any = event.data.object;
      const session = data.object === "checkout.session" ? data : await stripe.checkout.sessions.retrieve(data.id);

      const userId: string | undefined =
        session.metadata?.userId ||
        (session.customer ? (await stripe.customers.retrieve(session.customer as string) as any).metadata?.userId : undefined);

      const amount = session.amount_total ?? 0;
      const currency = session.currency ?? "usd";
      const paymentId = session.payment_intent ?? session.id;

      if (userId) {
        await supabase.from("purchases").upsert(
          {
            user_id: userId,
            stripe_payment_id: paymentId,
            amount_cents: amount,
            currency,
            status: "completed",
          },
          { onConflict: "stripe_payment_id" }
        );

        await supabase
          .from("entitlements")
          .upsert(
            {
              user_id: userId,
              has_access: true,
              source: "stripe",
              granted_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
      } else {
        console.warn("No userId on session; cannot grant access", session.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});