import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncUserBrokers } from "../_shared/brokerSync.ts";

// Scheduled via pg_cron every 15 minutes (see migration
// 20260714160000_cron_broker_sync.sql) — syncs every user with an active
// broker connection, not just the currently-logged-in one. Authenticated by
// a shared secret header (CRON_SECRET) rather than a user JWT, since there
// is no per-user session in a cron context.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret || req.headers.get("x-cron-secret") !== secret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: st }, { data: tradovate }, { data: rithmic }] = await Promise.all([
      admin.from("snaptrade_users").select("user_id"),
      admin.from("tradovate_connections").select("user_id"),
      admin.from("rithmic_connections").select("user_id"),
    ]);
    const userIds = Array.from(new Set([
      ...(st ?? []).map((r: { user_id: string }) => r.user_id),
      ...(tradovate ?? []).map((r: { user_id: string }) => r.user_id),
      ...(rithmic ?? []).map((r: { user_id: string }) => r.user_id),
    ]));

    const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
    // Small concurrency cap so a large user base doesn't hammer broker APIs
    // (and hit rate limits) all at the exact same moment every 15 minutes.
    const CONCURRENCY = 3;
    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
      const batch = userIds.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async (userId) => {
        try {
          await syncUserBrokers(admin, userId);
          return { userId, ok: true };
        } catch (e) {
          return { userId, ok: false, error: (e as Error).message };
        }
      }));
      results.push(...batchResults);
    }

    return json({ usersProcessed: userIds.length, results });
  } catch (e) {
    console.error("cron-broker-sync-all error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
