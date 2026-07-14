// A trade is treated as a likely duplicate of another when pair/direction/
// size/entry_price/exit_price match and both open and close times fall in
// the same minute — loose enough to catch re-imported CSVs (which often
// round/reformat timestamps slightly differently) without false-matching
// two genuinely different trades. Exit price and close time are load-
// bearing here: scaled-out futures trades routinely share one entry fill
// across several separate exit fills (same symbol/direction/size/entry/
// entry-time, different exit and P&L) — those are distinct trades, not
// duplicates, and matching on entry alone flagged them as dupes.
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function dupeKey(t: {
  pair: string; direction: string; entry_price: number; size: number; opened_at: string;
  exit_price?: number | null; closed_at?: string | null;
}): string {
  const openedMinute = t.opened_at.slice(0, 16); // YYYY-MM-DDTHH:mm
  const closedMinute = t.closed_at ? t.closed_at.slice(0, 16) : "open";
  const exit = t.exit_price != null ? round(t.exit_price) : "open";
  return `${t.pair.toUpperCase()}|${t.direction}|${round(t.entry_price)}|${round(t.size)}|${openedMinute}|${exit}|${closedMinute}`;
}

export function findDuplicateGroups<T extends {
  pair: string; direction: string; entry_price: number; size: number; opened_at: string;
  exit_price?: number | null; closed_at?: string | null;
}>(trades: T[]): T[][] {
  const map = new Map<string, T[]>();
  for (const t of trades) {
    const key = dupeKey(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.values()).filter((g) => g.length > 1);
}
