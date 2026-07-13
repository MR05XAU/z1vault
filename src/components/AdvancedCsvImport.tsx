import { useMemo, useState } from "react";
import { parseCsvRows, detectDelimiter, stripBom } from "@/lib/csvImport";
import { Button } from "@/components/ui/button";

type Field = "pair" | "direction" | "size" | "entry_price" | "exit_price" | "opened_at" | "closed_at" | "fees" | "setup" | "notes" | "ignore";

const FIELDS: { value: Field; label: string }[] = [
  { value: "ignore", label: "— Ignore —" },
  { value: "pair", label: "Pair *" },
  { value: "direction", label: "Direction (long/short/buy/sell) *" },
  { value: "size", label: "Size *" },
  { value: "entry_price", label: "Entry price *" },
  { value: "exit_price", label: "Exit price" },
  { value: "opened_at", label: "Opened date/time *" },
  { value: "closed_at", label: "Closed date/time" },
  { value: "fees", label: "Fees / commission" },
  { value: "setup", label: "Setup / strategy" },
  { value: "notes", label: "Notes" },
];

const ALIASES: Record<string, Field> = {
  pair: "pair", symbol: "pair", ticker: "pair", instrument: "pair", "underlying symbol": "pair",
  direction: "direction", side: "direction", action: "direction", "buy/sell": "direction", type: "direction",
  size: "size", qty: "size", quantity: "size", shares: "size", contracts: "size",
  "entry price": "entry_price", "buy price": "entry_price", buyprice: "entry_price", "avg price": "entry_price", price: "entry_price", "open price": "entry_price",
  "exit price": "exit_price", "sell price": "exit_price", sellprice: "exit_price", "close price": "exit_price",
  "opened at": "opened_at", "entry date": "opened_at", "entry time": "opened_at", "open date": "opened_at", opened: "opened_at", date: "opened_at", "trade date": "opened_at", time: "opened_at",
  boughttimestamp: "opened_at", "bought timestamp": "opened_at",
  "closed at": "closed_at", "exit date": "closed_at", "exit time": "closed_at", "close date": "closed_at", closed: "closed_at",
  soldtimestamp: "closed_at", "sold timestamp": "closed_at",
  pnl: "ignore", "p&l": "ignore", "p/l": "ignore",
  fees: "fees", commission: "fees", fee: "fees", commissions: "fees",
  setup: "setup", strategy: "setup",
  notes: "notes", comment: "notes", comments: "notes",
};

function guessField(header: string): Field {
  return ALIASES[header.trim().toLowerCase()] ?? "ignore";
}
function normalizeDirection(v: string): "long" | "short" | null {
  const s = v.trim().toLowerCase();
  if (["long", "buy", "b", "bought"].includes(s)) return "long";
  if (["short", "sell", "s", "sold"].includes(s)) return "short";
  return null;
}
function parseDate(v: string): string | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${yr}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T${(m[4] ?? "00").padStart(2, "0")}:${m[5] ?? "00"}:${m[6] ?? "00"}`;
    const d2 = new Date(iso);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}
function parseNum(v: string): number | null {
  if (v == null || v === "") return null;
  const str = String(v).trim();
  const neg = /^\(.*\)$/.test(str) || /^-/.test(str) || /^\$\(/.test(str);
  const n = Number(str.replace(/[$,\s()-]/g, ""));
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

type BuiltTrade = {
  pair?: string; direction?: "long" | "short"; size?: number;
  entry_price?: number; exit_price?: number | null;
  opened_at?: string; closed_at?: string | null;
  fees?: number; setup?: string; notes?: string;
};

function buildTrade(row: Record<string, string>, mapping: Record<string, Field>): BuiltTrade {
  const out: BuiltTrade = { fees: 0 };
  for (const [col, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const raw = row[col];
    if (raw == null || raw === "") continue;
    if (field === "direction") { const d = normalizeDirection(raw); if (d) out.direction = d; }
    else if (field === "opened_at" || field === "closed_at") { const d = parseDate(raw); if (d) out[field] = d; }
    else if (field === "size" || field === "entry_price" || field === "exit_price" || field === "fees") {
      const n = parseNum(raw);
      if (n != null) (out as any)[field] = Math.abs(n);
    } else (out as any)[field] = raw;
  }
  // Broker "bought/sold timestamp" style: infer direction from which came first.
  const bought = row["boughtTimestamp"] ? parseDate(row["boughtTimestamp"]) : null;
  const sold = row["soldTimestamp"] ? parseDate(row["soldTimestamp"]) : null;
  const bp = row["buyPrice"] ? parseNum(row["buyPrice"]) : null;
  const sp = row["sellPrice"] ? parseNum(row["sellPrice"]) : null;
  if (bought && sold) {
    const isLong = new Date(bought).getTime() <= new Date(sold).getTime();
    out.direction = isLong ? "long" : "short";
    out.opened_at = isLong ? bought : sold;
    out.closed_at = isLong ? sold : bought;
    if (bp != null && sp != null) {
      out.entry_price = Math.abs(isLong ? bp : sp);
      out.exit_price = Math.abs(isLong ? sp : bp);
    }
  }
  return out;
}

export function AdvancedCsvImport({ text, onImport, onCancel }: { text: string; onImport: (trades: BuiltTrade[]) => void; onCancel: () => void }) {
  const parsed = useMemo(() => {
    const clean = stripBom(text);
    const firstLine = clean.slice(0, clean.search(/\r?\n/) === -1 ? clean.length : clean.search(/\r?\n/));
    const rows = parseCsvRows(clean, detectDelimiter(firstLine));
    if (rows.length === 0) return { headers: [] as string[], records: [] as Record<string, string>[] };
    const headers = rows[0];
    const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
    return { headers, records };
  }, [text]);

  const [mapping, setMapping] = useState<Record<string, Field>>(() =>
    Object.fromEntries(parsed.headers.map((h) => [h, guessField(h)])),
  );

  const preview = useMemo(() => parsed.records.slice(0, 5).map((r) => buildTrade(r, mapping)), [parsed.records, mapping]);
  const missing = useMemo(() => {
    const first = parsed.records[0] ? buildTrade(parsed.records[0], mapping) : null;
    if (!first) return [] as string[];
    return (["pair", "direction", "size", "entry_price", "opened_at"] as const).filter((f) => first[f] == null);
  }, [parsed.records, mapping]);

  const doImport = () => {
    const built = parsed.records.map((r) => buildTrade(r, mapping))
      .filter((t): t is Required<Pick<BuiltTrade, "pair" | "direction" | "size" | "entry_price" | "opened_at">> & BuiltTrade =>
        !!t.pair && !!t.direction && !!t.size && !!t.entry_price && !!t.opened_at);
    onImport(built);
  };

  if (parsed.headers.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-8">Couldn't read any rows from that file.</div>;
  }

  return (
    <div className="space-y-4 mt-3 pb-6">
      <p className="text-xs text-muted-foreground">{parsed.records.length} rows detected. Map each column to a field — I guessed based on the header names.</p>

      {missing.length > 0 && (
        <div className="glass rounded-xl p-3 text-xs text-danger">
          Couldn't auto-detect: <span className="font-medium">{missing.join(", ")}</span>. Fix the mapping below.
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {parsed.headers.map((h) => (
          <div key={h} className="flex items-center gap-2">
            <div className="flex-1 text-xs truncate text-muted-foreground">{h}</div>
            <select
              value={mapping[h] ?? "ignore"}
              onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as Field })}
              className="bg-surface-elevated border border-border-strong rounded-md px-2 h-9 text-xs flex-1"
            >
              {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-1.5 text-left">Pair</th><th className="px-2 py-1.5 text-left">Dir</th><th className="px-2 py-1.5 text-left">Size</th><th className="px-2 py-1.5 text-left">Entry</th><th className="px-2 py-1.5 text-left">Opened</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((t, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-1.5">{t.pair ?? "—"}</td>
                <td className="px-2 py-1.5">{t.direction ?? "—"}</td>
                <td className="px-2 py-1.5">{t.size ?? "—"}</td>
                <td className="px-2 py-1.5">{t.entry_price ?? "—"}</td>
                <td className="px-2 py-1.5">{t.opened_at ? t.opened_at.slice(0, 16).replace("T", " ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1 h-11 rounded-xl">Cancel</Button>
        <Button onClick={doImport} disabled={missing.length > 0} className="flex-1 mint-fill h-11 rounded-xl">
          Import {parsed.records.length} trades
        </Button>
      </div>
    </div>
  );
}
