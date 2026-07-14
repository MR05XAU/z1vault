import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncUserBrokers } from "../_shared/brokerSync.ts";

// Pulls this user's connected broker accounts (SnapTrade / Tradovate /
// Rithmic) + recent activity, and upserts them into brokerage_accounts /
// trades. Idempotent via the trades(user_id, external_id) unique index.
// Core logic lives in _shared/brokerSync.ts, shared with cron-broker-sync-all.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: st }, { data: tradovate }, { data: rithmic }] = await Promise.all([
      admin.from("snaptrade_users").select("user_id").eq("user_id", userId).maybeSingle(),
      admin.from("tradovate_connections").select("user_id").eq("user_id", userId).maybeSingle(),
      admin.from("rithmic_connections").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (!st && !tradovate && !rithmic) return json({ error: "not_registered" }, 400);

    const result = await syncUserBrokers(admin, userId);
    return json(result);
  } catch (e) {
    console.error("broker-sync error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
