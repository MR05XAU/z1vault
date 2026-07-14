// Broker CSV exports and manual entries use raw CME/COMEX/NYMEX/CBOT contract
// codes (root + month code + year, e.g. GCQ6, MGCQ6, NQU6) — TradingView (and
// Yahoo Finance, separately, server-side in trade-candles) don't recognize
// those directly. TradingView wants an exchange-qualified continuous-contract
// ticker instead, e.g. "COMEX:GC1!". This maps one to the other; anything
// that doesn't look like a dated futures contract (stocks, crypto, already
// exchange-qualified symbols) passes through unchanged.

// Micro contracts track the same reference price as their full-size
// counterpart (different dollar multiplier only), so they share a chart.
const MICRO_TO_FULL_ROOT: Record<string, string> = {
  MGC: "GC", MES: "ES", MNQ: "NQ", MYM: "YM", M2K: "RTY", MCL: "CL", SIL: "SI",
};

const ROOT_EXCHANGE: Record<string, string> = {
  GC: "COMEX", SI: "COMEX", HG: "COMEX", PL: "NYMEX", PA: "NYMEX",
  CL: "NYMEX", NG: "NYMEX", RB: "NYMEX", HO: "NYMEX",
  ES: "CME_MINI", NQ: "CME_MINI", RTY: "CME_MINI",
  YM: "CBOT_MINI",
  ZB: "CBOT", ZN: "CBOT", ZF: "CBOT", ZT: "CBOT", ZC: "CBOT", ZS: "CBOT", ZW: "CBOT", ZM: "CBOT", ZL: "CBOT",
  "6E": "CME", "6B": "CME", "6J": "CME", "6A": "CME", "6C": "CME", "6S": "CME",
};

// CME month codes: F=Jan G=Feb H=Mar J=Apr K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
const FUTURES_CONTRACT = /^([A-Z0-9]+)([FGHJKMNQUVXZ])(\d{1,2})$/;

export function toTradingViewSymbol(raw: string): string {
  const sym = raw.trim().toUpperCase();
  if (sym.includes(":")) return sym; // already exchange-qualified
  const m = sym.match(FUTURES_CONTRACT);
  if (!m) return sym; // not a dated futures code — stock/crypto/etc, pass through
  const root = MICRO_TO_FULL_ROOT[m[1]] ?? m[1];
  const exchange = ROOT_EXCHANGE[root];
  if (!exchange) return sym; // unrecognized root — fall back rather than guess wrong
  return `${exchange}:${root}1!`; // "1!" = continuously-rolling front-month contract
}
