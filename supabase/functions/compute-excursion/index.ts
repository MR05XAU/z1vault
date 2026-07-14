import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toYahooSymbol } from "../_shared/yahooSymbol.ts";

// Computes MFE (max favorable excursion) and MAE (max adverse excursion) for
// a closed trade — the best and worst price the position touched between
// entry and exit — from Yahoo Finance candles. Cached on the trade row since
// it costs a Yahoo round-trip; call again to force a refresh.
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
    const tradeId = String(body.tradeId ?? "");
    if (!tradeId) return json({ error: "tradeId is required" }, 400);

    const { data: trade, error: tErr } = await supabase
      .from("trades")
      .select("id, pair, direction, entry_price, opened_at, closed_at")
      .eq("id", tradeId)
      .single();
    if (tErr || !trade) return json({ error: "Trade not found" }, 404);
    if (!trade.closed_at) return json({ error: "Trade is still open" }, 400);

    const fromMs = new Date(trade.opened_at).getTime();
    const toMs = new Date(trade.closed_at).getTime();
    const yahooSymbol = toYahooSymbol(String(trade.pair).toUpperCase());
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${Math.floor(fromMs / 1000)}&period2=${Math.floor(toMs / 1000) + 60}&interval=1m&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return json({ error: `Yahoo returned ${res.status}` }, 502);
    const data = await res.json();
    const err = data?.chart?.error?.description;
    if (err) return json({ error: err }, 502);
    const r = data?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const q = r?.indicators?.quote?.[0];
    if (!q || !ts.length) return json({ error: "No candle data for this window" }, 502);

    let high = -Infinity;
    let low = Infinity;
    for (let i = 0; i < ts.length; i++) {
      const h = q.high?.[i], l = q.low?.[i];
      if (h != null && h > high) high = h;
      if (l != null && l < low) low = l;
    }
    if (!Number.isFinite(high) || !Number.isFinite(low)) return json({ error: "No usable candle data" }, 502);

    const entry = Number(trade.entry_price);
    const isLong = trade.direction === "long";
    // Favorable = the best price seen in the trade's favor; adverse = the worst.
    const mfePrice = isLong ? high : low;
    const maePrice = isLong ? low : high;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: uErr } = await admin
      .from("trades")
      .update({ mfe_price: mfePrice, mae_price: maePrice, excursion_computed_at: new Date().toISOString() })
      .eq("id", tradeId)
      .eq("user_id", u.user.id);
    if (uErr) return json({ error: uErr.message }, 500);

    return json({ ok: true, mfe_price: mfePrice, mae_price: maePrice, entry_price: entry });
  } catch (e) {
    console.error("compute-excursion error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
