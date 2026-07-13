import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { snaptradeRequest, decrypt, SNAPTRADE_PERSONAL_SECRET_SENTINEL } from "../_shared/snaptrade.ts";

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
    const body = await req.json().catch(() => ({}));
    const accountId = String(body.accountId ?? "");
    if (!accountId) return json({ error: "accountId is required" }, 400);

    const [{ data: st }, { data: acct }] = await Promise.all([
      admin.from("snaptrade_users").select("st_user_id, st_user_secret_ciphertext").eq("user_id", userId).maybeSingle(),
      admin.from("brokerage_accounts").select("st_account_id").eq("id", accountId).eq("user_id", userId).maybeSingle(),
    ]);
    if (!st || !acct) return json({ error: "Account not found" }, 404);

    const userSecret = await decrypt(st.st_user_secret_ciphertext);
    const isPersonalKey = userSecret === SNAPTRADE_PERSONAL_SECRET_SENTINEL;

    try {
      type StAccount = { id: string; brokerage_authorization?: string };
      const accounts = isPersonalKey
        ? await snaptradeRequest<StAccount[]>("/accounts")
        : await snaptradeRequest<StAccount[]>("/accounts", { query: { userId: st.st_user_id, userSecret } });
      const match = accounts.find((a) => a.id === acct.st_account_id);
      if (match?.brokerage_authorization) {
        const q = isPersonalKey ? {} : { userId: st.st_user_id, userSecret };
        await snaptradeRequest(`/authorizations/${encodeURIComponent(match.brokerage_authorization)}`, { method: "DELETE", query: q });
      }
    } catch (e) {
      // Local delete still proceeds even if the remote authorization removal fails.
      console.error("SnapTrade authorization removal failed", (e as Error).message);
    }

    await admin.from("brokerage_accounts").delete().eq("id", accountId).eq("user_id", userId);
    return json({ ok: true });
  } catch (e) {
    console.error("broker-disconnect error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
