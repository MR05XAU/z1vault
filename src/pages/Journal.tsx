import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Trash2, TrendingUp, TrendingDown, Calendar as CalendarIcon, List, Calculator, Tag, BarChart3, Loader2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { parseTradesCsv } from "@/lib/csvImport";

type Trade = {
  id: string; pair: string; direction: "long" | "short";
  entry_price: number; exit_price: number | null; size: number;
  pnl: number | null; fees: number | null;
  strategy_id: string | null; notes: string | null;
  opened_at: string; closed_at: string | null;
};
type Strategy = { id: string; name: string; color: string };

const sb = supabase as any;

export default function Journal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"list" | "calendar" | "stats">("list");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [sheet, setSheet] = useState<null | "new" | "strats">(null);
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "open">("all");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    if (!user) return;
    const [t, s] = await Promise.all([
      sb.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
      sb.from("strategies").select("*").eq("user_id", user.id).order("name"),
    ]);
    setTrades(t.data ?? []);
    setStrats(s.data ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [user]);

  const importCsvFile = async (file: File) => {
    if (!user) return;
    const text = await file.text();
    const { trades: parsed, errors } = parseTradesCsv(text);

    if (parsed.length === 0) {
      toast.error(errors[0] ?? "No valid rows found in that file.");
      return;
    }
    const proceed = confirm(
      `Import ${parsed.length} trade${parsed.length === 1 ? "" : "s"}?` +
      (errors.length ? `\n${errors.length} row(s) skipped due to errors.` : "")
    );
    if (!proceed) return;

    setImporting(true);
    try {
      // Resolve strategy names to ids, creating any new tags found in the file.
      const stratByName = new Map(strats.map((s) => [s.name.toLowerCase(), s.id]));
      const newNames = Array.from(
        new Set(parsed.map((t) => t.strategy?.trim()).filter((n): n is string => !!n && !stratByName.has(n.toLowerCase())))
      );
      if (newNames.length) {
        const palette = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];
        const { data: created, error: stratErr } = await sb
          .from("strategies")
          .insert(newNames.map((name, i) => ({ user_id: user.id, name, color: palette[i % palette.length] })))
          .select();
        if (stratErr) throw stratErr;
        (created ?? []).forEach((s: Strategy) => stratByName.set(s.name.toLowerCase(), s.id));
      }

      const payload = parsed.map((t) => {
        const pnl = t.exit_price != null
          ? (t.exit_price - t.entry_price) * t.size * (t.direction === "long" ? 1 : -1) - t.fees
          : null;
        return {
          user_id: user.id,
          pair: t.pair,
          direction: t.direction,
          entry_price: t.entry_price,
          exit_price: t.exit_price,
          size: t.size,
          fees: t.fees,
          pnl,
          strategy_id: t.strategy ? stratByName.get(t.strategy.toLowerCase()) ?? null : null,
          notes: t.notes,
          opened_at: t.opened_at,
          closed_at: t.closed_at,
        };
      });

      const { error } = await sb.from("trades").insert(payload);
      if (error) throw error;
      toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}.`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => trades.filter((t) => {
    if (filter === "open") return t.closed_at == null;
    if (filter === "win") return (t.pnl ?? 0) > 0;
    if (filter === "loss") return (t.pnl ?? 0) < 0;
    return true;
  }), [trades, filter]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.closed_at && t.pnl != null);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
    return { closed: closed.length, wins: wins.length, losses: losses.length, totalPnl, winRate, avgWin, avgLoss };
  }, [trades]);

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Journal</div>
              <h1 className="display text-3xl font-medium mt-1">Trade log.</h1>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importCsvFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="size-10 grid place-items-center rounded-xl glass press disabled:opacity-50"
                title="Import CSV"
              >
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              </button>
              <button
                onClick={() => {
                  if (!trades.length) { toast.info("No trades to export"); return; }
                  const stratMap = new Map(strats.map((s) => [s.id, s.name]));
                  const head = ["pair","direction","entry_price","exit_price","size","pnl","fees","strategy","opened_at","closed_at","notes"];
                  const esc = (v: any) => {
                    if (v == null) return "";
                    const s = String(v).replace(/"/g, '""');
                    return /[",\n]/.test(s) ? `"${s}"` : s;
                  };
                  const rows = trades.map((t) => [t.pair,t.direction,t.entry_price,t.exit_price,t.size,t.pnl,t.fees,stratMap.get(t.strategy_id ?? "") ?? "",t.opened_at,t.closed_at,t.notes].map(esc).join(","));
                  const csv = [head.join(","), ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `trades-${new Date().toISOString().slice(0,10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="size-10 grid place-items-center rounded-xl glass press"
                title="Export CSV"
              >
                <Download className="size-4" />
              </button>
              <button onClick={() => nav("/calculators")} className="size-10 grid place-items-center rounded-xl glass press" title="Calculators">
                <Calculator className="size-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic mt-1">Educational record-keeping. Not financial advice.</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat label="Net PnL" value={fmtMoney(stats.totalPnl)} tone={stats.totalPnl >= 0 ? "good" : "bad"} />
            <Stat label="Win rate" value={`${stats.winRate.toFixed(0)}%`} />
            <Stat label="Trades" value={`${stats.closed}`} />
          </div>

          <div className="mt-4 flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
            <TabBtn active={tab === "list"} onClick={() => setTab("list")} icon={List}>List</TabBtn>
            <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")} icon={CalendarIcon}>Calendar</TabBtn>
            <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={BarChart3}>Stats</TabBtn>
          </div>
        </header>
      }
    >
      <div className="px-5 mt-4 pb-nav">
        {loading ? <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
         : tab === "list" ? (
          <>
            <div className="flex gap-2 mb-3 overflow-x-auto -mx-1 px-1">
              {(["all", "open", "win", "loss"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[11px] px-3 py-1.5 rounded-full press capitalize whitespace-nowrap ${filter === f ? "bg-gold text-gold-foreground" : "glass text-muted-foreground"}`}>{f}</button>
              ))}
              <button onClick={() => setSheet("strats")} className="text-[11px] px-3 py-1.5 rounded-full glass text-muted-foreground press whitespace-nowrap ml-auto flex items-center gap-1">
                <Tag className="size-3" /> Tags
              </button>
            </div>
            {filtered.length === 0 ? (
              <EmptyState onAdd={() => setSheet("new")} />
            ) : (
              <div className="space-y-2">
                {filtered.map((t) => <TradeRow key={t.id} t={t} strats={strats} onChange={refresh} />)}
              </div>
            )}
          </>
        ) : tab === "calendar" ? (
          <PnlCalendar trades={trades} />
        ) : (
          <StatsPanel stats={stats} trades={trades} strats={strats} />
        )}
      </div>

      <button onClick={() => setSheet("new")}
        className="fixed bottom-24 right-5 size-14 rounded-full gold-fill grid place-items-center shadow-glow press z-20">
        <Plus className="size-5" />
      </button>

      <Sheet open={sheet === "new"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader><SheetTitle className="display gold-text">New trade</SheetTitle></SheetHeader>
          <TradeForm strats={strats} onSaved={() => { setSheet(null); refresh(); }} />
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "strats"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl">
          <SheetHeader><SheetTitle className="display gold-text">Strategy tags</SheetTitle></SheetHeader>
          <StrategiesEditor strats={strats} onChange={refresh} />
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

/* ---------- Subcomponents ---------- */

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick} className={`flex-1 text-xs font-medium py-2 rounded-lg press flex items-center justify-center gap-1.5 ${active ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
      <Icon className="size-3" />{children}
    </button>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="glass rounded-xl px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`text-base font-medium mt-0.5 ${tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}
function fmtMoney(n: number) {
  const s = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}$${s}`;
}

function TradeRow({ t, strats, onChange }: { t: Trade; strats: Strategy[]; onChange: () => void }) {
  const strat = strats.find((s) => s.id === t.strategy_id);
  const win = (t.pnl ?? 0) > 0;
  const open = !t.closed_at;
  const del = async () => {
    if (!confirm("Delete this trade?")) return;
    const { error } = await sb.from("trades").delete().eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3">
      <div className={`size-10 rounded-xl grid place-items-center ${open ? "bg-secondary" : win ? "bg-success/20" : "bg-danger/20"}`}>
        {open ? <div className="size-2 rounded-full bg-gold animate-pulse" />
              : win ? <TrendingUp className="size-4 text-success" />
              : <TrendingDown className="size-4 text-danger" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex items-center gap-2">
          {t.pair} <span className="text-[10px] uppercase text-muted-foreground">{t.direction}</span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 truncate">
          {new Date(t.opened_at).toLocaleDateString()}
          {strat && <span className="px-1.5 py-px rounded text-[10px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
        </div>
      </div>
      <div className={`text-sm font-medium ${open ? "text-muted-foreground" : win ? "text-success" : "text-danger"}`}>
        {open ? "Open" : fmtMoney(t.pnl ?? 0)}
      </div>
      <button onClick={del} className="size-7 grid place-items-center rounded-lg press text-muted-foreground hover:text-danger">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="size-16 rounded-2xl gold-fill grid place-items-center mx-auto mb-4 shadow-glow">
        <LineIcon />
      </div>
      <h3 className="display text-xl font-medium">Log your first trade.</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Consistent journalling beats clever ideas. Track every entry, exit, and reason.</p>
      <Button onClick={onAdd} className="mt-5 gold-fill h-11 px-5 rounded-xl"><Plus className="size-4 mr-1" />New trade</Button>
    </div>
  );
}
function LineIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /></svg>; }

function TradeForm({ strats, onSaved }: { strats: Strategy[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<any>({
    pair: "", direction: "long", entry_price: "", exit_price: "", size: "",
    fees: "0", strategy_id: "", notes: "",
    opened_at: new Date().toISOString().slice(0, 16),
    closed_at: "",
  });
  const [saving, setSaving] = useState(false);

  const pnlPreview = useMemo(() => {
    const e = Number(v.entry_price), x = Number(v.exit_price), s = Number(v.size), f = Number(v.fees) || 0;
    if (!e || !x || !s) return null;
    const raw = (x - e) * s * (v.direction === "long" ? 1 : -1);
    return raw - f;
  }, [v]);

  const save = async () => {
    if (!user) return;
    if (!v.pair.trim() || !v.entry_price || !v.size) { toast.error("Pair, entry, and size are required."); return; }
    setSaving(true);
    const payload: any = {
      user_id: user.id,
      pair: v.pair.trim().toUpperCase(),
      direction: v.direction,
      entry_price: Number(v.entry_price),
      exit_price: v.exit_price ? Number(v.exit_price) : null,
      size: Number(v.size),
      fees: Number(v.fees) || 0,
      pnl: pnlPreview,
      strategy_id: v.strategy_id || null,
      notes: v.notes || null,
      opened_at: new Date(v.opened_at).toISOString(),
      closed_at: v.closed_at ? new Date(v.closed_at).toISOString() : (v.exit_price ? new Date().toISOString() : null),
    };
    const { error } = await sb.from("trades").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Trade saved."); onSaved(); }
  };

  return (
    <div className="space-y-3 mt-3 pb-6">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Pair"><Input placeholder="BTCUSD" value={v.pair} onChange={(e) => setV({ ...v, pair: e.target.value })} /></Labeled>
        <Labeled label="Direction">
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
            {["long", "short"].map((d) => (
              <button key={d} type="button" onClick={() => setV({ ...v, direction: d })}
                className={`flex-1 py-1.5 text-xs rounded-md press capitalize ${v.direction === d ? (d === "long" ? "bg-success text-white" : "bg-danger text-white") : ""}`}>{d}</button>
            ))}
          </div>
        </Labeled>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Labeled label="Entry"><Input type="number" step="any" value={v.entry_price} onChange={(e) => setV({ ...v, entry_price: e.target.value })} /></Labeled>
        <Labeled label="Exit"><Input type="number" step="any" value={v.exit_price} onChange={(e) => setV({ ...v, exit_price: e.target.value })} /></Labeled>
        <Labeled label="Size"><Input type="number" step="any" value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Fees"><Input type="number" step="any" value={v.fees} onChange={(e) => setV({ ...v, fees: e.target.value })} /></Labeled>
        <Labeled label="Strategy">
          <select value={v.strategy_id} onChange={(e) => setV({ ...v, strategy_id: e.target.value })}
            className="w-full bg-surface-elevated border border-border-strong rounded-md px-2 h-10 text-sm">
            <option value="">— None —</option>
            {strats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Opened"><Input type="datetime-local" value={v.opened_at} onChange={(e) => setV({ ...v, opened_at: e.target.value })} /></Labeled>
        <Labeled label="Closed (optional)"><Input type="datetime-local" value={v.closed_at} onChange={(e) => setV({ ...v, closed_at: e.target.value })} /></Labeled>
      </div>
      <Labeled label="Notes"><Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Setup, reason, mistakes…" /></Labeled>
      {pnlPreview !== null && (
        <div className="glass rounded-xl px-3 py-2 text-xs flex justify-between">
          <span className="text-muted-foreground">Estimated PnL</span>
          <span className={pnlPreview >= 0 ? "text-success font-medium" : "text-danger font-medium"}>{fmtMoney(pnlPreview)}</span>
        </div>
      )}
      <Button onClick={save} disabled={saving} className="w-full gold-fill h-12 rounded-xl">
        {saving && <Loader2 className="size-4 animate-spin mr-2" />}Save trade
      </Button>
    </div>
  );
}
function Labeled({ label, children }: any) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function StrategiesEditor({ strats, onChange }: { strats: Strategy[]; onChange: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const add = async () => {
    if (!user || !name.trim()) return;
    const { error } = await sb.from("strategies").insert({ user_id: user.id, name: name.trim(), color });
    if (error) toast.error(error.message); else { setName(""); onChange(); }
  };
  const del = async (id: string) => {
    const { error } = await sb.from("strategies").delete().eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };
  return (
    <div className="space-y-3 mt-3 pb-6">
      <div className="flex gap-2">
        <Input placeholder="e.g. Breakout" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded-lg bg-transparent" />
        <Button onClick={add} className="gold-fill rounded-xl">Add</Button>
      </div>
      <div className="space-y-1.5">
        {strats.map((s) => (
          <div key={s.id} className="glass rounded-xl p-2 flex items-center gap-2">
            <div className="size-4 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-sm">{s.name}</span>
            <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-danger press"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {strats.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No tags yet.</div>}
      </div>
    </div>
  );
}

/* ---------- Calendar ---------- */
function PnlCalendar({ trades }: { trades: Trade[] }) {
  const [view, setView] = useState<"month" | "week" | "year">("month");
  const [cursor, setCursor] = useState(new Date());

  const byDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of trades) {
      if (t.pnl == null) continue;
      const d = new Date(t.closed_at ?? t.opened_at);
      const key = d.toISOString().slice(0, 10);
      m[key] = (m[key] ?? 0) + (t.pnl ?? 0);
    }
    return m;
  }, [trades]);

  const maxAbs = Math.max(1, ...Object.values(byDay).map((v) => Math.abs(v)));

  return (
    <div>
      <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1 mb-3">
        {(["week", "month", "year"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`flex-1 text-xs py-1.5 rounded-lg press capitalize ${view === v ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>{v}</button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shift(cursor, view, -1, setCursor)} className="size-8 grid place-items-center rounded-lg glass press">‹</button>
        <div className="text-sm font-medium">{formatHeader(cursor, view)}</div>
        <button onClick={() => shift(cursor, view, 1, setCursor)} className="size-8 grid place-items-center rounded-lg glass press">›</button>
      </div>
      {view === "year" ? <YearGrid cursor={cursor} byDay={byDay} maxAbs={maxAbs} />
        : view === "week" ? <WeekStrip cursor={cursor} byDay={byDay} maxAbs={maxAbs} />
        : <MonthGrid cursor={cursor} byDay={byDay} maxAbs={maxAbs} />}
    </div>
  );
}
function shift(cursor: Date, view: string, dir: number, set: (d: Date) => void) {
  const d = new Date(cursor);
  if (view === "year") d.setFullYear(d.getFullYear() + dir);
  else if (view === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  set(d);
}
function formatHeader(d: Date, v: string) {
  if (v === "year") return d.getFullYear();
  if (v === "week") { const s = startOfWeek(d); const e = new Date(s); e.setDate(e.getDate() + 6); return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`; }
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function startOfWeek(d: Date) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x; }
function cellColor(v: number | undefined, max: number) {
  if (!v) return "bg-surface-elevated/60";
  const intensity = Math.min(1, Math.abs(v) / max);
  const alpha = 0.25 + intensity * 0.65;
  return v > 0 ? `bg-[hsl(var(--success-h,142_70%_45%)/${alpha})]` : `bg-[hsl(var(--danger-h,0_70%_55%)/${alpha})]`;
}
function MonthGrid({ cursor, byDay, maxAbs }: any) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: ({ key: string; pnl: number | undefined; day: number } | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ key, pnl: byDay[key], day: d });
  }
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground text-center mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => c ? (
          <div key={c.key} className={`aspect-square rounded-lg p-1.5 ${c.pnl ? (c.pnl > 0 ? "bg-success/30" : "bg-danger/30") : "bg-surface-elevated/60"}`}>
            <div className="text-[10px] text-muted-foreground">{c.day}</div>
            {c.pnl != null && <div className={`text-[10px] font-medium leading-tight mt-0.5 ${c.pnl > 0 ? "text-success" : "text-danger"}`}>{c.pnl > 0 ? "+" : ""}{c.pnl.toFixed(0)}</div>}
          </div>
        ) : <div key={`e${i}`} />)}
      </div>
    </div>
  );
}
function WeekStrip({ cursor, byDay }: any) {
  const start = startOfWeek(cursor);
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start); d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const pnl = byDay[key];
        return (
          <div key={key} className={`rounded-xl p-2 min-h-[80px] ${pnl ? (pnl > 0 ? "bg-success/25" : "bg-danger/25") : "bg-surface-elevated/60"}`}>
            <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="text-xs font-medium">{d.getDate()}</div>
            {pnl != null && <div className={`text-[11px] font-medium mt-1 ${pnl > 0 ? "text-success" : "text-danger"}`}>{fmtMoney(pnl)}</div>}
          </div>
        );
      })}
    </div>
  );
}
function YearGrid({ cursor, byDay }: any) {
  const year = cursor.getFullYear();
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 12 }, (_, m) => {
        const days = new Date(year, m + 1, 0).getDate();
        const totals = Array.from({ length: days }, (_, d) => byDay[`${year}-${String(m+1).padStart(2,"0")}-${String(d+1).padStart(2,"0")}`] ?? 0);
        const monthSum = totals.reduce((s, v) => s + v, 0);
        return (
          <div key={m} className="glass rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground">{new Date(year, m, 1).toLocaleDateString(undefined, { month: "short" })}</div>
            <div className={`text-xs font-medium ${monthSum > 0 ? "text-success" : monthSum < 0 ? "text-danger" : "text-muted-foreground"}`}>{monthSum ? fmtMoney(monthSum) : "—"}</div>
            <div className="grid grid-cols-7 gap-px mt-1">
              {totals.map((v, i) => (
                <div key={i} className={`aspect-square rounded-sm ${v > 0 ? "bg-success/60" : v < 0 ? "bg-danger/60" : "bg-surface-elevated"}`} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsPanel({ stats, trades, strats }: any) {
  const byStrat = useMemo(() => {
    const m: Record<string, { name: string; color: string; pnl: number; count: number; wins: number }> = {};
    for (const t of trades as Trade[]) {
      if (t.pnl == null) continue;
      const key = t.strategy_id ?? "_none";
      const s = strats.find((x: Strategy) => x.id === t.strategy_id);
      if (!m[key]) m[key] = { name: s?.name ?? "Untagged", color: s?.color ?? "#888", pnl: 0, count: 0, wins: 0 };
      m[key].pnl += t.pnl;
      m[key].count += 1;
      if (t.pnl > 0) m[key].wins += 1;
    }
    return Object.values(m);
  }, [trades, strats]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Wins" value={`${stats.wins}`} tone="good" />
        <Stat label="Losses" value={`${stats.losses}`} tone="bad" />
        <Stat label="Avg win" value={fmtMoney(stats.avgWin)} tone="good" />
        <Stat label="Avg loss" value={`-${fmtMoney(stats.avgLoss)}`} tone="bad" />
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold-bright mb-2">By strategy</div>
        {byStrat.length === 0 ? <div className="text-xs text-muted-foreground">No closed trades yet.</div> : (
          <div className="space-y-2">
            {byStrat.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="size-3 rounded-full" style={{ background: s.color }} />
                <div className="flex-1 text-sm">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.count} · {((s.wins / s.count) * 100).toFixed(0)}%</div>
                <div className={`text-sm font-medium ${s.pnl >= 0 ? "text-success" : "text-danger"}`}>{fmtMoney(s.pnl)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}