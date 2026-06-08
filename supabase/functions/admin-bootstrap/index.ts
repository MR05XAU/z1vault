// One-shot bootstrap: promotes the FIRST signed-in caller to admin
// IFF no admin exists yet. After that, only existing admins can grant roles.
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in first" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Sign in first" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { count } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      return json({ error: "Admin already exists. Ask an existing admin to grant your role." }, 403);
    }

    await admin.from("user_roles").upsert(
      { user_id: u.user.id, role: "admin" },
      { onConflict: "user_id,role" },
    );
    // Also grant access so you can use the app immediately
    await admin.from("entitlements").upsert(
      { user_id: u.user.id, has_access: true, source: "admin_bootstrap", granted_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}