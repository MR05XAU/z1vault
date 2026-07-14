import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude } from "../_shared/anthropic.ts";

// Translates a natural-language query ("show me short NQ losses over 2R
// this month") into the same structured filter shape the Trades view
// already supports via URL params — the frontend applies it, no new
// filtering logic needed server-side.
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

    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? "").slice(0, 300);
    if (!query) return json({ error: "query required" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const text = await callClaude(
      `Translate a trader's natural-language search into a JSON filter object. Today's date is ${today}. ` +
      `Output ONLY valid JSON (no markdown fences, no explanation) matching this shape, omitting any key that doesn't apply: ` +
      `{"q": string (symbol or free-text search), "side": "long"|"short", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}. ` +
      `"this month" means from the 1st of the current month to today. "losses" or "losers" implies searching notes/setup text isn't reliable, so only set q to a symbol if one is explicitly named — do not invent a symbol.`,
      query,
      200,
    );
    let filter: Record<string, string> = {};
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
      filter = JSON.parse(cleaned);
    } catch {
      return json({ error: "Could not parse a filter from that query." }, 422);
    }
    return json({ filter });
  } catch (e) {
    console.error("nl-trade-filter error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
