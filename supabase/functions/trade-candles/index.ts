import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

const INTERVALS = ["1m", "5m", "15m", "60m", "1d"];

// Fetches OHLC candles from Yahoo Finance's public chart endpoint (no API key).
// Used to render the price-action window around a logged trade.
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
    const symbol = String(body.symbol ?? "").trim().toUpperCase().slice(0, 20);
    const from = String(body.from ?? "");
    const to = String(body.to ?? from);
    const interval = INTERVALS.includes(body.interval) ? body.interval : "5m";
    if (!symbol || !from) return json({ error: "symbol and from are required" }, 400);

    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return json({ error: "Invalid date" }, 400);

    // Pad the window so entry/exit sit inside the chart, not at the edge.
    const span = Math.max(toMs - fromMs, 60 * 60 * 1000);
    const pad = Math.max(span * 0.4, 30 * 60 * 1000);
    const period1 = Math.floor((fromMs - pad) / 1000);
    const period2 = Math.floor((toMs + pad) / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return json({ candles: [], error: `Yahoo returned ${res.status}` });

    const data = await res.json();
    const err = data?.chart?.error?.description;
    if (err) return json({ candles: [], error: err });
    const r = data?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const q = r?.indicators?.quote?.[0];
    if (!q || !ts.length) return json({ candles: [], error: "No data" });

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ t: ts[i] * 1000, o, h, l, c, v: v ?? 0 });
    }
    return json({ candles, error: null });
  } catch (e) {
    console.error("trade-candles error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
