import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  TrendingUp, LayoutDashboard, ListChecks, Upload, NotebookPen, BarChart3, Settings as SettingsIcon,
  LogOut, Menu, Trash2, Check, FileText, Loader2, RotateCcw,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { parseTradesCsv, parseCsvRows, detectDelimiter, stripBom } from "@/lib/csvImport";
import { dupeKey, findDuplicateGroups } from "@/lib/dupeDetection";
import { TradeSnapshotChart } from "@/components/TradeSnapshotChart";
import { TradingViewChart } from "@/components/TradingViewChart";
import { BrokerConnections } from "@/components/BrokerConnections";

// Edgebook's exact palette (ported verbatim from its styles.css oklch tokens).
const EB = {
  background: "oklch(0.145 0.01 260)",
  foreground: "oklch(0.97 0.005 260)",
  card: "oklch(0.185 0.012 260)",
  popover: "oklch(0.185 0.012 260)",
  primary: "oklch(0.78 0.18 155)",
  primaryForeground: "oklch(0.14 0.01 260)",
  secondary: "oklch(0.235 0.015 260)",
  muted: "oklch(0.22 0.012 260)",
  mutedForeground: "oklch(0.65 0.02 260)",
  accent: "oklch(0.28 0.02 260)",
  destructive: "oklch(0.65 0.22 25)",
  border: "oklch(0.28 0.015 260)",
  input: "oklch(0.24 0.015 260)",
  win: "oklch(0.78 0.18 155)",
  loss: "oklch(0.66 0.22 25)",
  warn: "oklch(0.82 0.16 80)",
  sidebar: "oklch(0.165 0.01 260)",
  sidebarBorder: "oklch(0.24 0.015 260)",
};

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
type JournalEntry = { id: string; entry_date: string; mood: string | null; market_notes: string | null; lessons: string | null };

const sb = supabase as any;

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "trades", label: "Trades", icon: ListChecks },
  { key: "import", label: "Import", icon: Upload },
  { key: "journal", label: "Journal", icon: NotebookPen },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
] as const;
type View = (typeof NAV)[number]["key"];

function fmtMoney(n: number | null | undefined, opts?: { sign?: boolean }) {
  const v = Number(n ?? 0);
  const s = v.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  if (opts?.sign && v > 0) return "+" + s;
  return s;
}
function fmtPct(n: number, digits = 1) { return `${(n * 100).toFixed(digits)}%`; }
function pnlColor(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (v > 0) return EB.win;
  if (v < 0) return EB.loss;
  return EB.mutedForeground;
}

export default function Journal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "new">(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);

  const refresh = async (): Promise<Trade[]> => {
    if (!user) return [];
    const [t, s] = await Promise.all([
      sb.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
      sb.from("strategies").select("*").eq("user_id", user.id).order("name"),
    ]);
    const freshTrades = t.data ?? [];
    setTrades(freshTrades);
    setStrats(s.data ?? []);
    setLoading(false);
    return freshTrades;
  };
  useEffect(() => { refresh(); }, [user]);

  return (
    <div className="min-h-screen" style={{ background: EB.background, color: EB.foreground }}>
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 md:flex md:flex-col" style={{ background: EB.sidebar, borderRight: `1px solid ${EB.sidebarBorder}` }}>
        <div className="flex h-14 items-center gap-2 px-5 font-semibold" style={{ borderBottom: `1px solid ${EB.sidebarBorder}` }}>
          <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: EB.primary, color: EB.primaryForeground }}><TrendingUp className="h-4 w-4" /></div>
          Edgebook
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setView(n.key)}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors"
              style={view === n.key ? { background: EB.accent, color: EB.foreground } : { color: EB.mutedForeground }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3" style={{ borderTop: `1px solid ${EB.sidebarBorder}` }}>
          <div className="truncate px-3 py-1 text-xs" style={{ color: EB.mutedForeground }}>{user?.email}</div>
          <button onClick={() => nav("/vault")} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs" style={{ color: EB.mutedForeground }}>
            <LogOut className="h-3.5 w-3.5" /> Back to Vault
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-4 md:hidden" style={{ borderBottom: `1px solid ${EB.border}`, background: EB.background, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-2 font-semibold">
          <div className="grid h-6 w-6 place-items-center rounded" style={{ background: EB.primary, color: EB.primaryForeground }}><TrendingUp className="h-3.5 w-3.5" /></div>
          Edgebook
        </div>
        <button onClick={() => setMobileMenu((v) => !v)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs" style={{ border: `1px solid ${EB.border}` }}>
          <Menu className="h-3.5 w-3.5" /> Menu
        </button>
      </header>
      {mobileMenu && (
        <div className="p-3 md:hidden" style={{ borderBottom: `1px solid ${EB.border}`, background: EB.sidebar }}>
          <div className="grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => { setView(n.key); setMobileMenu(false); }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm" style={{ border: `1px solid ${EB.border}` }}>
                <n.icon className="h-4 w-4" /> {n.label}
              </button>
            ))}
            <button onClick={() => nav("/vault")} className="col-span-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm" style={{ border: `1px solid ${EB.border}` }}>
              <LogOut className="h-4 w-4" /> Back to Vault
            </button>
          </div>
        </div>
      )}

      <main className="md:pl-56">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {loading ? (
            <div className="grid place-items-center py-24 text-sm" style={{ color: EB.mutedForeground }}>Loading…</div>
          ) : view === "dashboard" ? (
            <DashboardView trades={trades} onOpenTrade={setDetailTrade} />
          ) : view === "trades" ? (
            <TradesView trades={trades} strats={strats} onOpenTrade={setDetailTrade} onChange={refresh} onAdd={() => setSheet("new")} />
          ) : view === "import" ? (
            <ImportView user={user} strats={strats} trades={trades} onDone={refresh} />
          ) : view === "journal" ? (
            <JournalNotesView />
          ) : view === "analytics" ? (
            <AnalyticsView trades={trades} />
          ) : (
            <SettingsView trades={trades} onChange={refresh} onOpenTrade={setDetailTrade} />
          )}
        </div>
      </main>

      <Sheet open={sheet === "new"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto" style={{ background: EB.card, borderColor: EB.border }}>
          <SheetHeader><SheetTitle style={{ color: EB.foreground }}>Log a trade</SheetTitle></SheetHeader>
          <TradeForm strats={strats} onSaved={() => { setSheet(null); refresh(); }} />
        </SheetContent>
      </Sheet>
      <Sheet open={detailTrade != null} onOpenChange={(o) => !o && setDetailTrade(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto" style={{ background: EB.card, borderColor: EB.border }}>
          <SheetHeader><SheetTitle style={{ color: EB.foreground }}>{detailTrade?.pair}</SheetTitle></SheetHeader>
          {detailTrade && (
            <TradeDetail trade={detailTrade} strats={strats} onChange={(t) => { setDetailTrade(t); refresh(); }} onClose={() => setDetailTrade(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Card({ children, className = "", ...rest }: any) {
  return <div className={`rounded-md p-4 ${className}`} style={{ background: EB.card, border: `1px solid ${EB.border}` }} {...rest}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs" style={{ color: EB.mutedForeground }}>{children}</div>;
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label>{label}</Label>{children}</div>;
}
function fieldStyle(): React.CSSProperties { return { background: EB.input, borderColor: EB.border, color: EB.foreground }; }

/* ---------- Dashboard ---------- */
function DashboardView({ trades, onOpenTrade }: { trades: Trade[]; onOpenTrade: (t: Trade) => void }) {
  const closed = useMemo(() => trades.filter((t) => t.pnl != null), [trades]);
  const kpis = useMemo(() => {
    const net = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
    const winRate = closed.length ? wins.length / closed.length : 0;
    const grossW = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossL = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const pf = grossL > 0 ? grossW / grossL : wins.length ? Infinity : 0;
    return { net, winRate, pf, count: closed.length, wins: wins.length, losses: losses.length };
  }, [closed]);
  const equity = useMemo(() => {
    const sorted = [...closed].sort((a, b) => +new Date(a.closed_at ?? a.opened_at) - +new Date(b.closed_at ?? b.opened_at));
    let cum = 0;
    return sorted.map((t) => { cum += t.pnl ?? 0; return { date: (t.closed_at ?? t.opened_at).slice(0, 10), equity: cum }; });
  }, [closed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm" style={{ color: EB.mutedForeground }}>Your edge at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Net P&L" value={fmtMoney(kpis.net, { sign: true })} tone={kpis.net} />
        <Kpi label="Win rate" value={fmtPct(kpis.winRate)} tone={kpis.winRate - 0.5} />
        <Kpi label="Profit factor" value={Number.isFinite(kpis.pf) ? kpis.pf.toFixed(2) : "∞"} tone={kpis.pf - 1} />
        <Kpi label="Trades" value={String(kpis.count)} sub={`${kpis.wins}W · ${kpis.losses}L`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Equity curve</h3>
            <span className="text-sm" style={{ color: pnlColor(kpis.net) }}>{fmtMoney(kpis.net, { sign: true })}</span>
          </div>
          <div className="h-64">
            {equity.length > 1 ? (
              <ResponsiveContainer>
                <AreaChart data={equity}>
                  <defs>
                    <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={EB.primary} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={EB.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: EB.mutedForeground, fontSize: 11 }} />
                  <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v)}`} />
                  <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="equity" stroke={EB.primary} fill="url(#eq)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center text-xs" style={{ color: EB.mutedForeground }}>Not enough closed trades yet.</div>}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium">Recent trades</h3>
          <ul className="space-y-2 text-sm">
            {trades.slice(0, 8).map((t) => (
              <li key={t.id}>
                <button onClick={() => onOpenTrade(t)} className="flex w-full items-center justify-between pb-2 text-left" style={{ borderBottom: `1px solid ${EB.border}` }}>
                  <div><span className="font-medium">{t.pair}</span><span className="ml-2 text-xs uppercase" style={{ color: EB.mutedForeground }}>{t.direction}</span></div>
                  <span className="text-xs" style={{ color: pnlColor(t.pnl) }}>{t.pnl != null ? fmtMoney(t.pnl, { sign: true }) : "Open"}</span>
                </button>
              </li>
            ))}
            {trades.length === 0 && <li className="text-xs" style={{ color: EB.mutedForeground }}>No trades yet.</li>}
          </ul>
        </Card>
      </div>

      <CalendarHeatmap trades={closed} />
    </div>
  );
}
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number }) {
  const color = tone === undefined ? EB.foreground : tone > 0 ? EB.win : tone < 0 ? EB.loss : EB.foreground;
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: EB.mutedForeground }}>{label}</div>
      <div className="mt-2 text-2xl font-semibold" style={{ color }}>{value}</div>
      {sub && <div className="mt-1 text-xs" style={{ color: EB.mutedForeground }}>{sub}</div>}
    </Card>
  );
}
function CalendarHeatmap({ trades }: { trades: Trade[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const y = target.getFullYear(), m = target.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();

  const byDay = new Map<string, number>();
  for (const t of trades) {
    const d = (t.closed_at ?? t.opened_at).slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + (t.pnl ?? 0));
  }
  const monthNet = Array.from(byDay.entries()).filter(([d]) => d.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).reduce((a, [, v]) => a + v, 0);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{target.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: pnlColor(monthNet) }}>Net {fmtMoney(monthNet, { sign: true })}</span>
          <div className="flex gap-1">
            <button className="rounded px-2 py-0.5" style={{ border: `1px solid ${EB.border}` }} onClick={() => setMonthOffset((o) => o - 1)}>←</button>
            <button className="rounded px-2 py-0.5" style={{ border: `1px solid ${EB.border}` }} onClick={() => setMonthOffset(0)}>Today</button>
            <button className="rounded px-2 py-0.5" style={{ border: `1px solid ${EB.border}` }} onClick={() => setMonthOffset((o) => o + 1)}>→</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center text-[10px]" style={{ color: EB.mutedForeground }}>{d}</div>)}
        {Array.from({ length: first }).map((_, i) => <div key={"pad" + i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const pnl = byDay.get(key);
          const abs = pnl ? Math.min(Math.abs(pnl) / 500, 1) : 0;
          const bg = !pnl ? EB.card : pnl > 0 ? `color-mix(in oklch, ${EB.win} ${18 + abs * 55}%, ${EB.card})` : `color-mix(in oklch, ${EB.loss} ${18 + abs * 55}%, ${EB.card})`;
          return (
            <div key={d} className="aspect-square rounded-md p-1.5 text-[10px]" style={{ background: bg, border: `1px solid ${EB.border}` }}>
              <div style={{ color: EB.mutedForeground }}>{d}</div>
              {pnl != null && <div className="mt-0.5 font-medium">{pnl > 0 ? "+" : "-"}${Math.abs(Math.round(pnl))}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Trades ---------- */
function TradesView({ trades, strats, onOpenTrade, onChange, onAdd }: { trades: Trade[]; strats: Strategy[]; onOpenTrade: (t: Trade) => void; onChange: () => void; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState<"all" | "long" | "short">("all");
  const rows = useMemo(() => trades.filter((t) => {
    if (side !== "all" && t.direction !== side) return false;
    if (q && !`${t.pair} ${t.setup ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [trades, q, side]);

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    const { error } = await sb.from("trades").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
          <p className="text-sm" style={{ color: EB.mutedForeground }}>{rows.length} of {trades.length}</p>
        </div>
        <Button onClick={onAdd} style={{ background: EB.primary, color: EB.primaryForeground }}>Add trade</Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol, setup, tag…" className="max-w-xs" style={fieldStyle()} />
          {(["all", "long", "short"] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} className="rounded-md px-3 py-1.5 text-xs capitalize"
              style={side === s ? { background: EB.primary, color: EB.primaryForeground } : { border: `1px solid ${EB.border}`, color: EB.mutedForeground }}>{s}</button>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase" style={{ color: EB.mutedForeground }}>
            <tr style={{ borderBottom: `1px solid ${EB.border}` }}>
              {["Date", "Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "Setup", "Tags", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const strat = strats.find((s) => s.id === t.strategy_id);
              return (
                <tr key={t.id} onClick={() => onOpenTrade(t)} className="cursor-pointer" style={{ borderBottom: `1px solid ${EB.border}` }}>
                  <td className="px-3 py-2.5" style={{ color: EB.mutedForeground }}>{(t.closed_at ?? t.opened_at).slice(0, 10)}</td>
                  <td className="px-3 py-2.5 font-medium">
                    {t.pair}
                    {strat && <span className="ml-1.5 rounded px-1 py-px text-[10px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs uppercase" style={{ color: t.direction === "long" ? EB.win : EB.loss }}>{t.direction}</td>
                  <td className="px-3 py-2.5">{t.size}</td>
                  <td className="px-3 py-2.5">{t.entry_price}</td>
                  <td className="px-3 py-2.5">{t.exit_price ?? "—"}</td>
                  <td className="px-3 py-2.5 font-medium" style={{ color: pnlColor(t.pnl) }}>{t.pnl != null ? fmtMoney(t.pnl, { sign: true }) : "—"}</td>
                  <td className="px-3 py-2.5" style={{ color: EB.mutedForeground }}>{t.setup ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(t.tags ?? []).map((tag) => <span key={tag} className="rounded px-1.5 py-0.5 text-[10px]" style={{ border: `1px solid ${EB.border}` }}>{tag}</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={(e) => del(e, t.id)} style={{ color: EB.mutedForeground }}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-sm" style={{ color: EB.mutedForeground }}>No trades match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TradeForm({ strats, onSaved }: { strats: Strategy[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<any>({
    pair: "", direction: "long", entry_price: "", exit_price: "", size: "",
    fees: "0", strategy_id: "", notes: "", setup: "", tags: "", stop_loss: "", take_profit: "",
    opened_at: new Date().toISOString().slice(0, 16), closed_at: "",
  });
  const [saving, setSaving] = useState(false);

  const pnlPreview = useMemo(() => {
    const e = Number(v.entry_price), x = Number(v.exit_price), s = Number(v.size), f = Number(v.fees) || 0;
    if (!e || !x || !s) return null;
    return (x - e) * s * (v.direction === "long" ? 1 : -1) - f;
  }, [v]);

  const save = async () => {
    if (!user) return;
    if (!v.pair.trim() || !v.entry_price || !v.size) { toast.error("Pair, entry, and size are required."); return; }
    setSaving(true);
    const payload: any = {
      user_id: user.id, pair: v.pair.trim().toUpperCase(), direction: v.direction,
      entry_price: Number(v.entry_price), exit_price: v.exit_price ? Number(v.exit_price) : null,
      size: Number(v.size), fees: Number(v.fees) || 0, pnl: pnlPreview,
      strategy_id: v.strategy_id || null, notes: v.notes || null,
      opened_at: new Date(v.opened_at).toISOString(),
      closed_at: v.closed_at ? new Date(v.closed_at).toISOString() : (v.exit_price ? new Date().toISOString() : null),
      setup: v.setup || null, tags: v.tags ? v.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      stop_loss: v.stop_loss ? Number(v.stop_loss) : null, take_profit: v.take_profit ? Number(v.take_profit) : null,
    };
    const { error } = await sb.from("trades").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Trade logged."); onSaved(); }
  };

  return (
    <div className="grid grid-cols-2 gap-3 mt-3 pb-6">
      <Field label="Symbol"><Input value={v.pair} onChange={(e) => setV({ ...v, pair: e.target.value })} placeholder="AAPL" style={fieldStyle()} /></Field>
      <Field label="Side">
        <select value={v.direction} onChange={(e) => setV({ ...v, direction: e.target.value })} className="w-full h-10 rounded-md px-2 text-sm" style={fieldStyle()}>
          <option value="long">Long</option><option value="short">Short</option>
        </select>
      </Field>
      <Field label="Quantity"><Input type="number" value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Fees"><Input type="number" value={v.fees} onChange={(e) => setV({ ...v, fees: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Entry price"><Input type="number" value={v.entry_price} onChange={(e) => setV({ ...v, entry_price: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Exit price"><Input type="number" value={v.exit_price} onChange={(e) => setV({ ...v, exit_price: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Entry time"><Input type="datetime-local" value={v.opened_at} onChange={(e) => setV({ ...v, opened_at: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Exit time"><Input type="datetime-local" value={v.closed_at} onChange={(e) => setV({ ...v, closed_at: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Stop loss"><Input type="number" value={v.stop_loss} onChange={(e) => setV({ ...v, stop_loss: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Take profit"><Input type="number" value={v.take_profit} onChange={(e) => setV({ ...v, take_profit: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Setup" className="col-span-2"><Input value={v.setup} onChange={(e) => setV({ ...v, setup: e.target.value })} placeholder="Breakout, VWAP reclaim…" style={fieldStyle()} /></Field>
      <Field label="Tags (comma separated)" className="col-span-2"><Input value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} placeholder="momentum, gap-up" style={fieldStyle()} /></Field>
      <Field label="Notes" className="col-span-2"><Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} style={fieldStyle()} /></Field>
      {pnlPreview !== null && (
        <div className="col-span-2 flex justify-between rounded-md px-3 py-2 text-xs" style={{ border: `1px solid ${EB.border}` }}>
          <span style={{ color: EB.mutedForeground }}>Estimated P&L</span>
          <span style={{ color: pnlColor(pnlPreview) }}>{fmtMoney(pnlPreview, { sign: true })}</span>
        </div>
      )}
      <Button onClick={save} disabled={saving} className="col-span-2 h-11" style={{ background: EB.primary, color: EB.primaryForeground }}>
        {saving ? "Saving…" : "Save trade"}
      </Button>
    </div>
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
  const [showSnapshot, setShowSnapshot] = useState(true);
  const durationMs = trade.closed_at ? new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime() : 0;
  const [liveInterval, setLiveInterval] = useState<"1" | "5" | "15" | "60" | "240" | "D">(
    durationMs && durationMs <= 2 * 3600_000 ? "5" : durationMs && durationMs <= 18 * 3600_000 ? "60" : "D",
  );

  const save = async () => {
    setSaving(true);
    const payload = {
      setup: setup || null, tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      stop_loss: stopLoss ? Number(stopLoss) : null, take_profit: takeProfit ? Number(takeProfit) : null,
      notes: notes || null,
    };
    const { data, error } = await sb.from("trades").update(payload).eq("id", trade.id).select().single();
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Trade updated."); onChange(data as Trade); }
  };

  return (
    <div className="space-y-4 mt-3 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase" style={{ color: EB.mutedForeground }}>
          <span>{trade.direction}</span>
          {strat && <span className="rounded px-1.5 py-px text-[10px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
        </div>
        <div className="text-sm font-medium" style={{ color: !trade.closed_at ? EB.mutedForeground : pnlColor(trade.pnl) }}>
          {!trade.closed_at ? "Open" : fmtMoney(trade.pnl, { sign: true })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-1 overflow-x-auto">
          {(["1", "5", "15", "60", "240", "D"] as const).map((i) => (
            <button key={i} onClick={() => setLiveInterval(i)} className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px]"
              style={liveInterval === i ? { background: EB.primary, color: EB.primaryForeground } : { border: `1px solid ${EB.border}`, color: EB.mutedForeground }}>
              {i === "D" ? "1D" : i === "60" ? "1h" : i === "240" ? "4h" : `${i}m`}
            </button>
          ))}
        </div>
        <TradingViewChart symbol={trade.pair} interval={liveInterval} height="clamp(220px, 55vw, 380px)" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Entry", trade.entry_price], ["Exit", trade.exit_price ?? "—"], ["Size", trade.size]].map(([label, value]) => (
          <Card key={label as string} className="p-2">
            <div className="text-[9px] uppercase tracking-wide" style={{ color: EB.mutedForeground }}>{label}</div>
            <div className="text-sm font-medium mt-0.5">{value}</div>
          </Card>
        ))}
      </div>

      <button onClick={() => setShowSnapshot((s) => !s)} className="text-[11px]" style={{ color: EB.primary }}>
        {showSnapshot ? "Hide price snapshot" : "Show price snapshot (entry/exit markers)"}
      </button>
      {showSnapshot && (
        <TradeSnapshotChart symbol={trade.pair} direction={trade.direction} openedAt={trade.opened_at} closedAt={trade.closed_at} entryPrice={trade.entry_price} exitPrice={trade.exit_price} height={260} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Stop loss"><Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} style={fieldStyle()} /></Field>
        <Field label="Take profit"><Input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} style={fieldStyle()} /></Field>
      </div>
      <Field label="Setup"><Input value={setup} onChange={(e) => setSetup(e.target.value)} style={fieldStyle()} /></Field>
      <Field label="Tags (comma separated)"><Input value={tags} onChange={(e) => setTags(e.target.value)} style={fieldStyle()} /></Field>
      <Field label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldStyle()} /></Field>

      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1 h-11">Close</Button>
        <Button onClick={save} disabled={saving} className="flex-1 h-11" style={{ background: EB.primary, color: EB.primaryForeground }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Import ---------- */
function ImportView({ user, strats, trades, onDone }: { user: any; strats: Strategy[]; trades: Trade[]; onDone: () => void }) {
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [pending, setPending] = useState<{ trades: ReturnType<typeof parseTradesCsv>["trades"]; errors: string[] } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastFile, setLastFile] = useState<{ name: string; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadText = (name: string, text: string) => {
    setFileName(name);
    setRawText(text);
    setLastFile({ name, text });
    const { trades: parsed, errors } = parseTradesCsv(text);
    if (parsed.length === 0) { setAdvanced(true); setPending(null); }
    else { setPending({ trades: parsed, errors }); setAdvanced(false); }
  };

  const handleFile = async (file: File) => loadText(file.name, await file.text());
  const redoLastImport = () => { if (lastFile) loadText(lastFile.name, lastFile.text); };

  const doSimpleImport = async () => {
    if (!pending || !user) return;
    setImporting(true);
    try {
      const stratByName = new Map(strats.map((s) => [s.name.toLowerCase(), s.id]));
      const newNames = Array.from(new Set(pending.trades.map((t) => t.strategy?.trim()).filter((n): n is string => !!n && !stratByName.has(n.toLowerCase()))));
      if (newNames.length) {
        const palette = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];
        const { data: created } = await sb.from("strategies").insert(newNames.map((name, i) => ({ user_id: user.id, name, color: palette[i % palette.length] }))).select();
        (created ?? []).forEach((s: Strategy) => stratByName.set(s.name.toLowerCase(), s.id));
      }
      const existingKeys = new Set(trades.map(dupeKey));
      const seenInFile = new Set<string>();
      let dupes = 0;
      const payload = pending.trades.map((t) => {
        const pnl = t.pnl !== undefined ? t.pnl : t.exit_price != null ? (t.exit_price - t.entry_price) * t.size * (t.direction === "long" ? 1 : -1) - t.fees : null;
        return {
          user_id: user.id, pair: t.pair, direction: t.direction, entry_price: t.entry_price, exit_price: t.exit_price,
          size: t.size, fees: t.fees, pnl, strategy_id: t.strategy ? stratByName.get(t.strategy.toLowerCase()) ?? null : null,
          notes: t.notes, opened_at: t.opened_at, closed_at: t.closed_at,
        };
      }).filter((t) => {
        const key = dupeKey(t);
        if (existingKeys.has(key) || seenInFile.has(key)) { dupes++; return false; }
        seenInFile.add(key);
        return true;
      });
      if (payload.length === 0) {
        toast.info(`All ${dupes} row(s) look like duplicates of trades you already have — nothing imported.`);
        setImporting(false);
        return;
      }
      const { error } = await sb.from("trades").insert(payload);
      if (error) throw error;
      toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}${dupes ? ` (skipped ${dupes} likely duplicate${dupes === 1 ? "" : "s"})` : ""}.`);
      setPending(null); setFileName(""); onDone();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import trades</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>Upload a CSV — we'll auto-detect the format.</p>
      </div>

      {!fileName ? (
        <Card className="p-8">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg p-10 text-center" style={{ border: `2px dashed ${EB.border}` }}>
            <Upload className="h-8 w-8" style={{ color: EB.mutedForeground }} />
            <div>
              <div className="font-medium">Drop CSV or click to select</div>
              <div className="mt-1 text-xs" style={{ color: EB.mutedForeground }}>NinjaTrader, TD, IBKR, Webull, Robinhood, TradingView, MT4/5…</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </label>
          {lastFile && (
            <div className="mt-4 flex items-center justify-between rounded-md px-3 py-2 text-xs" style={{ border: `1px solid ${EB.border}` }}>
              <span style={{ color: EB.mutedForeground }}>Last file: {lastFile.name}</span>
              <Button variant="outline" size="sm" onClick={redoLastImport} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Redo last import
              </Button>
            </div>
          )}
        </Card>
      ) : advanced ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" style={{ color: EB.mutedForeground }} /><span className="font-medium">{fileName}</span></div>
            <Button variant="ghost" size="sm" onClick={() => { setFileName(""); setAdvanced(false); }}>Choose different file</Button>
          </div>
          <AdvancedMapper text={rawText} onImport={async (built) => {
            const existingKeys = new Set(trades.map(dupeKey));
            const seenInFile = new Set<string>();
            let dupes = 0;
            const payload = built.map((t) => {
              const fees = t.fees ?? 0;
              const pnl = t.exit_price != null && t.entry_price != null && t.size != null ? (t.exit_price - t.entry_price) * t.size * (t.direction === "long" ? 1 : -1) - fees : null;
              return { user_id: user.id, pair: (t.pair ?? "").toUpperCase(), direction: t.direction, entry_price: t.entry_price, exit_price: t.exit_price ?? null, size: t.size, fees, pnl, strategy_id: null, notes: t.notes ?? null, opened_at: t.opened_at, closed_at: t.closed_at ?? null, setup: t.setup ?? null, tags: [], stop_loss: null, take_profit: null };
            }).filter((t) => {
              const key = dupeKey(t as any);
              if (existingKeys.has(key) || seenInFile.has(key)) { dupes++; return false; }
              seenInFile.add(key);
              return true;
            });
            if (payload.length === 0) {
              toast.info(`All ${dupes} row(s) look like duplicates of trades you already have — nothing imported.`);
              return;
            }
            const { error } = await sb.from("trades").insert(payload);
            if (error) { toast.error(error.message); return; }
            toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}${dupes ? ` (skipped ${dupes} likely duplicate${dupes === 1 ? "" : "s"})` : ""}.`);
            setFileName(""); setAdvanced(false); onDone();
          }} onCancel={() => { setFileName(""); setAdvanced(false); }} />
        </Card>
      ) : pending ? (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" style={{ color: EB.mutedForeground }} /><span className="font-medium">{fileName}</span><span style={{ color: EB.mutedForeground }}>· {pending.trades.length} rows detected</span></div>
              <Button variant="ghost" size="sm" onClick={() => { setFileName(""); setPending(null); }}>Choose different file</Button>
            </div>
            {pending.errors.length > 0 && (
              <div className="mt-3 rounded-md p-3 text-sm" style={{ border: `1px solid ${EB.loss}66`, background: EB.loss + "1a" }}>
                {pending.errors.length} row(s) skipped.
              </div>
            )}
          </Card>
          <Card className="overflow-x-auto p-0">
            <div className="p-3 text-sm font-medium" style={{ borderBottom: `1px solid ${EB.border}` }}>Preview</div>
            <table className="w-full text-xs">
              <thead style={{ color: EB.mutedForeground }}><tr style={{ borderBottom: `1px solid ${EB.border}` }}>
                <th className="px-3 py-2 text-left">Pair</th><th className="px-3 py-2 text-left">Direction</th><th className="px-3 py-2 text-left">Size</th><th className="px-3 py-2 text-left">Entry</th><th className="px-3 py-2 text-left">Opened</th>
              </tr></thead>
              <tbody>
                {pending.trades.slice(0, 5).map((t, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${EB.border}` }}>
                    <td className="px-3 py-2">{t.pair}</td><td className="px-3 py-2">{t.direction}</td><td className="px-3 py-2">{t.size}</td><td className="px-3 py-2">{t.entry_price}</td><td className="px-3 py-2">{t.opened_at.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="flex justify-end">
            <Button onClick={doSimpleImport} disabled={importing} style={{ background: EB.primary, color: EB.primaryForeground }}>{importing ? "Importing…" : `Import ${pending.trades.length} trades`}</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

type Field2 = "pair" | "direction" | "size" | "entry_price" | "exit_price" | "opened_at" | "closed_at" | "fees" | "setup" | "notes" | "ignore";
const MAP_FIELDS: { value: Field2; label: string }[] = [
  { value: "ignore", label: "— Ignore —" }, { value: "pair", label: "Pair *" }, { value: "direction", label: "Direction *" },
  { value: "size", label: "Size *" }, { value: "entry_price", label: "Entry price *" }, { value: "exit_price", label: "Exit price" },
  { value: "opened_at", label: "Opened date/time *" }, { value: "closed_at", label: "Closed date/time" },
  { value: "fees", label: "Fees" }, { value: "setup", label: "Setup" }, { value: "notes", label: "Notes" },
];
const MAP_ALIASES: Record<string, Field2> = {
  pair: "pair", symbol: "pair", ticker: "pair", direction: "direction", side: "direction", action: "direction",
  size: "size", qty: "size", quantity: "size", "entry price": "entry_price", "buy price": "entry_price", price: "entry_price",
  "exit price": "exit_price", "sell price": "exit_price", "opened at": "opened_at", "entry date": "opened_at", date: "opened_at",
  boughttimestamp: "opened_at", "closed at": "closed_at", "exit date": "closed_at", soldtimestamp: "closed_at",
  fees: "fees", commission: "fees", setup: "setup", strategy: "setup", notes: "notes",
};
function mapGuess(h: string): Field2 { return MAP_ALIASES[h.trim().toLowerCase()] ?? "ignore"; }
function mapDirection(v: string): "long" | "short" | null {
  const s = v.trim().toLowerCase();
  if (["long", "buy", "b", "bought"].includes(s)) return "long";
  if (["short", "sell", "s", "sold"].includes(s)) return "short";
  return null;
}
function mapDate(v: string): string | null { const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
function mapNum(v: string): number | null {
  if (!v) return null;
  const neg = /^\(.*\)$/.test(v.trim());
  const n = Number(v.replace(/[$,\s()-]/g, ""));
  return isNaN(n) ? null : (neg ? -n : n);
}
function AdvancedMapper({ text, onImport, onCancel }: { text: string; onImport: (t: any[]) => void; onCancel: () => void }) {
  const parsed = useMemo(() => {
    const clean = stripBom(text);
    const firstLine = clean.slice(0, clean.search(/\r?\n/) === -1 ? clean.length : clean.search(/\r?\n/));
    const rows = parseCsvRows(clean, detectDelimiter(firstLine));
    if (rows.length === 0) return { headers: [] as string[], records: [] as Record<string, string>[] };
    const headers = rows[0];
    return { headers, records: rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))) };
  }, [text]);
  const [mapping, setMapping] = useState<Record<string, Field2>>(() => Object.fromEntries(parsed.headers.map((h) => [h, mapGuess(h)])));

  const build = (row: Record<string, string>) => {
    const out: any = { fees: 0 };
    for (const [col, field] of Object.entries(mapping)) {
      if (field === "ignore") continue;
      const raw = row[col];
      if (!raw) continue;
      if (field === "direction") { const d = mapDirection(raw); if (d) out.direction = d; }
      else if (field === "opened_at" || field === "closed_at") { const d = mapDate(raw); if (d) out[field] = d; }
      else if (["size", "entry_price", "exit_price", "fees"].includes(field)) { const n = mapNum(raw); if (n != null) out[field] = Math.abs(n); }
      else out[field] = raw;
    }
    return out;
  };
  const missing = useMemo(() => {
    const first = parsed.records[0] ? build(parsed.records[0]) : null;
    if (!first) return [] as string[];
    return ["pair", "direction", "size", "entry_price", "opened_at"].filter((f) => first[f] == null);
  }, [parsed.records, mapping]);

  if (parsed.headers.length === 0) return <div className="text-xs" style={{ color: EB.mutedForeground }}>Couldn't read any rows.</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: EB.mutedForeground }}>{parsed.records.length} rows. Map each column — I guessed based on header names.</p>
      {missing.length > 0 && <div className="rounded-md p-3 text-xs" style={{ border: `1px solid ${EB.loss}66`, color: EB.loss }}>Couldn't auto-detect: {missing.join(", ")}</div>}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {parsed.headers.map((h) => (
          <div key={h} className="flex items-center gap-2">
            <div className="flex-1 truncate text-xs" style={{ color: EB.mutedForeground }}>{h}</div>
            <select value={mapping[h] ?? "ignore"} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as Field2 })} className="h-9 flex-1 rounded-md px-2 text-xs" style={fieldStyle()}>
              {MAP_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1 h-11">Cancel</Button>
        <Button onClick={() => onImport(parsed.records.map(build).filter((t) => t.pair && t.direction && t.size && t.entry_price && t.opened_at))}
          disabled={missing.length > 0} className="flex-1 h-11" style={{ background: EB.primary, color: EB.primaryForeground }}>
          Import {parsed.records.length} trades
        </Button>
      </div>
    </div>
  );
}

/* ---------- Journal ---------- */
function JournalNotesView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const { data } = await sb.from("journal_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false });
    setEntries(data ?? []);
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
    const { error } = await sb.from("journal_entries").upsert({ user_id: user.id, entry_date: date, mood: mood || null, market_notes: notes || null, lessons: lessons || null }, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Journal saved"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>The story behind your P&L.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <Label>New / edit date</Label>
          <Input type="date" value={date} onChange={(e) => loadDate(e.target.value)} style={fieldStyle()} />
          <div className="mt-4 space-y-1">
            <div className="mb-2 text-xs uppercase" style={{ color: EB.mutedForeground }}>Recent</div>
            {entries.slice(0, 20).map((e) => (
              <button key={e.id} onClick={() => loadDate(e.entry_date)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm"
                style={date === e.entry_date ? { background: EB.accent } : undefined}>
                <div className="font-medium">{e.entry_date}</div>
                <div className="truncate text-xs" style={{ color: EB.mutedForeground }}>{e.mood || e.market_notes || "—"}</div>
              </button>
            ))}
            {entries.length === 0 && <div className="text-xs" style={{ color: EB.mutedForeground }}>No entries yet.</div>}
          </div>
        </Card>
        <Card className="space-y-4">
          <Field label="Mood / conviction"><Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Focused · patient · aggressive · tilted…" style={fieldStyle()} /></Field>
          <Field label="Market notes"><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the market do today? Levels, catalysts, plan…" style={fieldStyle()} /></Field>
          <Field label="Lessons"><Textarea rows={5} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What worked, what didn't, what to change tomorrow." style={fieldStyle()} /></Field>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} style={{ background: EB.primary, color: EB.primaryForeground }}>{saving ? "Saving…" : "Save entry"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Analytics ---------- */
function AnalyticsView({ trades }: { trades: Trade[] }) {
  const closed = trades.filter((t) => t.pnl != null);
  const bySymbol = useMemo(() => {
    const m = new Map<string, { symbol: string; pnl: number; n: number }>();
    for (const t of closed) {
      const s = m.get(t.pair) ?? { symbol: t.pair, pnl: 0, n: 0 };
      s.pnl += t.pnl ?? 0; s.n += 1; m.set(t.pair, s);
    }
    return Array.from(m.values()).sort((a, b) => b.pnl - a.pnl);
  }, [closed]);
  const bySetup = useMemo(() => {
    const m = new Map<string, { setup: string; pnl: number; n: number; wins: number }>();
    for (const t of closed) {
      const key = t.setup || "Untagged";
      const s = m.get(key) ?? { setup: key, pnl: 0, n: 0, wins: 0 };
      s.pnl += t.pnl ?? 0; s.n += 1; if ((t.pnl ?? 0) > 0) s.wins += 1;
      m.set(key, s);
    }
    return Array.from(m.values()).sort((a, b) => b.pnl - a.pnl);
  }, [closed]);
  const byDow = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const m = days.map((d) => ({ day: d, pnl: 0 }));
    for (const t of closed) m[new Date(t.closed_at ?? t.opened_at).getDay()].pnl += t.pnl ?? 0;
    return m;
  }, [closed]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>Where your edge comes from — and where it leaks.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium">P&L by symbol</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={bySymbol}>
                <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                <XAxis dataKey="symbol" tick={{ fill: EB.mutedForeground, fontSize: 11 }} />
                <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pnl" isAnimationActive={false}>{bySymbol.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? EB.win : EB.loss} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium">P&L by day of week</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byDow}>
                <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: EB.mutedForeground, fontSize: 11 }} />
                <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pnl" isAnimationActive={false}>{byDow.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? EB.win : EB.loss} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <div className="p-4 text-sm font-medium" style={{ borderBottom: `1px solid ${EB.border}` }}>Setup performance</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase" style={{ color: EB.mutedForeground }}>
            <tr style={{ borderBottom: `1px solid ${EB.border}` }}>
              <th className="px-4 py-2.5 text-left font-medium">Setup</th><th className="px-4 py-2.5 text-right font-medium">Trades</th>
              <th className="px-4 py-2.5 text-right font-medium">Win rate</th><th className="px-4 py-2.5 text-right font-medium">Net P&L</th><th className="px-4 py-2.5 text-right font-medium">Avg / trade</th>
            </tr>
          </thead>
          <tbody>
            {bySetup.map((s) => (
              <tr key={s.setup} style={{ borderBottom: `1px solid ${EB.border}` }}>
                <td className="px-4 py-2.5 font-medium">{s.setup}</td>
                <td className="px-4 py-2.5 text-right">{s.n}</td>
                <td className="px-4 py-2.5 text-right">{fmtPct(s.wins / s.n)}</td>
                <td className="px-4 py-2.5 text-right font-medium" style={{ color: pnlColor(s.pnl) }}>{fmtMoney(s.pnl, { sign: true })}</td>
                <td className="px-4 py-2.5 text-right" style={{ color: pnlColor(s.pnl) }}>{fmtMoney(s.pnl / s.n, { sign: true })}</td>
              </tr>
            ))}
            {bySetup.length === 0 && <tr><td colSpan={5} className="p-8 text-center" style={{ color: EB.mutedForeground }}>Log some trades to see analytics.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsView({ trades, onChange, onOpenTrade }: { trades: Trade[]; onChange: () => Promise<Trade[]>; onOpenTrade: (t: Trade) => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>Broker connections and data hygiene.</p>
      </div>
      <Card>
        <BrokerConnections />
      </Card>
      <Card>
        <DuplicateTrades trades={trades} onChange={onChange} onOpenTrade={onOpenTrade} />
      </Card>
    </div>
  );
}

function DuplicateTrades({ trades, onChange, onOpenTrade }: { trades: Trade[]; onChange: () => Promise<Trade[]>; onOpenTrade: (t: Trade) => void }) {
  const groups = useMemo(() => findDuplicateGroups(trades), [trades]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const del = async (id: string) => {
    setDeletingId(id);
    const { error } = await sb.from("trades").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error(error.message); else { toast.success("Trade deleted."); onChange(); }
  };

  const keepFirst = async (group: Trade[]) => {
    const rest = group.slice(1);
    for (const t of rest) await sb.from("trades").delete().eq("id", t.id);
    toast.success(`Removed ${rest.length} duplicate${rest.length === 1 ? "" : "s"}.`);
    onChange();
  };

  const refreshAndCheck = async () => {
    setChecking(true);
    try {
      const fresh = await onChange();
      const freshGroups = findDuplicateGroups(fresh);
      if (freshGroups.length === 0) toast.success("Refreshed — no duplicates found.");
      else toast.warning(`Refreshed — found ${freshGroups.length} duplicate group${freshGroups.length === 1 ? "" : "s"}.`);
    } finally {
      setChecking(false);
    }
  };

  const deleteAllDupes = async () => {
    if (groups.length === 0) return;
    const totalExtra = groups.reduce((s, g) => s + g.length - 1, 0);
    if (!confirm(`Delete ${totalExtra} duplicate trade${totalExtra === 1 ? "" : "s"} across ${groups.length} group${groups.length === 1 ? "" : "s"}? Keeps one trade per group. This can't be undone.`)) return;
    setDeletingAll(true);
    try {
      for (const group of groups) {
        for (const t of group.slice(1)) await sb.from("trades").delete().eq("id", t.id);
      }
      toast.success(`Removed ${totalExtra} duplicate${totalExtra === 1 ? "" : "s"} across ${groups.length} group${groups.length === 1 ? "" : "s"}.`);
      onChange();
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium">Duplicate trades</h3>
        <div className="flex items-center gap-2">
          {groups.length > 0 && <span className="text-xs" style={{ color: EB.mutedForeground }}>{groups.length} group{groups.length === 1 ? "" : "s"}</span>}
          <Button size="sm" variant="outline" onClick={refreshAndCheck} disabled={checking} className="gap-1.5">
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Refresh & check
          </Button>
          <Button size="sm" variant="outline" onClick={deleteAllDupes} disabled={deletingAll || groups.length === 0} className="gap-1.5" style={{ color: EB.loss }}>
            {deletingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete all dupes
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs" style={{ color: EB.mutedForeground }}>
        Trades sharing the same pair, direction, size, entry price, and open minute — usually from re-importing a CSV or syncing overlapping broker history.
      </p>
      {groups.length === 0 ? (
        <div className="rounded-md p-4 text-sm" style={{ border: `1px dashed ${EB.border}`, color: EB.mutedForeground }}>No duplicates found.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <div key={i} className="rounded-md p-3" style={{ border: `1px solid ${EB.border}` }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">
                  {group[0].pair} <span className="text-xs uppercase" style={{ color: EB.mutedForeground }}>{group[0].direction}</span>
                  <span className="ml-2 text-xs" style={{ color: EB.mutedForeground }}>{group.length} copies</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => keepFirst(group)}>Keep 1, delete rest</Button>
              </div>
              <div className="space-y-1">
                {group.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs" style={{ background: EB.accent }}>
                    <button onClick={() => onOpenTrade(t)} className="flex-1 text-left">
                      {new Date(t.opened_at).toLocaleString()} · entry {t.entry_price} · size {t.size}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </button>
                    <button onClick={() => del(t.id)} disabled={deletingId === t.id} style={{ color: EB.mutedForeground }}>
                      {deletingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
