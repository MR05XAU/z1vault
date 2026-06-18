import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
 * Admin broadcast: send the "announcement" template to a filtered audience.
 *
 * Body:
 *   audience: "all" | "paid" | "free"        (required)
 *   subject: string                          (required)
 *   heading: string                          (required)
 *   body: string                             (required, plain text, blank lines = paragraphs)
 *   ctaLabel?: string
 *   ctaUrl?: string
 *   promoCode?: string
 *   promoNote?: string
 *   test?: boolean | string                  (true → only send to caller; string email → send to that one address)
 *
 * Returns: { ok, queued, audience, total }
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
    const audience = String(body.audience ?? "all");
    const subject = String(body.subject ?? "").trim();
    const heading = String(body.heading ?? "").trim();
    const text = String(body.body ?? "").trim();
    if (!subject || !heading || !text) {
      return json({ error: "subject, heading and body are required" }, 400);
    }
    if (!["all", "paid", "free"].includes(audience)) {
      return json({ error: "audience must be all|paid|free" }, 400);
    }

    // Build recipient list
    let recipients: { id: string; email: string; full_name: string | null }[] = [];

    if (body.test === true) {
      recipients = [{
        id: userData.user.id,
        email: userData.user.email!,
        full_name: (userData.user.user_metadata as any)?.full_name ?? null,
      }];
    } else if (typeof body.test === "string" && body.test.includes("@")) {
      recipients = [{ id: "test", email: body.test.trim(), full_name: null }];
    } else {
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("id, email, full_name, entitlements(has_access)")
        .not("email", "is", null);
      if (pErr) return json({ error: pErr.message }, 500);

      recipients = (profiles ?? [])
        .filter((p: any) => {
          if (!p.email) return false;
          const ent = Array.isArray(p.entitlements) ? p.entitlements[0] : p.entitlements;
          const paid = !!ent?.has_access;
          if (audience === "paid") return paid;
          if (audience === "free") return !paid;
          return true;
        })
        .map((p: any) => ({ id: p.id, email: p.email, full_name: p.full_name ?? null }));
    }

    if (recipients.length === 0) {
      return json({ ok: true, queued: 0, audience, total: 0, note: "No recipients matched." });
    }

    const campaignId = crypto.randomUUID();
    const templateData = {
      subject,
      heading,
      body: text,
      ctaLabel: body.ctaLabel ? String(body.ctaLabel) : undefined,
      ctaUrl: body.ctaUrl ? String(body.ctaUrl) : undefined,
      promoCode: body.promoCode ? String(body.promoCode) : undefined,
      promoNote: body.promoNote ? String(body.promoNote) : undefined,
    };

    // Enqueue per-recipient sends via the existing send-transactional-email function.
    // Throttle a little to be polite to the queue.
    let queued = 0;
    const failures: { email: string; error: string }[] = [];
    for (const r of recipients) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/send-transactional-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: SERVICE_KEY,
            },
            body: JSON.stringify({
              templateName: "announcement",
              recipientEmail: r.email,
              idempotencyKey: `broadcast-${campaignId}-${r.id}`,
              templateData: { ...templateData, name: r.full_name ?? undefined },
            }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          failures.push({ email: r.email, error: j.error || `HTTP ${res.status}` });
        } else {
          queued++;
        }
      } catch (e: any) {
        failures.push({ email: r.email, error: e?.message ?? "send failed" });
      }
    }

    return json({
      ok: true,
      campaign_id: campaignId,
      audience,
      total: recipients.length,
      queued,
      failed: failures.length,
      failures: failures.slice(0, 10),
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});