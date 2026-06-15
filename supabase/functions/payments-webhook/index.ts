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
    if (event.type === "checkout.session.completed") {
      const data: any = event.data.object;
      const session = data.object === "checkout.session" ? data : await stripe.checkout.sessions.retrieve(data.id);

      const userId: string | undefined =
        session.metadata?.userId ||
        (session.customer ? (await stripe.customers.retrieve(session.customer as string) as any).metadata?.userId : undefined);

      const amount = session.amount_total ?? 0;
      const currency = session.currency ?? "usd";
      const paymentId = (session.payment_intent as string) ?? session.id;

      // Best-effort: pull the receipt URL from the latest charge
      let receiptUrl: string | null = null;
      try {
        if (session.payment_intent) {
          const pi: any = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
            expand: ["latest_charge"],
          });
          receiptUrl = pi.latest_charge?.receipt_url ?? null;
        }
      } catch (e) {
        console.warn("receipt fetch failed", e);
      }

      if (userId) {
        await supabase.from("purchases").upsert(
          {
            user_id: userId,
            stripe_payment_id: paymentId,
            amount_cents: amount,
            currency,
            status: "completed",
            receipt_url: receiptUrl,
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

        // Send welcome email — once per user. Idempotency key prevents duplicate sends
        // on webhook retries.
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const recipientEmail = userData?.user?.email;
          const name =
            (userData?.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
            recipientEmail?.split("@")[0];
          if (recipientEmail) {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "welcome",
                recipientEmail,
                idempotencyKey: `welcome-${userId}`,
                templateData: { name },
              },
            });
          }
        } catch (e) {
          console.warn("welcome email send failed (non-fatal)", e);
        }
      } else {
        console.warn("No userId on session; cannot grant access", session.id);
      }
    } else if (event.type === "charge.refunded" || event.type === "charge.refund.updated") {
      const charge: any = event.data.object.object === "charge"
        ? event.data.object
        : await stripe.charges.retrieve((event.data.object as any).charge);

      const piId: string | undefined = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
      if (!piId) return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });

      const fullyRefunded = charge.refunded === true || (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);

      // Find the purchase row by payment intent id
      const { data: purchaseRows } = await supabase
        .from("purchases")
        .select("user_id")
        .eq("stripe_payment_id", piId)
        .limit(1);
      const userId = purchaseRows?.[0]?.user_id;

      await supabase
        .from("purchases")
        .update({
          status: fullyRefunded ? "refunded" : "partially_refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("stripe_payment_id", piId);

      if (userId && fullyRefunded) {
        await supabase
          .from("entitlements")
          .upsert(
            { user_id: userId, has_access: false, source: "stripe_refund", granted_at: null },
            { onConflict: "user_id" }
          );
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