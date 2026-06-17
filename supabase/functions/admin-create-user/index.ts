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
 * Admin tools for managing users:
 *   action="create"        - create a new user with email + temp password (+ optional access grant)
 *   action="reset_password"- send a password-reset email to an existing user
 *   action="grant_access"  - flip entitlement on
 *   action="revoke_access" - flip entitlement off
 *   action="delete"        - delete a user (cascades via FK)
 *
 * Caller must be authenticated AND have public.user_roles.role = 'admin'.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

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
    const action = String(body.action ?? "");

    if (action === "create") {
      const { email, password, full_name, grant_access } = body;
      if (!email || !password) return json({ error: "email and password required" }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: full_name ? { full_name: String(full_name) } : undefined,
      });
      if (error) return json({ error: error.message }, 400);
      if (grant_access && created.user) {
        await admin
          .from("entitlements")
          .upsert(
            { user_id: created.user.id, has_access: true, granted_by_admin: true },
            { onConflict: "user_id" },
          );
      }
      return json({ ok: true, user_id: created.user?.id });
    }

    if (action === "reset_password") {
      const { email, redirect_to } = body;
      if (!email) return json({ error: "email required" }, 400);
      const { error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: String(email),
        options: redirect_to ? { redirectTo: String(redirect_to) } : undefined,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "grant_access" || action === "revoke_access") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const grant = action === "grant_access";
      const { error } = await admin
        .from("entitlements")
        .upsert(
          { user_id, has_access: grant, granted_by_admin: grant },
          { onConflict: "user_id" },
        );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (user_id === userData.user.id) return json({ error: "Refusing to delete yourself" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});