import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude } from "../_shared/anthropic.ts";

// Generates an on-demand critique of the user's last 7 days of trades +
// journal entries — "you lose 68% of trades taken after 2pm" style
// analysis. Stored in coach_reports so past reports stay visible.
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

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 86400_000);

    const [{ data: trades }, { data: journal }] = await Promise.all([
      supabase.from("trades").select("pair, direction, entry_price, exit_price, size, pnl, opened_at, closed_at, setup, tags, checklist")
        .eq("user_id", userId).gte("opened_at", periodStart.toISOString()).order("opened_at"),
      supabase.from("journal_entries").select("entry_date, mood, market_notes, lessons, sleep_hours")
        .eq("user_id", userId).gte("entry_date", periodStart.toISOString().slice(0, 10)),
    ]);

    if (!trades || trades.length === 0) {
      return json({ error: "No trades in the last 7 days to review." }, 400);
    }

    const summary = trades.map((t: any) =>
      `${t.opened_at.slice(0, 16)} ${t.pair} ${t.direction} size=${t.size} entry=${t.entry_price} exit=${t.exit_price ?? "open"} pnl=${t.pnl ?? "n/a"} setup=${t.setup ?? "-"} tags=${(t.tags ?? []).join(",")}`
    ).join("\n");
    const journalSummary = (journal ?? []).map((j: any) => `${j.entry_date}: mood=${j.mood ?? "-"} sleep=${j.sleep_hours ?? "-"}h notes=${j.market_notes ?? "-"}`).join("\n");

    const content = await callClaude(
      "You are a blunt, data-driven trading coach reviewing a trader's last 7 days. Identify concrete, specific patterns (time-of-day, symbol, setup, size, mood/sleep correlation) backed by the numbers given — not generic advice. Call out the single biggest leak and one thing that's working. Keep it under 300 words, plain text, no markdown headers.",
      `Trades (${trades.length}):\n${summary}\n\nJournal entries:\n${journalSummary || "(none logged)"}`,
      600,
    );

    const { data: saved, error } = await supabase.from("coach_reports").insert({
      user_id: userId,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      content,
    }).select().single();
    if (error) return json({ error: error.message }, 500);

    return json({ report: saved });
  } catch (e) {
    console.error("weekly-coach-report error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
