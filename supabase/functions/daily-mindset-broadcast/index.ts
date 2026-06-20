// Runs daily via pg_cron. For each user with a push token, generates a mindset
// nudge and fires a push via send-push. No-ops gracefully if FCM/APNs not configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getRoleFromAuth(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const parts = header.slice(7).split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const claims = JSON.parse(atob(payload)) as { role?: string };
    return claims.role ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Only the scheduled cron (using the service_role key) may invoke this.
    const role = getRoleFromAuth(req.headers.get("Authorization"));
    if (role !== "service_role") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500 });

    // Distinct users that have at least one push token.
    const { data: tokens } = await supa.from("push_tokens").select("user_id");
    const userIds = Array.from(new Set((tokens ?? []).map((t: { user_id: string }) => t.user_id)));
    if (!userIds.length) return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no push tokens" }), { headers: { ...cors, "Content-Type": "application/json" } });

    let sent = 0;
    for (const user_id of userIds) {
      try {
        const mind = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/daily-mindset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ mode: "daily", seed: `${user_id}-${new Date().toISOString().slice(0,10)}` }),
        }).then(r => r.json());

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            user_id,
            title: `Z1 · ${mind.tag ?? "Mindset"}`,
            body: mind.quote ?? "Your edge is built in the boring reps.",
            data: { route: "/vault", kind: "daily-mindset" },
          }),
        });
        sent++;
      } catch (e) {
        console.error("push fail", user_id, e);
      }
    }
    return new Response(JSON.stringify({ ok: true, sent, users: userIds.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});