import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import chapters from "./chapters.json" with { type: "json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const isAdmin = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin.data) return json({ error: "Admin only" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const replace = body.replace === true;

    if (replace) {
      await admin.from("quizzes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("book_chapters").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const rows = (chapters as any[]).map((c) => ({
      chapter_number: c.chapter_number,
      title: c.title,
      subtitle: c.subtitle ?? "",
      content: c.content,
      estimated_minutes: c.estimated_minutes ?? 5,
      order_index: c.order_index ?? c.chapter_number,
      published: true,
    }));

    const { error } = await admin.from("book_chapters").upsert(rows, { onConflict: "chapter_number" });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, inserted: rows.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}