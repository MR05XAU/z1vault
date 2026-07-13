import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listTradovateAccounts, encryptTradovateCredentials, type TradovateCredentials } from "../_shared/tradovate.ts";

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
    const credentials: TradovateCredentials = {
      environment: body.environment === "demo" ? "demo" : "live",
      username: String(body.username ?? "").trim(),
      password: String(body.password ?? ""),
      appId: String(body.appId ?? "").trim(),
      appVersion: String(body.appVersion ?? "").trim() || "1.0",
      cid: String(body.cid ?? "").trim(),
      sec: String(body.sec ?? ""),
    };
    if (!credentials.username || !credentials.password || !credentials.appId || !credentials.cid || !credentials.sec) {
      return json({ error: "Fill in every Tradovate field before connecting." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let accounts;
    try {
      ({ accounts } = await listTradovateAccounts(credentials));
    } catch (e) {
      return json({ error: (e as Error).message || "Tradovate connection failed" }, 502);
    }

    const { error: connError } = await admin.from("tradovate_connections").upsert(
      { user_id: userId, ...(await encryptTradovateCredentials(credentials)) },
      { onConflict: "user_id" },
    );
    if (connError) return json({ error: `Could not save Tradovate connection: ${connError.message}` }, 500);

    const nowIso = new Date().toISOString();
    for (const a of accounts) {
      await admin.from("brokerage_accounts").upsert({
        user_id: userId,
        st_account_id: `tradovate:${a.id}`,
        provider: "tradovate",
        brokerage_name: "Tradovate",
        account_name: a.nickname ?? a.name ?? a.accountSpec ?? `Account ${a.id}`,
        account_number_masked: a.accountSpec ?? null,
        last_synced_at: nowIso,
      }, { onConflict: "user_id,st_account_id" });
    }

    return json({ ok: true, accounts: accounts.length });
  } catch (e) {
    console.error("tradovate-connect error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
