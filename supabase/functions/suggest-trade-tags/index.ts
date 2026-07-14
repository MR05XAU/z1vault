import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude } from "../_shared/anthropic.ts";

// Classifies a trade's setup from its notes into a small, consistent
// vocabulary (ORB, VWAP reclaim, breakout, reversal, trend pullback, etc.)
// so tags stay comparable across trades instead of free-text drift.
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
    const notes = String(body.notes ?? "").slice(0, 2000);
    const setup = String(body.setup ?? "");
    const pair = String(body.pair ?? "");
    const direction = String(body.direction ?? "");
    if (!notes && !setup) return json({ error: "notes or setup required" }, 400);

    const text = await callClaude(
      "Classify a trade's setup from its notes into 1-3 short tags from common trading vocabulary (e.g. ORB, VWAP reclaim, breakout, reversal, trend pullback, gap-fill, range-fade, news-driven, momentum). Respond with ONLY a comma-separated list of tags, lowercase, no explanation, no punctuation besides the commas.",
      `Symbol: ${pair} ${direction}\nSetup field: ${setup || "(blank)"}\nNotes: ${notes || "(blank)"}`,
      100,
    );
    const tags = text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 3);
    return json({ tags });
  } catch (e) {
    console.error("suggest-trade-tags error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
