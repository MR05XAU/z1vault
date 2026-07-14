// Broker CSV exports and manual entries use raw CME/COMEX/NYMEX/CBOT contract
// codes (root + month code + year, e.g. GCQ6, MGCQ6, NQU6). TradingView's free
// embed widget resolves the literal continuous-futures ticker (e.g.
// "COMEX:GC1!") fine, but then blocks it with "This symbol is only available
// on TradingView" — CME group data isn't licensed for free embeds. Yahoo
// Finance (separately, server-side in trade-candles) has no such restriction,
// so that translator still targets the real futures ticker.
//
// Here we instead map each futures root to a freely-embeddable proxy (spot
// FX/metals via OANDA, cash index via TVC) that tracks the same price action
// closely enough for a "what did the chart look like" visual. Anything that
// doesn't look like a dated futures contract (stocks, crypto, already
// exchange-qualified symbols) passes through unchanged.

// Micro contracts track the same reference price as their full-size
// counterpart (different dollar multiplier only), so they share a proxy.
const MICRO_TO_FULL_ROOT: Record<string, string> = {
  MGC: "GC", MES: "ES", MNQ: "NQ", MYM: "YM", M2K: "RTY", MCL: "CL", SIL: "SI",
};

// Only roots with a confident, same-direction free proxy are included —
// better to fall back to the raw (likely-unresolved) symbol than show an
// inverted or unrelated chart.
const ROOT_TO_FREE_SYMBOL: Record<string, string> = {
  GC: "OANDA:XAUUSD",
  SI: "OANDA:XAGUSD",
  PL: "OANDA:XPTUSD",
  PA: "OANDA:XPDUSD",
  CL: "TVC:USOIL",
  NG: "TVC:NATURALGAS",
  ES: "TVC:SPX",
  NQ: "TVC:NDX",
  RTY: "TVC:RUT",
  YM: "TVC:DJI",
  "6E": "OANDA:EURUSD",
  "6B": "OANDA:GBPUSD",
  "6A": "OANDA:AUDUSD",
};

// CME month codes: F=Jan G=Feb H=Mar J=Apr K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
const FUTURES_CONTRACT = /^([A-Z0-9]+)([FGHJKMNQUVXZ])(\d{1,2})$/;

export function toTradingViewSymbol(raw: string): string {
  const sym = raw.trim().toUpperCase();
  if (sym.includes(":")) return sym; // already exchange-qualified
  const m = sym.match(FUTURES_CONTRACT);
  if (!m) return sym; // not a dated futures code — stock/crypto/etc, pass through
  const root = MICRO_TO_FULL_ROOT[m[1]] ?? m[1];
  const proxy = ROOT_TO_FREE_SYMBOL[root];
  return proxy ?? sym; // unmapped root — fall back rather than hit the license wall
}
