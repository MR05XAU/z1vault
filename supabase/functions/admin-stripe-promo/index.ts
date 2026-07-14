import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Admin Stripe promo-code management.
 *
 * Body:
 *   environment: "sandbox" | "live"
 *   action: "list" | "create" | "deactivate"
 *
 * "create" extras:
 *   code: string                          (the promo code shown to customers, e.g. "VIP20")
 *   percent_off?: number                  (1-100)        — one of percent_off or amount_off required
 *   amount_off?: number                   (integer in MINOR units, e.g. cents)
 *   currency?: string                     (required with amount_off, e.g. "gbp")
 *   duration?: "once" | "forever" | "repeating"   (default "once")
 *   duration_in_months?: number           (required if duration="repeating")
 *   max_redemptions?: number
 *   expires_in_days?: number
 *   name?: string                         (admin-facing label for the coupon)
 *
 * "deactivate" extras:
 *   promo_id: string                      (a Stripe promotion_code id, "promo_...")
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const env: StripeEnv = body.environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(env);
    const action = String(body.action ?? "list");

    if (action === "list") {
      const promos = await stripe.promotionCodes.list({ limit: 50, expand: ["data.coupon"] });
      return json({
        ok: true,
        environment: env,
        promos: promos.data.map((p) => ({
          id: p.id,
          code: p.code,
          active: p.active,
          created: p.created,
          expires_at: p.expires_at,
          max_redemptions: p.max_redemptions,
          times_redeemed: p.times_redeemed,
          coupon: {
            id: (p.coupon as any).id,
            name: (p.coupon as any).name,
            percent_off: (p.coupon as any).percent_off,
            amount_off: (p.coupon as any).amount_off,
            currency: (p.coupon as any).currency,
            duration: (p.coupon as any).duration,
            duration_in_months: (p.coupon as any).duration_in_months,
          },
        })),
      });
    }

    if (action === "create") {
      const code = String(body.code ?? "").trim().toUpperCase();
      if (!code) return json({ error: "code required" }, 400);
      const hasPercent = typeof body.percent_off === "number" && body.percent_off > 0;
      const hasAmount = typeof body.amount_off === "number" && body.amount_off > 0;
      if (!hasPercent && !hasAmount) {
        return json({ error: "percent_off or amount_off required" }, 400);
      }
      if (hasAmount && !body.currency) {
        return json({ error: "currency required when using amount_off" }, 400);
      }

      const duration = (body.duration as string) || "once";

      const couponParams: any = {
        duration,
        name: body.name ? String(body.name) : `Promo ${code}`,
      };
      if (hasPercent) couponParams.percent_off = Number(body.percent_off);
      if (hasAmount) {
        couponParams.amount_off = Math.round(Number(body.amount_off));
        couponParams.currency = String(body.currency).toLowerCase();
      }
      if (duration === "repeating") {
        if (!body.duration_in_months) {
          return json({ error: "duration_in_months required when duration=repeating" }, 400);
        }
        couponParams.duration_in_months = Number(body.duration_in_months);
      }

      const coupon = await stripe.coupons.create(couponParams);

      const promoParams: any = { promotion: { type: "coupon", coupon: coupon.id }, code };
      if (body.max_redemptions) promoParams.max_redemptions = Number(body.max_redemptions);
      if (body.expires_in_days) {
        promoParams.expires_at = Math.floor(Date.now() / 1000) + Number(body.expires_in_days) * 86400;
      }

      const promo = await stripe.promotionCodes.create(promoParams);
      return json({ ok: true, environment: env, promo_id: promo.id, code: promo.code });
    }

    if (action === "deactivate") {
      const promoId = String(body.promo_id ?? "");
      if (!promoId) return json({ error: "promo_id required" }, 400);
      const updated = await stripe.promotionCodes.update(promoId, { active: false });
      return json({ ok: true, promo_id: updated.id, active: updated.active });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});