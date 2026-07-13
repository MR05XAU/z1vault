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
import { Plus, Trash2, TrendingUp, TrendingDown, Calendar as CalendarIcon, List, Calculator, Tag, BarChart3, Loader2, Download, Upload, BookOpen, Link2, LineChart as LineChartIcon, ChevronRight, Table as TableIcon } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { parseTradesCsv } from "@/lib/csvImport";
import { TradeSnapshotChart } from "@/components/TradeSnapshotChart";
import { TradingViewChart } from "@/components/TradingViewChart";
import { BrokerConnections } from "@/components/BrokerConnections";
import { AdvancedCsvImport } from "@/components/AdvancedCsvImport";

type Trade = {
  id: string; pair: string; direction: "long" | "short";
  entry_price: number; exit_price: number | null; size: number;
  pnl: number | null; fees: number | null;
  strategy_id: string | null; notes: string | null;
  opened_at: string; closed_at: string | null;
  setup: string | null; tags: string[] | null;
  stop_loss: number | null; take_profit: number | null;
};
type Strategy = { id: string; name: string; color: string };

const sb = supabase as any;

export default function Journal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"list" | "calendar" | "days" | "stats" | "notes">("list");
  const [listView, setListView] = useState<"cards" | "table">("cards");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [sheet, setSheet] = useState<null | "new" | "strats" | "broker">(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "open">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ trades: ReturnType<typeof parseTradesCsv>["trades"]; errors: string[] } | null>(null);
  const [csvFallbackText, setCsvFallbackText] = useState<string | null>(null);
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
      setCsvFallbackText(text);
      return;
    }
    setPendingImport({ trades: parsed, errors });
  };

  const importAdvancedTrades = async (built: { pair?: string; direction?: "long" | "short"; size?: number; entry_price?: number; exit_price?: number | null; opened_at?: string; closed_at?: string | null; fees?: number; setup?: string; notes?: string }[]) => {
    if (!user) return;
    const payload = built.map((t) => {
      const fees = t.fees ?? 0;
      const pnl = t.exit_price != null && t.entry_price != null && t.size != null
        ? (t.exit_price - t.entry_price) * t.size * (t.direction === "long" ? 1 : -1) - fees
        : null;
      return {
        user_id: user.id,
        pair: (t.pair ?? "").toUpperCase(),
        direction: t.direction,
        entry_price: t.entry_price,
        exit_price: t.exit_price ?? null,
        size: t.size,
        fees,
        pnl,
        strategy_id: null,
        notes: t.notes ?? null,
        opened_at: t.opened_at,
        closed_at: t.closed_at ?? null,
        setup: t.setup ?? null,
        tags: [],
        stop_loss: null,
        take_profit: null,
      };
    });
    const { error } = await sb.from("trades").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}.`);
    setCsvFallbackText(null);
    refresh();
  };

  const confirmImport = async () => {
    if (!pendingImport || !user) return;
    const parsed = pendingImport.trades;
    setPendingImport(null);
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
        const pnl = t.pnl !== undefined ? t.pnl : t.exit_price != null
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
    if (filter === "open" && t.closed_at != null) return false;
    if (filter === "win" && !((t.pnl ?? 0) > 0)) return false;
    if (filter === "loss" && !((t.pnl ?? 0) < 0)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${t.pair} ${t.setup ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }), [trades, filter, search]);

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
              <div className="flex items-center gap-1.5">
                <span className="size-4 rounded-[5px] mint-fill grid place-items-center">
                  <TrendingUp className="size-2.5" strokeWidth={3} />
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">Edgebook</span>
              </div>
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
              <button onClick={() => setSheet("broker")} className="size-10 grid place-items-center rounded-xl glass press" title="Broker sync">
                <Link2 className="size-4" />
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
            <TabBtn active={tab === "list"} onClick={() => setTab("list")} icon={List}>Trades</TabBtn>
            <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")} icon={CalendarIcon}>Cal</TabBtn>
            <TabBtn active={tab === "days"} onClick={() => setTab("days")} icon={LineChartIcon}>Days</TabBtn>
            <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={BarChart3}>Stats</TabBtn>
            <TabBtn active={tab === "notes"} onClick={() => setTab("notes")} icon={BookOpen}>Notes</TabBtn>
          </div>
        </header>
      }
    >
      <div className="px-5 mt-4 pb-nav">
        {loading ? <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-mint" /></div>
         : tab === "list" ? (
          <>
            <div className="flex gap-2 mb-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pair, setup, tag…"
                className="h-10 bg-surface-elevated border-border-strong"
              />
              <button
                onClick={() => setListView((v) => (v === "cards" ? "table" : "cards"))}
                className="size-10 shrink-0 grid place-items-center rounded-xl glass press"
                title={listView === "cards" ? "Switch to table view" : "Switch to card view"}
              >
                {listView === "cards" ? <TableIcon className="size-4" /> : <List className="size-4" />}
              </button>
            </div>
            <div className="flex gap-2 mb-3 overflow-x-auto -mx-1 px-1">
              {(["all", "open", "win", "loss"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[11px] px-3 py-1.5 rounded-full press capitalize whitespace-nowrap ${filter === f ? "bg-mint text-mint-foreground" : "glass text-muted-foreground"}`}>{f}</button>
              ))}
              <button onClick={() => setSheet("strats")} className="text-[11px] px-3 py-1.5 rounded-full glass text-muted-foreground press whitespace-nowrap ml-auto flex items-center gap-1">
                <Tag className="size-3" /> Tags
              </button>
            </div>
            {filtered.length === 0 ? (
              <EmptyState onAdd={() => setSheet("new")} />
            ) : listView === "table" ? (
              <TradesTable trades={filtered} strats={strats} onChange={refresh} onOpenTrade={(t) => setDetailTrade(t)} />
            ) : (
              <div className="space-y-2">
                {filtered.map((t) => <TradeRow key={t.id} t={t} strats={strats} onChange={refresh} onOpen={() => setDetailTrade(t)} />)}
              </div>
            )}
          </>
        ) : tab === "calendar" ? (
          <PnlCalendar trades={trades} />
        ) : tab === "days" ? (
          <DailyBreakdown trades={trades} strats={strats} onChange={refresh} onOpenTrade={(t) => setDetailTrade(t)} />
        ) : tab === "stats" ? (
          <StatsPanel stats={stats} trades={trades} strats={strats} />
        ) : (
          <JournalNotes />
        )}
      </div>

      <button onClick={() => setSheet("new")}
        className="fixed bottom-24 right-5 size-14 rounded-full mint-fill grid place-items-center shadow-glow press z-20">
        <Plus className="size-5" />
      </button>

      <Sheet open={sheet === "new"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader><SheetTitle className="display mint-text">New trade</SheetTitle></SheetHeader>
          <TradeForm strats={strats} onSaved={() => { setSheet(null); refresh(); }} />
        </SheetContent>
      </Sheet>
      <Sheet open={detailTrade != null} onOpenChange={(o) => !o && setDetailTrade(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader><SheetTitle className="display mint-text">{detailTrade?.pair}</SheetTitle></SheetHeader>
          {detailTrade && (
            <TradeDetail
              trade={detailTrade}
              strats={strats}
              onChange={(updated) => { setDetailTrade(updated); refresh(); }}
              onClose={() => setDetailTrade(null)}
            />
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "strats"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl">
          <SheetHeader><SheetTitle className="display mint-text">Strategy tags</SheetTitle></SheetHeader>
          <StrategiesEditor strats={strats} onChange={refresh} />
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "broker"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader><SheetTitle className="display mint-text">Broker sync</SheetTitle></SheetHeader>
          <BrokerConnections />
        </SheetContent>
      </Sheet>
      <Sheet open={pendingImport != null} onOpenChange={(o) => !o && setPendingImport(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl">
          <SheetHeader><SheetTitle className="display mint-text">Import trades</SheetTitle></SheetHeader>
          {pendingImport && (
            <div className="space-y-4 mt-3 pb-6">
              <p className="text-sm">
                Import {pendingImport.trades.length} trade{pendingImport.trades.length === 1 ? "" : "s"}?
              </p>
              {pendingImport.errors.length > 0 && (
                <div className="glass rounded-xl p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                  <div className="text-danger font-medium">{pendingImport.errors.length} row(s) skipped:</div>
                  {pendingImport.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => setPendingImport(null)} variant="outline" className="flex-1 h-11 rounded-xl">Cancel</Button>
                <Button onClick={confirmImport} className="flex-1 mint-fill h-11 rounded-xl">Import</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={csvFallbackText != null} onOpenChange={(o) => !o && setCsvFallbackText(null)}>
        <SheetContent side="bottom" className="bg-surface-elevated border-border-strong rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader><SheetTitle className="display mint-text">Map CSV columns</SheetTitle></SheetHeader>
          {csvFallbackText && (
            <AdvancedCsvImport text={csvFallbackText} onImport={importAdvancedTrades} onCancel={() => setCsvFallbackText(null)} />
          )}
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}

/* ---------- Subcomponents ---------- */

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick} className={`flex-1 text-xs font-medium py-2 rounded-lg press flex items-center justify-center gap-1.5 ${active ? "bg-mint text-mint-foreground" : "text-muted-foreground"}`}>
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

function TradeRow({ t, strats, onChange, onOpen }: { t: Trade; strats: Strategy[]; onChange: () => void; onOpen: () => void }) {
  const strat = strats.find((s) => s.id === t.strategy_id);
  const win = (t.pnl ?? 0) > 0;
  const open = !t.closed_at;
  const del = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    const { error } = await sb.from("trades").delete().eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };
  return (
    <div onClick={onOpen} className="glass rounded-2xl p-3 flex items-center gap-3 press cursor-pointer">
      <div className={`size-10 rounded-xl grid place-items-center ${open ? "bg-secondary" : win ? "bg-success/20" : "bg-danger/20"}`}>
        {open ? <div className="size-2 rounded-full bg-mint animate-pulse" />
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
      <div className="size-16 rounded-2xl mint-fill grid place-items-center mx-auto mb-4 shadow-glow">
        <LineIcon />
      </div>
      <h3 className="display text-xl font-medium">Log your first trade.</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Consistent journalling beats clever ideas. Track every entry, exit, and reason.</p>
      <Button onClick={onAdd} className="mt-5 mint-fill h-11 px-5 rounded-xl"><Plus className="size-4 mr-1" />New trade</Button>
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
    setup: "", tags: "", stop_loss: "", take_profit: "",
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
      setup: v.setup || null,
      tags: v.tags ? v.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      stop_loss: v.stop_loss ? Number(v.stop_loss) : null,
      take_profit: v.take_profit ? Number(v.take_profit) : null,
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
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Stop loss"><Input type="number" step="any" value={v.stop_loss} onChange={(e) => setV({ ...v, stop_loss: e.target.value })} /></Labeled>
        <Labeled label="Take profit"><Input type="number" step="any" value={v.take_profit} onChange={(e) => setV({ ...v, take_profit: e.target.value })} /></Labeled>
      </div>
      <Labeled label="Setup"><Input value={v.setup} onChange={(e) => setV({ ...v, setup: e.target.value })} placeholder="Breakout, VWAP reclaim…" /></Labeled>
      <Labeled label="Tags (comma separated)"><Input value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} placeholder="momentum, gap-up" /></Labeled>
      <Labeled label="Notes"><Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Setup, reason, mistakes…" /></Labeled>
      {pnlPreview !== null && (
        <div className="glass rounded-xl px-3 py-2 text-xs flex justify-between">
          <span className="text-muted-foreground">Estimated PnL</span>
          <span className={pnlPreview >= 0 ? "text-success font-medium" : "text-danger font-medium"}>{fmtMoney(pnlPreview)}</span>
        </div>
      )}
      <Button onClick={save} disabled={saving} className="w-full mint-fill h-12 rounded-xl">
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

function TradeDetail({ trade, strats, onChange, onClose }: { trade: Trade; strats: Strategy[]; onChange: (t: Trade) => void; onClose: () => void }) {
  const strat = strats.find((s) => s.id === trade.strategy_id);
  const [setup, setSetup] = useState(trade.setup ?? "");
  const [tags, setTags] = useState((trade.tags ?? []).join(", "));
  const [stopLoss, setStopLoss] = useState(trade.stop_loss?.toString() ?? "");
  const [takeProfit, setTakeProfit] = useState(trade.take_profit?.toString() ?? "");
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [liveInterval, setLiveInterval] = useState<"1" | "5" | "15" | "60" | "240" | "D">("D");
  const win = (trade.pnl ?? 0) > 0;

  const save = async () => {
    setSaving(true);
    const payload = {
      setup: setup || null,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      stop_loss: stopLoss ? Number(stopLoss) : null,
      take_profit: takeProfit ? Number(takeProfit) : null,
      notes: notes || null,
    };
    const { data, error } = await sb.from("trades").update(payload).eq("id", trade.id).select().single();
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Trade updated."); onChange(data as Trade); }
  };

  return (
    <div className="space-y-4 mt-3 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
          <span>{trade.direction}</span>
          {strat && <span className="px-1.5 py-px rounded text-[10px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
        </div>
        <div className={`text-sm font-medium ${!trade.closed_at ? "text-muted-foreground" : win ? "text-success" : "text-danger"}`}>
          {!trade.closed_at ? "Open" : fmtMoney(trade.pnl ?? 0)}
        </div>
      </div>

      <TradeSnapshotChart
        symbol={trade.pair}
        direction={trade.direction}
        openedAt={trade.opened_at}
        closedAt={trade.closed_at}
        entryPrice={trade.entry_price}
        exitPrice={trade.exit_price}
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass rounded-xl p-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Entry</div>
          <div className="text-sm font-medium mt-0.5">{trade.entry_price}</div>
        </div>
        <div className="glass rounded-xl p-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Exit</div>
          <div className="text-sm font-medium mt-0.5">{trade.exit_price ?? "—"}</div>
        </div>
        <div className="glass rounded-xl p-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Size</div>
          <div className="text-sm font-medium mt-0.5">{trade.size}</div>
        </div>
      </div>

      <button onClick={() => setShowLive((s) => !s)} className="text-[11px] text-mint-bright press">
        {showLive ? "Hide live chart" : "Show live chart"}
      </button>
      {showLive && (
        <div className="space-y-2">
          <div className="flex gap-1 overflow-x-auto">
            {(["1", "5", "15", "60", "240", "D"] as const).map((i) => (
              <button key={i} onClick={() => setLiveInterval(i)}
                className={`text-[11px] px-2.5 py-1 rounded-full press whitespace-nowrap ${liveInterval === i ? "bg-mint text-mint-foreground" : "glass text-muted-foreground"}`}>
                {i === "D" ? "1D" : i === "60" ? "1h" : i === "240" ? "4h" : `${i}m`}
              </button>
            ))}
          </div>
          <TradingViewChart symbol={trade.pair} interval={liveInterval} height={360} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Stop loss"><Input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} /></Labeled>
        <Labeled label="Take profit"><Input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} /></Labeled>
      </div>
      <Labeled label="Setup"><Input value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="Breakout, VWAP reclaim…" /></Labeled>
      <Labeled label="Tags (comma separated)"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="momentum, gap-up" /></Labeled>
      <Labeled label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Labeled>

      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1 h-11 rounded-xl">Close</Button>
        <Button onClick={save} disabled={saving} className="flex-1 mint-fill h-11 rounded-xl">
          {saving && <Loader2 className="size-4 animate-spin mr-2" />}Save
        </Button>
      </div>
    </div>
  );
}

type JournalEntry = { id: string; entry_date: string; mood: string | null; market_notes: string | null; lessons: string | null };

function JournalNotes() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const { data } = await sb.from("journal_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [user]);

  const loadDate = (d: string, list: JournalEntry[] = entries) => {
    setDate(d);
    const e = list.find((x) => x.entry_date === d);
    setMood(e?.mood ?? ""); setNotes(e?.market_notes ?? ""); setLessons(e?.lessons ?? "");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await sb.from("journal_entries").upsert(
      { user_id: user.id, entry_date: date, mood: mood || null, market_notes: notes || null, lessons: lessons || null },
      { onConflict: "user_id,entry_date" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Journal saved."); refresh(); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-mint" /></div>;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 space-y-3">
        <Labeled label="Date"><Input type="date" value={date} onChange={(e) => loadDate(e.target.value)} /></Labeled>
        <Labeled label="Mood / conviction"><Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Focused · patient · aggressive · tilted…" /></Labeled>
        <Labeled label="Market notes"><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the market do today? Levels, catalysts, plan…" /></Labeled>
        <Labeled label="Lessons"><Textarea rows={4} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What worked, what didn't, what to change tomorrow." /></Labeled>
        <Button onClick={save} disabled={saving} className="w-full mint-fill h-11 rounded-xl">
          {saving && <Loader2 className="size-4 animate-spin mr-2" />}Save entry
        </Button>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">Recent</div>
        {entries.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No journal entries yet.</div>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 20).map((e) => (
              <button key={e.id} onClick={() => loadDate(e.entry_date)}
                className={`w-full text-left glass rounded-xl p-2.5 press ${date === e.entry_date ? "border border-mint" : ""}`}>
                <div className="text-sm font-medium">{new Date(e.entry_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                <div className="text-[11px] text-muted-foreground truncate">{e.mood || e.market_notes || "—"}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
        <Button onClick={add} className="mint-fill rounded-xl">Add</Button>
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
          <button key={v} onClick={() => setView(v)} className={`flex-1 text-xs py-1.5 rounded-lg press capitalize ${view === v ? "bg-mint text-mint-foreground" : "text-muted-foreground"}`}>{v}</button>
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

/* ---------- Daily breakdown ---------- */
function DailyBreakdown({ trades, strats, onChange, onOpenTrade }: { trades: Trade[]; strats: Strategy[]; onChange: () => void; onOpenTrade: (t: Trade) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const days = useMemo(() => {
    const byDay = new Map<string, Trade[]>();
    for (const t of trades) {
      if (t.pnl == null) continue;
      const key = new Date(t.closed_at ?? t.opened_at).toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(t);
    }
    return Array.from(byDay.entries()).map(([date, dayTrades]) => {
      const sorted = [...dayTrades].sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());
      let cum = 0;
      const spark = sorted.map((t) => { cum += t.pnl ?? 0; return { v: cum }; });
      const netPnl = cum;
      const fees = dayTrades.reduce((s, t) => s + (t.fees ?? 0), 0);
      const grossPnl = netPnl + fees;
      const wins = dayTrades.filter((t) => (t.pnl ?? 0) > 0);
      const losses = dayTrades.filter((t) => (t.pnl ?? 0) < 0);
      const winRate = dayTrades.length ? (wins.length / dayTrades.length) * 100 : 0;
      const volume = dayTrades.reduce((s, t) => s + t.size, 0);
      const grossWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
      const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
      const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
      return { date, trades: sorted, netPnl, grossPnl, fees, winRate, volume, winners: wins.length, losers: losses.length, profitFactor, spark };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [trades]);

  const toggle = (date: string) => setExpanded((s) => {
    const n = new Set(s);
    if (n.has(date)) n.delete(date); else n.add(date);
    return n;
  });

  if (days.length === 0) return <div className="text-xs text-muted-foreground text-center py-12">No closed trades yet.</div>;

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const good = d.netPnl >= 0;
        const color = good ? "hsl(var(--success))" : "hsl(var(--danger))";
        const open = expanded.has(d.date);
        return (
          <div key={d.date} className="glass rounded-2xl overflow-hidden">
            <button onClick={() => toggle(d.date)} className="w-full flex items-center gap-2 p-3 press text-left">
              <ChevronRight className={`size-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className={`text-xs font-medium ${good ? "text-success" : "text-danger"}`}>Net {fmtMoney(d.netPnl)}</div>
              </div>
            </button>
            <div className="px-3 pb-3">
              {d.spark.length > 1 && (
                <div className="h-16 -mx-1">
                  <ResponsiveContainer>
                    <AreaChart data={d.spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${d.date}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${d.date})`} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2">
                <StatCell label="Total trades" value={`${d.trades.length}`} />
                <StatCell label="Gross P&L" value={fmtMoney(d.grossPnl)} tone={d.grossPnl >= 0 ? "good" : "bad"} />
                <StatCell label="Win rate" value={`${d.winRate.toFixed(0)}%`} />
                <StatCell label="Volume" value={`${d.volume}`} />
                <StatCell label="Winners / Losers" value={`${d.winners} / ${d.losers}`} />
                <StatCell label="Profit factor" value={Number.isFinite(d.profitFactor) ? d.profitFactor.toFixed(2) : "∞"} />
                <StatCell label="Commissions" value={fmtMoney(d.fees)} />
              </div>
              {open && (
                <div className="space-y-1.5 mt-3 pt-3 border-t border-border">
                  {d.trades.map((t) => <TradeRow key={t.id} t={t} strats={strats} onChange={onChange} onOpen={() => onOpenTrade(t)} />)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function StatCell({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`text-xs font-medium mt-0.5 ${tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}

function MonthHeatmap({ trades }: { trades: Trade[] }) {
  const [offset, setOffset] = useState(0);
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = target.getFullYear(), m = target.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const key = new Date(t.closed_at ?? t.opened_at).toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + (t.pnl ?? 0));
    }
    return map;
  }, [trades]);

  const monthNet = Array.from(byDay.entries())
    .filter(([d]) => d.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`))
    .reduce((s, [, v]) => s + v, 0);
  const maxAbs = Math.max(1, ...Array.from(byDay.values()).map((v) => Math.abs(v)));

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">{target.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${monthNet >= 0 ? "text-success" : "text-danger"}`}>{fmtMoney(monthNet)}</span>
          <button onClick={() => setOffset((o) => o - 1)} className="size-6 grid place-items-center rounded press glass text-xs">‹</button>
          <button onClick={() => setOffset(0)} className="text-[10px] px-1.5 press text-muted-foreground">Today</button>
          <button onClick={() => setOffset((o) => o + 1)} className="size-6 grid place-items-center rounded press glass text-xs">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[9px] text-muted-foreground text-center mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }).map((_, i) => <div key={`p${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const pnl = byDay.get(key);
          const intensity = pnl ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
          const alpha = 0.15 + intensity * 0.6;
          const bg = !pnl ? undefined : `hsl(var(--${pnl > 0 ? "success" : "danger"}) / ${alpha})`;
          return (
            <div key={d} className="aspect-square rounded-md p-1 text-[9px] bg-surface-elevated/60" style={bg ? { background: bg } : undefined}>
              <div className="text-muted-foreground">{d}</div>
              {pnl != null && <div className="font-medium mt-0.5">{pnl > 0 ? "+" : ""}{Math.round(pnl)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Trades table ---------- */
function TradesTable({ trades, strats, onChange, onOpenTrade }: { trades: Trade[]; strats: Strategy[]; onChange: () => void; onOpenTrade: (t: Trade) => void }) {
  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    const { error } = await sb.from("trades").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };

  if (trades.length === 0) return <div className="text-xs text-muted-foreground text-center py-12">No trades match.</div>;

  return (
    <div className="glass rounded-2xl overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-2.5 py-2 text-left font-medium">Date</th>
            <th className="px-2.5 py-2 text-left font-medium">Pair</th>
            <th className="px-2.5 py-2 text-left font-medium">Dir</th>
            <th className="px-2.5 py-2 text-right font-medium">Size</th>
            <th className="px-2.5 py-2 text-right font-medium">Entry</th>
            <th className="px-2.5 py-2 text-right font-medium">Exit</th>
            <th className="px-2.5 py-2 text-right font-medium">P&L</th>
            <th className="px-2.5 py-2 text-left font-medium">Setup</th>
            <th className="px-2.5 py-2 text-left font-medium">Tags</th>
            <th className="px-2.5 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const strat = strats.find((s) => s.id === t.strategy_id);
            return (
              <tr key={t.id} onClick={() => onOpenTrade(t)} className="border-b border-border/60 last:border-0 press cursor-pointer">
                <td className="px-2.5 py-2 text-muted-foreground">{new Date(t.opened_at).toLocaleDateString()}</td>
                <td className="px-2.5 py-2 font-medium">
                  {t.pair}
                  {strat && <span className="ml-1.5 px-1 py-px rounded text-[9px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
                </td>
                <td className={`px-2.5 py-2 uppercase text-[10px] ${t.direction === "long" ? "text-success" : "text-danger"}`}>{t.direction}</td>
                <td className="px-2.5 py-2 text-right">{t.size}</td>
                <td className="px-2.5 py-2 text-right">{t.entry_price}</td>
                <td className="px-2.5 py-2 text-right">{t.exit_price ?? "—"}</td>
                <td className={`px-2.5 py-2 text-right font-medium ${t.pnl == null ? "text-muted-foreground" : t.pnl >= 0 ? "text-success" : "text-danger"}`}>
                  {t.pnl == null ? "Open" : fmtMoney(t.pnl)}
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">{t.setup ?? "—"}</td>
                <td className="px-2.5 py-2">
                  <div className="flex gap-1">
                    {(t.tags ?? []).slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1 py-px rounded bg-surface-elevated text-[9px] text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-2.5 py-2">
                  <button onClick={(e) => del(e, t.id)} className="text-muted-foreground hover:text-danger press"><Trash2 className="size-3.5" /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const bySetup = useMemo(() => {
    const m: Record<string, { name: string; pnl: number; count: number; wins: number }> = {};
    for (const t of trades as Trade[]) {
      if (t.pnl == null) continue;
      const key = t.setup?.trim() || "Untagged";
      if (!m[key]) m[key] = { name: key, pnl: 0, count: 0, wins: 0 };
      m[key].pnl += t.pnl;
      m[key].count += 1;
      if (t.pnl > 0) m[key].wins += 1;
    }
    return Object.values(m).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const bySymbol = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trades as Trade[]) {
      if (t.pnl == null) continue;
      m.set(t.pair, (m.get(t.pair) ?? 0) + t.pnl);
    }
    return Array.from(m.entries()).map(([pair, pnl]) => ({ pair, pnl })).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const byDow = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const m = days.map((d) => ({ day: d, pnl: 0 }));
    for (const t of trades as Trade[]) {
      if (t.pnl == null) continue;
      const d = new Date(t.closed_at ?? t.opened_at).getDay();
      m[d].pnl += t.pnl;
    }
    return m;
  }, [trades]);

  const equity = useMemo(() => {
    const closed = (trades as Trade[]).filter((t) => t.pnl != null)
      .sort((a, b) => new Date(a.closed_at ?? a.opened_at).getTime() - new Date(b.closed_at ?? b.opened_at).getTime());
    let cum = 0;
    return closed.map((t) => { cum += t.pnl ?? 0; return { equity: cum }; });
  }, [trades]);

  const profitFactor = useMemo(() => {
    const grossWin = (trades as Trade[]).filter((t) => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs((trades as Trade[]).filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0));
    return grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  }, [trades]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Wins" value={`${stats.wins}`} tone="good" />
        <Stat label="Losses" value={`${stats.losses}`} tone="bad" />
        <Stat label="Profit factor" value={Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"} tone={profitFactor >= 1 ? "good" : "bad"} />
        <Stat label="Avg win" value={fmtMoney(stats.avgWin)} tone="good" />
        <Stat label="Avg loss" value={`-${fmtMoney(stats.avgLoss)}`} tone="bad" />
      </div>

      {equity.length > 1 && (
        <div className="glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">Equity curve</div>
          <div className="h-32">
            <ResponsiveContainer>
              <AreaChart data={equity} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--mint))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--mint))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--mint))" strokeWidth={1.5} fill="url(#equity-fill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <MonthHeatmap trades={(trades as Trade[]).filter((t) => t.pnl != null)} />

      {bySymbol.length > 0 && (
        <div className="glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">P&L by symbol</div>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={bySymbol} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} vertical={false} />
                <XAxis dataKey="pair" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={36} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border-strong))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="pnl" isAnimationActive={false}>
                  {bySymbol.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--danger))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">P&L by day of week</div>
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={byDow} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={36} />
              <Tooltip contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border-strong))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="pnl" isAnimationActive={false}>
                {byDow.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--danger))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">By strategy</div>
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

      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-mint-bright mb-2">By setup</div>
        {bySetup.length === 0 ? <div className="text-xs text-muted-foreground">No closed trades yet.</div> : (
          <div className="space-y-2">
            {bySetup.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="flex-1 text-sm truncate">{s.name}</div>
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