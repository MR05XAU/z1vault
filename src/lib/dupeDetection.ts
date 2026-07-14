// A trade is treated as a likely duplicate of another when pair/direction/
// size/entry_price match and the open time falls in the same minute — loose
// enough to catch re-imported CSVs (which often round/reformat timestamps
// slightly differently) without false-matching two genuinely different
// trades placed back-to-back.
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function dupeKey(t: { pair: string; direction: string; entry_price: number; size: number; opened_at: string }): string {
  const minute = t.opened_at.slice(0, 16); // YYYY-MM-DDTHH:mm
  return `${t.pair.toUpperCase()}|${t.direction}|${round(t.entry_price)}|${round(t.size)}|${minute}`;
}

export function findDuplicateGroups<T extends { pair: string; direction: string; entry_price: number; size: number; opened_at: string }>(trades: T[]): T[][] {
  const map = new Map<string, T[]>();
  for (const t of trades) {
    const key = dupeKey(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.values()).filter((g) => g.length > 1);
}
