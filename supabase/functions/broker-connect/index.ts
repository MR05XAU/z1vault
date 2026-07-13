import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { snaptradeRequest, encrypt, decrypt, SNAPTRADE_PERSONAL_SECRET_SENTINEL } from "../_shared/snaptrade.ts";

// Registers (or logs in) the current user with SnapTrade and returns a
// connection-portal URL to redirect them to. Some SnapTrade API keys are
// "personal" keys tied to one already-registered brokerage login rather than
// a multi-user app — registerUser then fails with error 1012, in which case
// we fall back to the personal connection portal instead.
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
    const returnUrl = String(body.returnUrl ?? "");
    if (!returnUrl) return json({ error: "returnUrl is required" }, 400);

    const { data: row } = await admin
      .from("snaptrade_users")
      .select("st_user_id, st_user_secret_ciphertext")
      .eq("user_id", userId)
      .maybeSingle();

    let stUserId: string;
    let stUserSecret: string;

    if (!row) {
      stUserId = `z1_${userId}`;
      try {
        const res = await snaptradeRequest<{ userSecret?: string }>("/snapTrade/registerUser", { method: "POST", body: { userId: stUserId } });
        if (!res.userSecret) throw new Error("SnapTrade did not return a user secret");
        stUserSecret = res.userSecret;
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (/personal|1012|not available/i.test(msg)) {
          const login = await snaptradeRequest<{ redirectURI?: string }>("/snapTrade/login", {
            method: "POST",
            body: { customRedirect: returnUrl, showCloseButton: true, connectionPortalVersion: "v4" },
          });
          if (!login.redirectURI) return json({ error: "SnapTrade did not return a connection URL" }, 502);
          await admin.from("snaptrade_users").insert({
            user_id: userId,
            st_user_id: `personal_${userId}`,
            st_user_secret_ciphertext: await encrypt(SNAPTRADE_PERSONAL_SECRET_SENTINEL),
          });
          return json({ url: login.redirectURI });
        }
        console.error("SnapTrade register failed", msg);
        return json({ error: msg }, 502);
      }
      const { error: insertError } = await admin.from("snaptrade_users").insert({
        user_id: userId,
        st_user_id: stUserId,
        st_user_secret_ciphertext: await encrypt(stUserSecret),
      });
      if (insertError) return json({ error: `Could not save broker sync user: ${insertError.message}` }, 500);
    } else {
      stUserId = row.st_user_id;
      stUserSecret = await decrypt(row.st_user_secret_ciphertext);
    }

    if (stUserSecret === SNAPTRADE_PERSONAL_SECRET_SENTINEL) {
      const login = await snaptradeRequest<{ redirectURI?: string }>("/snapTrade/login", {
        method: "POST",
        body: { customRedirect: returnUrl, showCloseButton: true, connectionPortalVersion: "v4" },
      });
      if (!login.redirectURI) return json({ error: "SnapTrade did not return a connection URL" }, 502);
      return json({ url: login.redirectURI });
    }

    const login = await snaptradeRequest<{ redirectURI?: string }>("/snapTrade/login", {
      method: "POST",
      body: { userId: stUserId, userSecret: stUserSecret, customRedirect: returnUrl, connectionPortalVersion: "v4" },
    });
    if (!login.redirectURI) return json({ error: "SnapTrade did not return a connection URL" }, 502);
    return json({ url: login.redirectURI });
  } catch (e) {
    console.error("broker-connect error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
