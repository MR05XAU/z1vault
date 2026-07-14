// Micro contracts track the same reference price as their full-size
// counterpart (just a different dollar multiplier), so they share a chart.
const MICRO_TO_FULL_ROOT: Record<string, string> = {
  MGC: "GC", MES: "ES", MNQ: "NQ", MYM: "YM", M2K: "RTY", MCL: "CL", SIL: "SI",
};
// CME/COMEX/NYMEX/CBOT month codes: F=Jan G=Feb H=Mar J=Apr K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
const FUTURES_CONTRACT = /^([A-Z]+)([FGHJKMNQUVXZ])(\d{1,2})$/;

// Broker exports use raw CME contract codes (e.g. GCQ6, MGCQ6, NQU6) that
// Yahoo Finance's chart API doesn't recognize — it only serves continuous
// front-month futures under a "ROOT=F" ticker (GC=F, NQ=F, ...). Translate
// dated contract codes to their continuous-ticker equivalent before
// querying; anything that doesn't look like a futures contract code
// (stocks, crypto pairs, already-suffixed tickers) passes through as-is.
export function toYahooSymbol(raw: string): string {
  if (raw.includes("=F") || raw.includes("-") || raw.includes(".")) return raw;
  const m = raw.match(FUTURES_CONTRACT);
  if (!m) return raw;
  const root = MICRO_TO_FULL_ROOT[m[1]] ?? m[1];
  return `${root}=F`;
}
