import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rithmicConnect, rithmicListAccounts, rithmicDisconnect, encryptRithmicCredentials, type RithmicCredentials } from "../_shared/rithmic.ts";

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

    const body = await req.json().catch(() => ({}));
    const credentials: RithmicCredentials = {
      gateway: String(body.gateway ?? "").trim(),
      systemName: String(body.systemName ?? "").trim(),
      username: String(body.username ?? "").trim(),
      password: String(body.password ?? ""),
      appName: String(body.appName ?? "").trim() || "z1vault",
      appVersion: String(body.appVersion ?? "").trim() || "1.0",
    };
    if (!credentials.gateway || !credentials.systemName || !credentials.username || !credentials.password) {
      return json({ error: "Fill in gateway, system name, username, and password before connecting." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let session;
    let accounts;
    try {
      session = await rithmicConnect(credentials);
      accounts = await rithmicListAccounts(session);
    } catch (e) {
      return json({ error: (e as Error).message || "Rithmic connection failed" }, 502);
    } finally {
      if (session) await rithmicDisconnect(session).catch(() => {});
    }

    const { error: connError } = await admin.from("rithmic_connections").upsert(
      { user_id: userId, ...(await encryptRithmicCredentials(credentials)) },
      { onConflict: "user_id" },
    );
    if (connError) return json({ error: `Could not save Rithmic connection: ${connError.message}` }, 500);

    const nowIso = new Date().toISOString();
    for (const a of accounts) {
      await admin.from("brokerage_accounts").upsert({
        user_id: userId,
        st_account_id: `rithmic:${a.account_id}`,
        provider: "rithmic",
        brokerage_name: "Rithmic",
        account_name: a.account_name ?? a.account_id,
        currency: a.account_currency ?? null,
        last_synced_at: nowIso,
      }, { onConflict: "user_id,st_account_id" });
    }

    return json({ ok: true, accounts: accounts.length });
  } catch (e) {
    console.error("rithmic-connect error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
