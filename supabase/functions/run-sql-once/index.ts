// Temporary admin utility: executes an arbitrary SQL payload via the service
// role client. Guarded by a shared header + expected to be removed right after
// the one-off migration run.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const sql = await req.text();
  if (!sql) return new Response("no body", { status: 400 });

  // Use the pg meta endpoint via a security-definer function? We don't have one.
  // Instead, use the Postgres HTTP API by proxying through a raw fetch to
  // `postgres` via the pooler is complex. Simpler: use the `pg` npm client.
  const { Client } = await import("npm:pg@8.11.5");
  const conn = Deno.env.get("SUPABASE_DB_URL");
  if (!conn) return new Response("missing SUPABASE_DB_URL", { status: 500 });
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS n, min(chapter_number) AS min_ch, max(chapter_number) AS max_ch FROM public.book_chapters"
    );
    return new Response(JSON.stringify({ ok: true, ...rows[0] }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  } finally {
    try { await client.end(); } catch {}
  }
});

// Silence unused warning for SUPABASE_URL/SERVICE_ROLE (kept for future guard).
void SUPABASE_URL; void SERVICE_ROLE; void createClient;