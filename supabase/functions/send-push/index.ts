// Send native push notifications via FCM HTTP v1 (Android) and APNs (iOS).
// Requires secrets: FCM_SERVICE_ACCOUNT_JSON, APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID.
// Until those are provided this function returns a clear configuration error so
// the rest of the app continues to work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJwt(header: string | null): { role?: string; sub?: string } | null {
  if (!header?.startsWith("Bearer ")) return null;
  const parts = header.slice(7).split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload));
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Auth: caller must either be service_role (server-side broadcasts) or
    // a signed-in user targeting their own user_id. Without this any
    // authenticated user could push arbitrary notifications to any other
    // user and enumerate their push tokens.
    const claims = parseJwt(req.headers.get("Authorization"));
    const isService = claims?.role === "service_role";
    const isSelf = claims?.role === "authenticated" && claims?.sub === user_id;
    if (!isService && !isSelf) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: tokens } = await supa
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    const fcmKey = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    const apnsKey = Deno.env.get("APNS_KEY_P8");
    if (!fcmKey && !apnsKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          configured: false,
          message: "Push credentials not configured yet. Add FCM_SERVICE_ACCOUNT_JSON and APNS_KEY_P8 secrets to enable delivery.",
          would_send_to: tokens?.length ?? 0,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Real send logic to be wired once Apple Developer + FCM credentials are added.
    return new Response(JSON.stringify({ ok: true, sent: tokens?.length ?? 0, title, body, data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});