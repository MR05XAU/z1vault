import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  TrendingUp, LayoutDashboard, ListChecks, Upload, NotebookPen, BarChart3, Settings as SettingsIcon,
  LogOut, Menu, Trash2, Check, FileText, Loader2, RotateCcw, Calculator as CalcIcon,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from "recharts";
import { toast } from "sonner";
import { parseTradesCsv, parseCsvRows, detectDelimiter, stripBom } from "@/lib/csvImport";
import { dupeKey, findDuplicateGroups } from "@/lib/dupeDetection";
import { buzz } from "@/lib/fx";
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

type ChecklistItem = { rule: string; passed: boolean };
type ReviewAnswers = { whatWorked: string; whatDidnt: string; changeTomorrow: string } | null;
type Trade = {
  id: string; pair: string; direction: "long" | "short";
  entry_price: number; exit_price: number | null; size: number;
  pnl: number | null; fees: number | null;
  strategy_id: string | null; notes: string | null;
  opened_at: string; closed_at: string | null;
  setup: string | null; tags: string[] | null;
  stop_loss: number | null; take_profit: number | null;
  mfe_price: number | null; mae_price: number | null; excursion_computed_at: string | null;
  checklist: ChecklistItem[] | null;
  import_batch_id: string | null; planned_entry_price: number | null; commission_per_unit: number | null;
  premarket_plan: string | null; review_answers: ReviewAnswers; screenshot_url: string | null;
};
type Strategy = { id: string; name: string; color: string };
type JournalEntry = {
  id: string; entry_date: string; mood: string | null; market_notes: string | null; lessons: string | null;
  sleep_hours: number | null; screen_time_minutes: number | null;
};
type RiskSettings = { user_id: string; daily_loss_limit: number | null; max_trades_per_day: number | null; checklist_rules: string[] };

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

// $ per point/tick per contract for common CME futures roots — used to model
// commissions/costs correctly instead of treating futures like equities.
// Micro contracts share the root's multiplier family at 1/10th size.
const FUTURES_MULTIPLIER: Record<string, number> = {
  ES: 50, MES: 5, NQ: 20, MNQ: 2, YM: 5, MYM: 0.5, RTY: 50, M2K: 5,
  GC: 100, MGC: 10, SI: 5000, SIL: 1000, CL: 1000, MCL: 100, NG: 10000,
};
function futuresRoot(pair: string): string | null {
  const m = pair.toUpperCase().match(/^([A-Z0-9]+?)([FGHJKMNQUVXZ]\d{1,2})$/);
  return m ? m[1] : null;
}
function symbolMultiplier(pair: string): number {
  const root = futuresRoot(pair);
  return root ? (FUTURES_MULTIPLIER[root] ?? 1) : 1;
}
function slippagePoints(t: Trade): number | null {
  if (t.planned_entry_price == null) return null;
  return t.direction === "long" ? t.entry_price - t.planned_entry_price : t.planned_entry_price - t.entry_price;
}

export default function Journal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "new" | "calc">(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [quickLogParams, setQuickLogParams] = useSearchParams();

  // Hold the branded splash for a beat even if data loads instantly — a
  // sub-200ms flash reads as a glitch rather than a transition.
  const [splashHold, setSplashHold] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplashHold(false), 1500);
    return () => clearTimeout(t);
  }, []);
  const showSplash = loading || splashHold;

  // PWA home-screen shortcut ("Quick log a trade") lands on /journal?quicklog=1
  // — jump straight into the log-trade sheet instead of the dashboard.
  useEffect(() => {
    if (quickLogParams.get("quicklog") === "1") {
      setSheet("new");
      const next = new URLSearchParams(quickLogParams);
      next.delete("quicklog");
      setQuickLogParams(next, { replace: true });
    }
  }, []);

  const refresh = async (): Promise<Trade[]> => {
    if (!user) return [];
    const [t, s, r] = await Promise.all([
      sb.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
      sb.from("strategies").select("*").eq("user_id", user.id).order("name"),
      sb.from("risk_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const freshTrades = t.data ?? [];
    setTrades(freshTrades);
    setStrats(s.data ?? []);
    setRiskSettings(r.data ?? null);
    setLoading(false);
    return freshTrades;
  };
  useEffect(() => { refresh(); }, [user]);

  // Inserts a realistic set of sample trades so a new user's dashboard,
  // analytics, and charts aren't empty. Tagged demo:true for easy cleanup.
  const loadDemoData = async () => {
    if (!user) return;
    const now = Date.now();
    const H = 3600_000, D = 24 * H;
    const specs: [string, "long" | "short", number, number, number, number, number, string][] = [
      // pair, dir, entry, exit, size, daysAgoOpen, minsHeld, setup
      ["MNQU6", "long", 20000, 20040, 2, 9, 25, "ORB"],
      ["MNQU6", "short", 20120, 20150, 1, 8, 40, "VWAP reclaim"],
      ["MES U6".replace(" ", ""), "long", 5600, 5588, 1, 7, 18, "Breakout"],
      ["MGCQ6", "long", 4000, 4012, 2, 6, 55, "Trend pullback"],
      ["MGCQ6", "short", 4030, 4022, 1, 5, 30, "ORB"],
      ["AAPL", "long", 150, 157, 20, 4, 300, "Earnings drift"],
      ["MNQU6", "long", 20080, 20050, 2, 3, 15, "VWAP reclaim"],
      ["MES", "short", 5610, 5624, 1, 2, 20, "Fade"],
      ["MGCQ6", "long", 4010, 4028, 3, 1, 70, "Trend pullback"],
      ["MNQU6", "short", 20200, 20160, 1, 0, 35, "ORB"],
    ];
    const rows = specs.map(([pair, dir, entry, exit, size, daysAgo, mins, setup]) => {
      const mult = symbolMultiplier(pair);
      const pnl = Math.round((dir === "long" ? exit - entry : entry - exit) * size * mult * 100) / 100;
      const opened = new Date(now - daysAgo * D - 2 * H);
      return {
        user_id: user.id, pair, direction: dir, entry_price: entry, exit_price: exit, size,
        pnl, fees: 0, opened_at: opened.toISOString(), closed_at: new Date(opened.getTime() + mins * 60000).toISOString(),
        setup, tags: ["demo"], stop_loss: dir === "long" ? entry - Math.abs(entry - exit) : entry + Math.abs(entry - exit),
      };
    });
    const { error } = await sb.from("trades").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Loaded 10 sample trades.", { description: "Tagged 'demo' — delete them anytime from the Trades tab." });
    refresh();
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysTrades = trades.filter((t) => (t.closed_at ?? t.opened_at).slice(0, 10) === todayKey);
  const todaysPnl = todaysTrades.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const dailyLimitHit = riskSettings?.daily_loss_limit != null && todaysPnl <= -Math.abs(riskSettings.daily_loss_limit);
  const maxTradesHit = riskSettings?.max_trades_per_day != null && todaysTrades.length >= riskSettings.max_trades_per_day;
  const guardrailBlocked = dailyLimitHit || maxTradesHit;

  // Keyboard shortcut: N opens "log a trade", ignored while typing in a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n" && !sheet && !detailTrade) {
        e.preventDefault();
        if (guardrailBlocked) { toast.error("Blocked by today's risk guardrail."); return; }
        setSheet("new");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheet, detailTrade, guardrailBlocked]);

  return (
    // vault-bg (the site-wide radial mint-glow gradient) instead of Edgebook's
    // own flat slate, so the journal reads as part of the same app.
    <div className="min-h-screen vault-bg" style={{ color: EB.foreground }}>
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 md:flex md:flex-col" style={{ background: "hsl(220 10% 5% / 0.6)", backdropFilter: "blur(20px)", borderRight: `1px solid ${EB.sidebarBorder}` }}>
        <div className="flex h-16 items-center gap-2.5 px-5" style={{ borderBottom: `1px solid ${EB.sidebarBorder}` }}>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{ background: EB.primary, color: EB.primaryForeground }}><TrendingUp className="h-4 w-4" /></div>
          <div className="min-w-0">
            <div className="font-semibold leading-tight">Edgebook</div>
            <div className="truncate text-[10px] leading-tight" style={{ color: EB.mutedForeground }}>Your all-in-one journal</div>
          </div>
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
          <button onClick={() => setSheet("calc")}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors"
            style={{ color: EB.mutedForeground }}
          >
            <CalcIcon className="h-4 w-4" /> Calculator
          </button>
        </nav>
        <div className="p-3" style={{ borderTop: `1px solid ${EB.sidebarBorder}` }}>
          <div className="truncate px-3 py-1 text-xs" style={{ color: EB.mutedForeground }}>{user?.email}</div>
          <button onClick={() => nav("/vault")} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs" style={{ color: EB.mutedForeground }}>
            <LogOut className="h-3.5 w-3.5" /> Back to Vault
          </button>
          <div className="px-3 pt-1 text-[9px] tabular-nums" style={{ color: `${EB.mutedForeground}88` }}>build {__BUILD_ID__}</div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-4 md:hidden" style={{ borderBottom: `1px solid ${EB.border}`, background: "hsl(220 10% 5% / 0.7)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-2 font-semibold">
          <div className="grid h-6 w-6 place-items-center rounded" style={{ background: EB.primary, color: EB.primaryForeground }}><TrendingUp className="h-3.5 w-3.5" /></div>
          Edgebook
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSheet("calc")} className="grid h-8 w-8 place-items-center rounded-md" style={{ border: `1px solid ${EB.border}` }} title="Calculator">
            <CalcIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setMobileMenu((v) => !v)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs" style={{ border: `1px solid ${EB.border}` }}>
            <Menu className="h-3.5 w-3.5" /> Menu
          </button>
        </div>
      </header>
      {mobileMenu && (
        <div className="p-3 md:hidden" style={{ borderBottom: `1px solid ${EB.border}`, background: "hsl(220 10% 5% / 0.85)", backdropFilter: "blur(16px)" }}>
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
          <div className="pt-2 text-center text-[9px] tabular-nums" style={{ color: `${EB.mutedForeground}88` }}>build {__BUILD_ID__}</div>
        </div>
      )}

      <main className="md:pl-56">
        <SyncStatusBanner />
        {guardrailBlocked && (
          <div className="px-4 pt-4 md:px-8 md:pt-8">
            <div className="rounded-md px-4 py-2.5 text-sm font-medium" style={{ background: `${EB.destructive}22`, border: `1px solid ${EB.destructive}`, color: EB.destructive }}>
              {dailyLimitHit
                ? `Daily loss limit hit (${fmtMoney(todaysPnl, { sign: true })} today). New trades are blocked until tomorrow.`
                : `Max trades for today reached (${todaysTrades.length}/${riskSettings?.max_trades_per_day}). New trades are blocked until tomorrow.`}
            </div>
          </div>
        )}
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {showSplash ? (
            /* Branded splash while the journal loads (held ≥1.5s) */
            <div className="grid place-items-center py-32">
              <div className="flex flex-col items-center gap-3 animate-fade-up">
                <div className="grid h-12 w-12 place-items-center rounded-2xl animate-mint-pulse" style={{ background: EB.primary, color: EB.primaryForeground }}>
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-xl font-semibold tracking-tight">Edgebook</div>
                <div className="text-sm" style={{ color: EB.mutedForeground }}>Your all-in-one journal</div>
              </div>
            </div>
          ) : (
            /* key={view} remounts on section change so the fade-up transition
               replays when switching between Edgebook sections */
            <div key={view} className="animate-fade-up">
              {view === "dashboard" ? (
                <DashboardView trades={trades} onOpenTrade={setDetailTrade} onGoImport={() => setView("import")} onGoSettings={() => setView("settings")} onAdd={() => setSheet("new")} onOpenCalc={() => setSheet("calc")} onDemo={loadDemoData} />
              ) : view === "trades" ? (
                <TradesView
                  trades={trades} strats={strats} onOpenTrade={setDetailTrade} onChange={refresh}
                  onAdd={() => { if (guardrailBlocked) { toast.error("Blocked by today's risk guardrail."); return; } setSheet("new"); }}
                />
              ) : view === "import" ? (
                <ImportView user={user} strats={strats} trades={trades} onDone={refresh} />
              ) : view === "journal" ? (
                <JournalNotesView trades={trades} />
              ) : view === "analytics" ? (
                <AnalyticsView trades={trades} strats={strats} />
              ) : (
                <SettingsView trades={trades} riskSettings={riskSettings} onChange={refresh} onOpenTrade={setDetailTrade} />
              )}
            </div>
          )}
        </div>
      </main>

      <Sheet open={sheet === "new"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto" style={{ background: EB.card, borderColor: EB.border }}>
          <SheetHeader><SheetTitle style={{ color: EB.foreground }}>Log a trade</SheetTitle></SheetHeader>
          <TradeForm strats={strats} checklistRules={riskSettings?.checklist_rules ?? []} onSaved={() => { setSheet(null); refresh(); }} />
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "calc"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto" style={{ background: EB.card, borderColor: EB.border }}>
          <SheetHeader><SheetTitle style={{ color: EB.foreground }}>Trade calculator</SheetTitle></SheetHeader>
          <RRCalculator />
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

function SyncStatusBanner() {
  const { user } = useAuth();
  const [accountCount, setAccountCount] = useState(0);
  const [lastLog, setLastLog] = useState<{ finished_at: string | null; status: string; error: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    sb.from("brokerage_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }: any) => setAccountCount(count ?? 0));
    sb.from("broker_sync_log").select("finished_at, status, error").eq("user_id", user.id).order("started_at", { ascending: false }).limit(1)
      .then(({ data }: any) => setLastLog(data?.[0] ?? null));
  }, [user]);

  if (accountCount === 0) return null;
  const errored = lastLog?.status === "error";

  return (
    <div className="px-4 pt-4 md:px-8 md:pt-8">
      <div
        className="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
        style={errored ? { background: `${EB.destructive}15`, border: `1px solid ${EB.destructive}55`, color: EB.destructive } : { border: `1px solid ${EB.border}`, color: EB.mutedForeground }}
      >
        <span>
          {accountCount} broker account{accountCount === 1 ? "" : "s"} connected · last synced{" "}
          {lastLog?.finished_at ? new Date(lastLog.finished_at).toLocaleString() : "never"}
        </span>
        {errored && <span>Sync error: {lastLog?.error?.slice(0, 80) ?? "unknown"}</span>}
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Card({ children, className = "", ...rest }: any) {
  // Semi-transparent + blur so the site-wide vault gradient shows through,
  // matching the glass cards used across the rest of the app.
  return <div className={`rounded-md p-4 ${className}`} style={{ background: "hsl(220 10% 10% / 0.55)", backdropFilter: "blur(16px)", border: `1px solid ${EB.border}` }} {...rest}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs" style={{ color: EB.mutedForeground }}>{children}</div>;
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label>{label}</Label>{children}</div>;
}
function fieldStyle(): React.CSSProperties { return { background: EB.input, borderColor: EB.border, color: EB.foreground }; }

/* ---------- R:R / position-size calculator ---------- */
function RRCalculator() {
  const [v, setV] = useState({ symbol: "", entry: "", stop: "", target: "", account: "", riskPct: "1" });
  const entry = Number(v.entry) || 0, stop = Number(v.stop) || 0, target = Number(v.target) || 0;
  const account = Number(v.account) || 0, riskPct = Number(v.riskPct) || 0;
  const mult = symbolMultiplier(v.symbol.trim().toUpperCase() || "");
  const isLong = entry && stop ? stop < entry : true;
  const riskPts = entry && stop ? Math.abs(entry - stop) : 0;
  const rewardPts = entry && target ? Math.abs(target - entry) : 0;
  const rr = riskPts > 0 && rewardPts > 0 ? rewardPts / riskPts : null;
  const riskDollars = account && riskPct ? account * (riskPct / 100) : null;
  const perUnitRisk = riskPts * mult;
  const rawSize = riskDollars != null && perUnitRisk > 0 ? riskDollars / perUnitRisk : null;
  const contracts = rawSize != null ? Math.max(0, Math.floor(rawSize)) : null;
  const lossAtSize = contracts ? contracts * perUnitRisk : null;
  const gainAtSize = contracts ? contracts * rewardPts * mult : null;

  const stat = (label: string, value: string, color?: string) => (
    <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm" style={{ border: `1px solid ${EB.border}` }}>
      <span style={{ color: EB.mutedForeground }}>{label}</span>
      <span className="font-medium tabular-nums" style={color ? { color } : undefined}>{value}</span>
    </div>
  );

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 pb-6">
      <Field label="Symbol (for futures $/pt)" className="col-span-2">
        <Input value={v.symbol} onChange={(e) => setV({ ...v, symbol: e.target.value })} placeholder="MGCQ6, ES, AAPL… (blank = $1/pt)" style={fieldStyle()} />
      </Field>
      <Field label="Entry"><Input type="number" value={v.entry} onChange={(e) => setV({ ...v, entry: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Stop loss"><Input type="number" value={v.stop} onChange={(e) => setV({ ...v, stop: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Target"><Input type="number" value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Account size ($)"><Input type="number" value={v.account} onChange={(e) => setV({ ...v, account: e.target.value })} style={fieldStyle()} /></Field>
      <Field label="Risk per trade (%)" className="col-span-2">
        <Input type="number" step="0.25" value={v.riskPct} onChange={(e) => setV({ ...v, riskPct: e.target.value })} style={fieldStyle()} />
      </Field>

      <div className="col-span-2 space-y-2">
        {rr != null && stat("Risk : Reward", `1 : ${rr.toFixed(2)}`, rr >= 2 ? EB.win : rr >= 1 ? EB.warn : EB.loss)}
        {riskPts > 0 && stat("Direction (from stop)", isLong ? "Long" : "Short")}
        {riskPts > 0 && stat("Risk", `${riskPts.toFixed(2)} pts${mult !== 1 ? ` · ${fmtMoney(perUnitRisk)} /contract` : ""}`)}
        {riskDollars != null && stat("Max risk budget", fmtMoney(riskDollars))}
        {contracts != null && stat("Position size", `${contracts} ${mult !== 1 ? "contract" : "unit"}${contracts === 1 ? "" : "s"}${rawSize != null && rawSize < 1 ? " (risk > budget at 1)" : ""}`)}
        {lossAtSize != null && lossAtSize > 0 && stat("Loss if stopped", fmtMoney(-lossAtSize, { sign: true }), EB.loss)}
        {gainAtSize != null && gainAtSize > 0 && stat("Gain at target", fmtMoney(gainAtSize, { sign: true }), EB.win)}
        {rr == null && <p className="text-xs" style={{ color: EB.mutedForeground }}>Fill in entry, stop, and target to see R:R — add account size and risk % for position sizing.</p>}
      </div>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardView({ trades, onOpenTrade, onGoImport, onGoSettings, onAdd, onOpenCalc, onDemo }: { trades: Trade[]; onOpenTrade: (t: Trade) => void; onGoImport: () => void; onGoSettings: () => void; onAdd: () => void; onOpenCalc: () => void; onDemo: () => void }) {
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
        <button onClick={onOpenCalc} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium" style={{ border: `1px solid ${EB.border}`, color: EB.foreground }}>
          <CalcIcon className="h-3.5 w-3.5" /> Calculator
        </button>
      </div>

      {trades.length === 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="cursor-pointer transition-colors hover:border-mint" onClick={onGoImport} style={{ borderColor: EB.border }}>
              <div className="mb-1 text-sm font-medium">Import CSV</div>
              <p className="text-xs" style={{ color: EB.mutedForeground }}>Upload a broker export — we auto-detect the format.</p>
            </Card>
            <Card className="cursor-pointer transition-colors hover:border-mint" onClick={onGoSettings} style={{ borderColor: EB.border }}>
              <div className="mb-1 text-sm font-medium">Connect a broker</div>
              <p className="text-xs" style={{ color: EB.mutedForeground }}>SnapTrade, Tradovate, or Rithmic — auto-sync fills.</p>
            </Card>
            <Card className="cursor-pointer transition-colors hover:border-mint" onClick={onAdd} style={{ borderColor: EB.border }}>
              <div className="mb-1 text-sm font-medium">Log a trade manually</div>
              <p className="text-xs" style={{ color: EB.mutedForeground }}>Press <span className="font-mono">N</span> anywhere, or click here.</p>
            </Card>
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-3" style={{ borderColor: EB.primary, background: `${EB.primary}0f` }}>
            <div>
              <div className="text-sm font-medium">Just exploring?</div>
              <p className="text-xs" style={{ color: EB.mutedForeground }}>Load 10 sample trades to see the dashboard, analytics, and charts in action.</p>
            </div>
            <button onClick={onDemo} className="rounded-md px-3 py-2 text-xs font-medium" style={{ background: EB.primary, color: EB.primaryForeground }}>
              Try demo data
            </button>
          </Card>
        </div>
      )}

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

// Revenge-trade / tilt heuristic: an entry opened within 2 minutes of the
// prior trade closing at a loss, with size above the trader's average —
// bigger size right after a loss, in a hurry, is the classic tilt signature.
function detectTiltTradeIds(trades: Trade[]): Set<string> {
  const closed = trades.filter((t) => t.closed_at);
  if (closed.length < 2) return new Set();
  const avgSize = closed.reduce((a, t) => a + t.size, 0) / closed.length;
  const sorted = [...closed].sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());
  const tilted = new Set<string>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if ((prev.pnl ?? 0) >= 0) continue;
    const gapMs = new Date(cur.opened_at).getTime() - new Date(prev.closed_at!).getTime();
    if (gapMs >= 0 && gapMs < 2 * 60_000 && cur.size > avgSize) tilted.add(cur.id);
  }
  return tilted;
}

/* ---------- Trades ---------- */
function TradesView({ trades, strats, onOpenTrade, onChange, onAdd }: { trades: Trade[]; strats: Strategy[]; onOpenTrade: (t: Trade) => void; onChange: () => void; onAdd: () => void }) {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const side = (params.get("side") as "all" | "long" | "short") ?? "all";
  const stratFilter = params.get("playbook") ?? "all";
  const fromDate = params.get("from") ?? "";
  const toDate = params.get("to") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const tiltIds = useMemo(() => detectTiltTradeIds(trades), [trades]);
  const rows = useMemo(() => trades.filter((t) => {
    if (side !== "all" && t.direction !== side) return false;
    if (stratFilter !== "all" && t.strategy_id !== stratFilter) return false;
    if (fromDate && (t.closed_at ?? t.opened_at).slice(0, 10) < fromDate) return false;
    if (toDate && (t.closed_at ?? t.opened_at).slice(0, 10) > toDate) return false;
    if (q && !`${t.pair} ${t.setup ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [trades, q, side, stratFilter, fromDate, toDate]);

  const dayGroups = useMemo(() => {
    const m = new Map<string, Trade[]>();
    for (const t of rows) {
      const key = (t.closed_at ?? t.opened_at).slice(0, 10);
      (m.get(key) ?? m.set(key, []).get(key)!).push(t);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayTrades]) => {
        const net = dayTrades.reduce((a, t) => a + (t.pnl ?? 0), 0);
        const wins = dayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
        const closedCount = dayTrades.filter((t) => t.pnl != null).length;
        return { date, trades: dayTrades, net, wins, closedCount };
      });
  }, [rows]);

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    const { error } = await sb.from("trades").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };

  const [nlQuery, setNlQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const runNlFilter = async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const { data, error } = await supabase.functions.invoke("nl-trade-filter", {
      body: { query: nlQuery },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    setNlLoading(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Couldn't parse that."); return; }
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(data.filter ?? {})) if (v) next.set(k, String(v));
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
          <p className="text-sm" style={{ color: EB.mutedForeground }}>{rows.length} of {trades.length}</p>
        </div>
        <Button onClick={onAdd} style={{ background: EB.primary, color: EB.primaryForeground }}>Add trade <span className="ml-1.5 text-[10px] opacity-60">(N)</span></Button>
      </div>

      <Card>
        <div className="flex gap-2">
          <Input
            value={nlQuery} onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runNlFilter()}
            placeholder='Ask in plain English — "short NQ losses over 2R this month"'
            style={fieldStyle()}
          />
          <Button onClick={runNlFilter} disabled={nlLoading} variant="outline" className="shrink-0">{nlLoading ? "Thinking…" : "Ask"}</Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setFilter("q", e.target.value)} placeholder="Search symbol, setup, tag…" className="max-w-xs" style={fieldStyle()} />
          {(["all", "long", "short"] as const).map((s) => (
            <button key={s} onClick={() => setFilter("side", s)} className="rounded-md px-3 py-1.5 text-xs capitalize"
              style={side === s ? { background: EB.primary, color: EB.primaryForeground } : { border: `1px solid ${EB.border}`, color: EB.mutedForeground }}>{s}</button>
          ))}
          <select value={stratFilter} onChange={(e) => setFilter("playbook", e.target.value)} className="h-9 rounded-md px-2 text-xs" style={fieldStyle()}>
            <option value="all">All playbooks</option>
            {strats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input type="date" value={fromDate} onChange={(e) => setFilter("from", e.target.value)} className="w-36" style={fieldStyle()} />
          <span className="text-xs" style={{ color: EB.mutedForeground }}>to</span>
          <Input type="date" value={toDate} onChange={(e) => setFilter("to", e.target.value)} className="w-36" style={fieldStyle()} />
          {(q || side !== "all" || stratFilter !== "all" || fromDate || toDate) && (
            <button onClick={() => setParams({}, { replace: true })} className="text-xs" style={{ color: EB.primary }}>Clear filters</button>
          )}
        </div>
      </Card>

      {dayGroups.length === 0 ? (
        <Card className="p-8 text-center text-sm" style={{ color: EB.mutedForeground }}>No trades match your filters.</Card>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((day) => (
            <Card key={day.date} className="overflow-x-auto p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${EB.border}`, background: EB.accent }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  <span className="text-xs font-normal" style={{ color: EB.mutedForeground }}>
                    {day.trades.length} trade{day.trades.length === 1 ? "" : "s"}
                    {day.closedCount > 0 && ` · ${fmtPct(day.wins / day.closedCount)} win rate`}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: pnlColor(day.net) }}>{fmtMoney(day.net, { sign: true })}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase" style={{ color: EB.mutedForeground }}>
                  <tr style={{ borderBottom: `1px solid ${EB.border}` }}>
                    {["Time", "Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "Setup", "Tags", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {day.trades.map((t) => {
                    const strat = strats.find((s) => s.id === t.strategy_id);
                    return (
                      <tr key={t.id} onClick={() => onOpenTrade(t)} className="cursor-pointer" style={{ borderBottom: `1px solid ${EB.border}` }}>
                        <td className="px-3 py-2.5" style={{ color: EB.mutedForeground }}>{new Date(t.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-3 py-2.5 font-medium">
                          {t.pair}
                          {strat && <span className="ml-1.5 rounded px-1 py-px text-[10px]" style={{ background: strat.color + "33", color: strat.color }}>{strat.name}</span>}
                          {tiltIds.has(t.id) && (
                            <span className="ml-1.5 rounded px-1 py-px text-[10px]" style={{ background: `${EB.warn}33`, color: EB.warn }} title="Opened <2min after a loss, above-average size">Tilt</span>
                          )}
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
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TradeForm({ strats, checklistRules, onSaved }: { strats: Strategy[]; checklistRules: string[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<any>({
    pair: "", direction: "long", entry_price: "", exit_price: "", size: "",
    fees: "0", strategy_id: "", notes: "", setup: "", tags: "", stop_loss: "", take_profit: "",
    opened_at: new Date().toISOString().slice(0, 16), closed_at: "",
    planned_entry_price: "", commission_per_unit: "",
  });
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => checklistRules.map((rule) => ({ rule, passed: false })));

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
      checklist,
      planned_entry_price: v.planned_entry_price ? Number(v.planned_entry_price) : null,
      commission_per_unit: v.commission_per_unit ? Number(v.commission_per_unit) : null,
    };
    const { error } = await sb.from("trades").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Trade logged."); buzz(15); onSaved(); }
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
      <Field label="Planned entry (slippage)"><Input type="number" value={v.planned_entry_price} onChange={(e) => setV({ ...v, planned_entry_price: e.target.value })} placeholder="Price you intended to get filled at" style={fieldStyle()} /></Field>
      <Field label="Commission / contract ($)"><Input type="number" value={v.commission_per_unit} onChange={(e) => setV({ ...v, commission_per_unit: e.target.value })} placeholder={symbolMultiplier(v.pair) !== 1 ? `Typical: ${symbolMultiplier(v.pair)}pt = $${symbolMultiplier(v.pair)}` : "e.g. 2.50"} style={fieldStyle()} /></Field>
      <Field label="Setup" className="col-span-2"><Input value={v.setup} onChange={(e) => setV({ ...v, setup: e.target.value })} placeholder="Breakout, VWAP reclaim…" style={fieldStyle()} /></Field>
      <Field label="Tags (comma separated)" className="col-span-2"><Input value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} placeholder="momentum, gap-up" style={fieldStyle()} /></Field>
      <Field label="Notes" className="col-span-2"><Textarea rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} style={fieldStyle()} /></Field>
      {checklist.length > 0 && (
        <div className="col-span-2 space-y-1.5 rounded-md p-3" style={{ border: `1px solid ${EB.border}` }}>
          <div className="mb-1 text-xs" style={{ color: EB.mutedForeground }}>Pre-trade checklist</div>
          {checklist.map((item, i) => (
            <label key={item.rule} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox" checked={item.passed}
                onChange={(e) => setChecklist((c) => c.map((x, xi) => (xi === i ? { ...x, passed: e.target.checked } : x)))}
              />
              {item.rule}
            </label>
          ))}
        </div>
      )}
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
  const { user } = useAuth();
  const strat = strats.find((s) => s.id === trade.strategy_id);
  const [setup, setSetup] = useState(trade.setup ?? "");
  const [tags, setTags] = useState((trade.tags ?? []).join(", "));
  const [stopLoss, setStopLoss] = useState(trade.stop_loss?.toString() ?? "");
  const [takeProfit, setTakeProfit] = useState(trade.take_profit?.toString() ?? "");
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(true);
  const [computingExcursion, setComputingExcursion] = useState(false);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [review, setReview] = useState<ReviewAnswers>(trade.review_answers ?? { whatWorked: "", whatDidnt: "", changeTomorrow: "" });
  const [savingReview, setSavingReview] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
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
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, to] of Object.entries(payload)) {
      const from = (trade as any)[key];
      const changed = Array.isArray(to) ? JSON.stringify(to) !== JSON.stringify(from) : to !== from;
      if (changed) changes[key] = { from, to };
    }
    const { data, error } = await sb.from("trades").update(payload).eq("id", trade.id).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (Object.keys(changes).length > 0 && user) {
      await sb.from("trade_edits").insert({ trade_id: trade.id, user_id: user.id, changes });
    }
    toast.success("Trade updated.");
    onChange(data as Trade);
  };

  const uploadScreenshot = async (file: File) => {
    if (!user) return;
    setUploadingShot(true);
    const path = `${user.id}/${trade.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: true });
    if (upErr) { setUploadingShot(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
    const { data, error } = await sb.from("trades").update({ screenshot_url: pub.publicUrl }).eq("id", trade.id).select().single();
    setUploadingShot(false);
    if (error) toast.error(error.message); else { toast.success("Screenshot attached."); onChange(data as Trade); }
  };

  const saveReview = async () => {
    setSavingReview(true);
    const { data, error } = await sb.from("trades").update({ review_answers: review }).eq("id", trade.id).select().single();
    setSavingReview(false);
    if (error) toast.error(error.message); else { toast.success("Review saved."); onChange(data as Trade); }
  };

  const shareAsImage = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shareRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${trade.pair}-${trade.opened_at.slice(0, 10)}.png`;
      a.click();
    } catch (e) {
      toast.error("Couldn't generate image.");
    }
    setSharing(false);
  };

  const computeExcursion = async () => {
    setComputingExcursion(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const { data, error } = await supabase.functions.invoke("compute-excursion", {
      body: { tradeId: trade.id },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    setComputingExcursion(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Couldn't compute MFE/MAE."); return; }
    const { data: fresh } = await sb.from("trades").select("*").eq("id", trade.id).single();
    if (fresh) onChange(fresh as Trade);
    toast.success("MFE/MAE computed.");
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
        <TradingViewChart symbol={trade.pair} interval={liveInterval} height="clamp(300px, 48vh, 560px)" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Entry", trade.entry_price], ["Exit", trade.exit_price ?? "—"], ["Size", trade.size]].map(([label, value]) => (
          <Card key={label as string} className="p-2">
            <div className="text-[9px] uppercase tracking-wide" style={{ color: EB.mutedForeground }}>{label}</div>
            <div className="text-sm font-medium mt-0.5">{value}</div>
          </Card>
        ))}
      </div>

      {trade.closed_at && (
        <div className="flex items-center gap-3">
          {trade.mfe_price != null && trade.mae_price != null ? (
            <div className="grid flex-1 grid-cols-2 gap-2 text-center">
              <Card className="p-2">
                <div className="text-[9px] uppercase tracking-wide" style={{ color: EB.mutedForeground }}>MFE (best)</div>
                <div className="text-sm font-medium mt-0.5" style={{ color: EB.win }}>{trade.mfe_price}</div>
              </Card>
              <Card className="p-2">
                <div className="text-[9px] uppercase tracking-wide" style={{ color: EB.mutedForeground }}>MAE (worst)</div>
                <div className="text-sm font-medium mt-0.5" style={{ color: EB.loss }}>{trade.mae_price}</div>
              </Card>
            </div>
          ) : (
            <button onClick={computeExcursion} disabled={computingExcursion} className="flex items-center gap-1.5 text-[11px]" style={{ color: EB.primary }}>
              {computingExcursion && <Loader2 className="size-3 animate-spin" />}
              Compute MFE/MAE (best/worst price during trade)
            </button>
          )}
        </div>
      )}

      <button onClick={() => setShowSnapshot((s) => !s)} className="text-[11px]" style={{ color: EB.primary }}>
        {showSnapshot ? "Hide price snapshot" : "Show price snapshot (entry/exit markers)"}
      </button>
      {showSnapshot && (
        <TradeSnapshotChart symbol={trade.pair} direction={trade.direction} openedAt={trade.opened_at} closedAt={trade.closed_at} entryPrice={trade.entry_price} exitPrice={trade.exit_price} height="clamp(260px, 38vh, 460px)" />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Stop loss"><Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} style={fieldStyle()} /></Field>
        <Field label="Take profit"><Input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} style={fieldStyle()} /></Field>
      </div>
      <Field label="Setup"><Input value={setup} onChange={(e) => setSetup(e.target.value)} style={fieldStyle()} /></Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label>Tags (comma separated)</Label>
          <button
            onClick={async () => {
              setSuggestingTags(true);
              const { data: sess } = await supabase.auth.getSession();
              const token = sess.session?.access_token;
              const { data, error } = await supabase.functions.invoke("suggest-trade-tags", {
                body: { notes, setup, pair: trade.pair, direction: trade.direction },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              setSuggestingTags(false);
              if (error || data?.error || !data?.tags?.length) { toast.error(data?.error ?? error?.message ?? "No suggestions."); return; }
              setTags((t) => Array.from(new Set([...t.split(",").map((s: string) => s.trim()).filter(Boolean), ...data.tags])).join(", "));
            }}
            disabled={suggestingTags}
            className="text-[11px]" style={{ color: EB.primary }}
          >
            {suggestingTags ? "Suggesting…" : "Suggest tags (AI)"}
          </button>
        </div>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} style={fieldStyle()} />
      </div>
      <Field label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldStyle()} /></Field>

      <div>
        <Label>Screenshot</Label>
        {trade.screenshot_url && <img src={trade.screenshot_url} alt="Trade screenshot" className="mb-2 max-h-64 w-full rounded-md object-contain" style={{ border: `1px solid ${EB.border}` }} />}
        <input
          type="file" accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadScreenshot(f); }}
          disabled={uploadingShot}
          className="text-xs"
        />
        {uploadingShot && <span className="ml-2 text-xs" style={{ color: EB.mutedForeground }}>Uploading…</span>}
      </div>

      {trade.closed_at && (
        <div className="space-y-2 rounded-md p-3" style={{ border: `1px solid ${EB.border}` }}>
          <div className="text-xs" style={{ color: EB.mutedForeground }}>Post-trade review</div>
          <Field label="What worked?"><Textarea rows={2} value={review?.whatWorked ?? ""} onChange={(e) => setReview((r) => ({ ...(r ?? { whatWorked: "", whatDidnt: "", changeTomorrow: "" }), whatWorked: e.target.value }))} style={fieldStyle()} /></Field>
          <Field label="What didn't?"><Textarea rows={2} value={review?.whatDidnt ?? ""} onChange={(e) => setReview((r) => ({ ...(r ?? { whatWorked: "", whatDidnt: "", changeTomorrow: "" }), whatDidnt: e.target.value }))} style={fieldStyle()} /></Field>
          <Field label="Change tomorrow?"><Textarea rows={2} value={review?.changeTomorrow ?? ""} onChange={(e) => setReview((r) => ({ ...(r ?? { whatWorked: "", whatDidnt: "", changeTomorrow: "" }), changeTomorrow: e.target.value }))} style={fieldStyle()} /></Field>
          <Button onClick={saveReview} disabled={savingReview} variant="outline" className="h-9 text-xs">{savingReview ? "Saving…" : "Save review"}</Button>
        </div>
      )}

      {/* Off-screen share card — captured to PNG, not part of the visible layout */}
      <div style={{ position: "fixed", left: -9999, top: 0 }}>
        <div ref={shareRef} className="w-[420px] p-6" style={{ background: EB.card, color: EB.foreground, fontFamily: "system-ui" }}>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-lg font-semibold">{trade.pair}</div>
            <div className="text-xs uppercase" style={{ color: EB.mutedForeground }}>{trade.direction}</div>
          </div>
          <div className="mb-4 text-2xl font-bold" style={{ color: pnlColor(trade.pnl) }}>{trade.pnl != null ? fmtMoney(trade.pnl, { sign: true }) : "Open"}</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><div style={{ color: EB.mutedForeground }}>Entry</div><div className="font-medium">{trade.entry_price}</div></div>
            <div><div style={{ color: EB.mutedForeground }}>Exit</div><div className="font-medium">{trade.exit_price ?? "—"}</div></div>
            <div><div style={{ color: EB.mutedForeground }}>Size</div><div className="font-medium">{trade.size}</div></div>
          </div>
          <div className="mt-4 text-[10px]" style={{ color: EB.mutedForeground }}>{new Date(trade.opened_at).toLocaleDateString()} · Edgebook</div>
        </div>
      </div>
      <Button onClick={shareAsImage} disabled={sharing} variant="outline" className="h-9 w-full text-xs">
        {sharing ? "Generating…" : "Share as image"}
      </Button>

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
  const [lastBatch, setLastBatch] = useState<{ id: string; count: number } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const undoLastImport = async () => {
    if (!lastBatch) return;
    if (!confirm(`Delete ${lastBatch.count} trade(s) from that import?`)) return;
    setUndoing(true);
    const { error } = await sb.from("trades").delete().eq("import_batch_id", lastBatch.id);
    setUndoing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Import undone.");
    setLastBatch(null);
    onDone();
  };

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
      const { data: batch, error: batchErr } = await sb.from("import_batches").insert({ user_id: user.id, filename: fileName, row_count: payload.length }).select().single();
      if (batchErr) throw batchErr;
      const { error } = await sb.from("trades").insert(payload.map((t) => ({ ...t, import_batch_id: batch.id })));
      if (error) throw error;
      toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}${dupes ? ` (skipped ${dupes} likely duplicate${dupes === 1 ? "" : "s"})` : ""}.`);
      setLastBatch({ id: batch.id, count: payload.length });
      setPending(null); setFileName(""); onDone();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import trades</h1>
          <p className="text-sm" style={{ color: EB.mutedForeground }}>Upload a CSV — we'll auto-detect the format.</p>
        </div>
        {lastBatch && (
          <Button variant="outline" size="sm" onClick={undoLastImport} disabled={undoing} className="gap-1.5" style={{ color: EB.destructive }}>
            <Trash2 className="h-3.5 w-3.5" /> {undoing ? "Undoing…" : `Undo last import (${lastBatch.count})`}
          </Button>
        )}
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
            const { data: batch, error: batchErr } = await sb.from("import_batches").insert({ user_id: user.id, filename: fileName, row_count: payload.length }).select().single();
            if (batchErr) { toast.error(batchErr.message); return; }
            const { error } = await sb.from("trades").insert(payload.map((t) => ({ ...t, import_batch_id: batch.id })));
            if (error) { toast.error(error.message); return; }
            toast.success(`Imported ${payload.length} trade${payload.length === 1 ? "" : "s"}${dupes ? ` (skipped ${dupes} likely duplicate${dupes === 1 ? "" : "s"})` : ""}.`);
            setLastBatch({ id: batch.id, count: payload.length });
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
function JournalNotesView({ trades }: { trades: Trade[] }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [screenTime, setScreenTime] = useState("");
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
    setSleepHours(e?.sleep_hours?.toString() ?? ""); setScreenTime(e?.screen_time_minutes?.toString() ?? "");
  };
  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await sb.from("journal_entries").upsert(
      {
        user_id: user.id, entry_date: date, mood: mood || null, market_notes: notes || null, lessons: lessons || null,
        sleep_hours: sleepHours ? Number(sleepHours) : null, screen_time_minutes: screenTime ? Number(screenTime) : null,
      },
      { onConflict: "user_id,entry_date" },
    );
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Journal saved"); refresh(); }
  };

  const dailyPnl = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trades) {
      if (t.pnl == null) continue;
      const key = (t.closed_at ?? t.opened_at).slice(0, 10);
      m.set(key, (m.get(key) ?? 0) + t.pnl);
    }
    return m;
  }, [trades]);

  const moodCorrelation = useMemo(() => {
    const m = new Map<string, { mood: string; pnl: number; n: number }>();
    for (const e of entries) {
      if (!e.mood || !dailyPnl.has(e.entry_date)) continue;
      const row = m.get(e.mood) ?? { mood: e.mood, pnl: 0, n: 0 };
      row.pnl += dailyPnl.get(e.entry_date)!; row.n += 1;
      m.set(e.mood, row);
    }
    return Array.from(m.values()).sort((a, b) => b.pnl / b.n - a.pnl / a.n);
  }, [entries, dailyPnl]);

  const sleepCorrelation = useMemo(() => {
    const buckets = [
      { label: "<5h", min: 0, max: 5, pnl: 0, n: 0 },
      { label: "5-7h", min: 5, max: 7, pnl: 0, n: 0 },
      { label: "7-8h", min: 7, max: 8, pnl: 0, n: 0 },
      { label: ">8h", min: 8, max: Infinity, pnl: 0, n: 0 },
    ];
    for (const e of entries) {
      if (e.sleep_hours == null || !dailyPnl.has(e.entry_date)) continue;
      const b = buckets.find((b) => e.sleep_hours! >= b.min && e.sleep_hours! < b.max) ?? buckets[buckets.length - 1];
      b.pnl += dailyPnl.get(e.entry_date)!; b.n += 1;
    }
    return buckets.filter((b) => b.n > 0);
  }, [entries, dailyPnl]);

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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sleep (hours)"><Input type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="7.5" style={fieldStyle()} /></Field>
            <Field label="Screen time before trading (min)"><Input type="number" value={screenTime} onChange={(e) => setScreenTime(e.target.value)} placeholder="30" style={fieldStyle()} /></Field>
          </div>
          <Field label="Market notes"><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the market do today? Levels, catalysts, plan…" style={fieldStyle()} /></Field>
          <Field label="Lessons"><Textarea rows={5} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What worked, what didn't, what to change tomorrow." style={fieldStyle()} /></Field>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} style={{ background: EB.primary, color: EB.primaryForeground }}>{saving ? "Saving…" : "Save entry"}</Button>
          </div>
        </Card>
      </div>

      {(moodCorrelation.length > 0 || sleepCorrelation.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {moodCorrelation.length > 0 && (
            <Card className="overflow-x-auto">
              <h3 className="mb-3 text-sm font-medium">P&L by mood</h3>
              <table className="w-full text-sm">
                <tbody>
                  {moodCorrelation.map((m) => (
                    <tr key={m.mood} style={{ borderBottom: `1px solid ${EB.border}` }}>
                      <td className="py-2">{m.mood}</td>
                      <td className="py-2 text-right" style={{ color: EB.mutedForeground }}>{m.n} day{m.n === 1 ? "" : "s"}</td>
                      <td className="py-2 text-right font-medium" style={{ color: pnlColor(m.pnl / m.n) }}>{fmtMoney(m.pnl / m.n, { sign: true })}/day</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {sleepCorrelation.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-medium">P&L by sleep the night before</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={sleepCorrelation}>
                    <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: EB.mutedForeground, fontSize: 11 }} />
                    <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v: any, _n, p: any) => [fmtMoney(v / p.payload.n, { sign: true }) + "/day", "Avg P&L"]} />
                    <Bar dataKey="pnl" isAnimationActive={false}>{sleepCorrelation.map((b, i) => <Cell key={i} fill={b.pnl >= 0 ? EB.win : EB.loss} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Analytics ---------- */
function computeR(t: Trade): number | null {
  if (t.stop_loss == null || t.exit_price == null) return null;
  const risk = Math.abs(t.entry_price - t.stop_loss);
  if (risk === 0) return null;
  const move = t.direction === "long" ? t.exit_price - t.entry_price : t.entry_price - t.exit_price;
  return move / risk;
}

function durationBucket(ms: number): string {
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  if (ms < 15 * MIN) return "Scalp (<15m)";
  if (ms < 4 * HOUR) return "Intraday (15m–4h)";
  if (ms < 2 * DAY) return "Swing (4h–2d)";
  return "Position (>2d)";
}

function CoachReportCard() {
  const { user } = useAuth();
  const [report, setReport] = useState<{ content: string; period_start: string; period_end: string; created_at: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    sb.from("coach_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)
      .then(({ data }: any) => { setReport(data?.[0] ?? null); setLoaded(true); });
  }, [user]);

  const generate = async () => {
    setGenerating(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const { data, error } = await supabase.functions.invoke("weekly-coach-report", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    setGenerating(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Couldn't generate report."); return; }
    setReport(data.report);
    toast.success("Coach report generated.");
  };

  if (!loaded) return null;
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Weekly coach report</h3>
        <Button onClick={generate} disabled={generating} variant="outline" size="sm" className="h-8 text-xs">
          {generating ? "Generating…" : "Generate new report"}
        </Button>
      </div>
      {report ? (
        <>
          <p className="mb-1 text-[10px] uppercase" style={{ color: EB.mutedForeground }}>{report.period_start} – {report.period_end}</p>
          <p className="whitespace-pre-wrap text-sm">{report.content}</p>
        </>
      ) : (
        <p className="text-xs" style={{ color: EB.mutedForeground }}>No report yet — generate one from your last 7 days of trades.</p>
      )}
    </Card>
  );
}

function AnalyticsView({ trades, strats }: { trades: Trade[]; strats: Strategy[] }) {
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

  const byPlaybook = useMemo(() => {
    const m = new Map<string, { name: string; color: string; pnl: number; n: number; wins: number; rSum: number; rN: number }>();
    for (const t of closed) {
      const strat = strats.find((s) => s.id === t.strategy_id);
      const key = strat?.id ?? "none";
      const row = m.get(key) ?? { name: strat?.name ?? "No playbook", color: strat?.color ?? EB.mutedForeground, pnl: 0, n: 0, wins: 0, rSum: 0, rN: 0 };
      row.pnl += t.pnl ?? 0; row.n += 1; if ((t.pnl ?? 0) > 0) row.wins += 1;
      const r = computeR(t);
      if (r != null) { row.rSum += r; row.rN += 1; }
      m.set(key, row);
    }
    return Array.from(m.values()).sort((a, b) => b.pnl - a.pnl);
  }, [closed, strats]);

  const rStats = useMemo(() => {
    const rValues = closed.map(computeR).filter((r): r is number => r != null);
    const buckets = [
      { label: "<-2R", min: -Infinity, max: -2, n: 0 },
      { label: "-2..-1R", min: -2, max: -1, n: 0 },
      { label: "-1..0R", min: -1, max: 0, n: 0 },
      { label: "0..1R", min: 0, max: 1, n: 0 },
      { label: "1..2R", min: 1, max: 2, n: 0 },
      { label: "2..3R", min: 2, max: 3, n: 0 },
      { label: ">3R", min: 3, max: Infinity, n: 0 },
    ];
    for (const r of rValues) {
      const b = buckets.find((b) => r >= b.min && r < b.max) ?? buckets[buckets.length - 1];
      b.n += 1;
    }
    const expectancy = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
    return { buckets, expectancy, n: rValues.length };
  }, [closed]);

  const calendar = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const t of closed) {
      const d = new Date(t.closed_at ?? t.opened_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      byDay.set(key, (byDay.get(key) ?? 0) + (t.pnl ?? 0));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // 12 weeks back
    const startSunday = new Date(start);
    startSunday.setDate(startSunday.getDate() - startSunday.getDay());
    const days: { date: Date; pnl: number | null }[] = [];
    for (let i = 0; i < 91; i++) {
      const d = new Date(startSunday);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({ date: d, pnl: d > today ? null : byDay.get(key) ?? 0 });
    }
    const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl ?? 0)));
    return { days, maxAbs };
  }, [closed]);

  const timeOfDay = useMemo(() => {
    const grid: { hour: number; dow: number; pnl: number; n: number }[][] = Array.from({ length: 7 }, (_, dow) =>
      Array.from({ length: 24 }, (_, hour) => ({ hour, dow, pnl: 0, n: 0 })),
    );
    for (const t of closed) {
      const d = new Date(t.opened_at);
      grid[d.getDay()][d.getHours()].pnl += t.pnl ?? 0;
      grid[d.getDay()][d.getHours()].n += 1;
    }
    const maxAbs = Math.max(1, ...grid.flat().map((c) => (c.n ? Math.abs(c.pnl / c.n) : 0)));
    return { grid, maxAbs };
  }, [closed]);

  const holdBuckets = useMemo(() => {
    const m = new Map<string, { bucket: string; n: number; wins: number; pnl: number }>();
    for (const t of closed) {
      if (!t.closed_at) continue;
      const ms = new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime();
      const key = durationBucket(ms);
      const row = m.get(key) ?? { bucket: key, n: 0, wins: 0, pnl: 0 };
      row.n += 1; if ((t.pnl ?? 0) > 0) row.wins += 1; row.pnl += t.pnl ?? 0;
      m.set(key, row);
    }
    const order = ["Scalp (<15m)", "Intraday (15m–4h)", "Swing (4h–2d)", "Position (>2d)"];
    return order.map((b) => m.get(b)).filter((r): r is NonNullable<typeof r> => !!r);
  }, [closed]);

  const discipline = useMemo(() => {
    const withChecklist = closed.filter((t) => t.checklist && t.checklist.length > 0);
    if (withChecklist.length === 0) return null;
    const scores = withChecklist.map((t) => t.checklist!.filter((c) => c.passed).length / t.checklist!.length);
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Weekly trend so a slipping discipline score is visible before it shows up in P&L.
    const byWeek = new Map<string, number[]>();
    for (const t of withChecklist) {
      const d = new Date(t.opened_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      const score = t.checklist!.filter((c) => c.passed).length / t.checklist!.length;
      (byWeek.get(key) ?? byWeek.set(key, []).get(key)!).push(score);
    }
    const trend = Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, scores]) => ({ week: week.slice(5), score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) }));
    return { overall, trend, n: withChecklist.length };
  }, [closed]);

  const tiltCount = useMemo(() => detectTiltTradeIds(trades).size, [trades]);

  const symbolConcentration = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of closed) m.set(t.pair, (m.get(t.pair) ?? 0) + 1);
    const palette = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];
    return Array.from(m.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([symbol, n], i) => ({ symbol, n, fill: palette[i % palette.length] }));
  }, [closed]);

  const drawdownCurve = useMemo(() => {
    const sorted = [...closed].sort((a, b) => new Date(a.closed_at ?? a.opened_at).getTime() - new Date(b.closed_at ?? b.opened_at).getTime());
    let equity = 0, peak = 0;
    return sorted.map((t, i) => {
      equity += t.pnl ?? 0;
      peak = Math.max(peak, equity);
      return { i, equity, drawdown: equity - peak };
    });
  }, [closed]);

  const slippageReport = useMemo(() => {
    const withPlan = closed.filter((t) => t.planned_entry_price != null);
    if (withPlan.length === 0) return null;
    const points = withPlan.map(slippagePoints).filter((s): s is number => s != null);
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const worst = Math.min(...points);
    return { n: points.length, avg, worst };
  }, [closed]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>Where your edge comes from — and where it leaks.</p>
      </div>

      {(discipline || tiltCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {discipline && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Discipline score</h3>
                <span className="text-lg font-semibold" style={{ color: discipline.overall >= 0.8 ? EB.win : discipline.overall >= 0.5 ? EB.warn : EB.loss }}>
                  {Math.round(discipline.overall * 100)}%
                </span>
              </div>
              <p className="mb-2 text-xs" style={{ color: EB.mutedForeground }}>Checklist pass rate across {discipline.n} trades, by week.</p>
              <div className="h-32">
                <ResponsiveContainer>
                  <BarChart data={discipline.trend}>
                    <XAxis dataKey="week" tick={{ fill: EB.mutedForeground, fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: EB.mutedForeground, fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Pass rate"]} />
                    <Bar dataKey="score" isAnimationActive={false}>{discipline.trend.map((d, i) => <Cell key={i} fill={d.score >= 80 ? EB.win : d.score >= 50 ? EB.warn : EB.loss} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {tiltCount > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-medium">Tilt trades</h3>
              <div className="text-2xl font-semibold" style={{ color: EB.loss }}>{tiltCount}</div>
              <p className="mt-1 text-xs" style={{ color: EB.mutedForeground }}>Entries opened &lt;2 minutes after a loss, at above-average size. Flagged in the Trades tab.</p>
            </Card>
          )}
        </div>
      )}

      <CoachReportCard />

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

      <Card className="overflow-x-auto p-0">
        <div className="p-4 text-sm font-medium" style={{ borderBottom: `1px solid ${EB.border}` }}>Playbook performance</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase" style={{ color: EB.mutedForeground }}>
            <tr style={{ borderBottom: `1px solid ${EB.border}` }}>
              <th className="px-4 py-2.5 text-left font-medium">Playbook</th><th className="px-4 py-2.5 text-right font-medium">Trades</th>
              <th className="px-4 py-2.5 text-right font-medium">Win rate</th><th className="px-4 py-2.5 text-right font-medium">Avg R</th>
              <th className="px-4 py-2.5 text-right font-medium">Net P&L</th><th className="px-4 py-2.5 text-right font-medium">Expectancy</th>
            </tr>
          </thead>
          <tbody>
            {byPlaybook.map((p) => (
              <tr key={p.name} style={{ borderBottom: `1px solid ${EB.border}` }}>
                <td className="px-4 py-2.5 font-medium">
                  <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: p.color }} />{p.name}
                </td>
                <td className="px-4 py-2.5 text-right">{p.n}</td>
                <td className="px-4 py-2.5 text-right">{fmtPct(p.wins / p.n)}</td>
                <td className="px-4 py-2.5 text-right">{p.rN ? `${(p.rSum / p.rN).toFixed(2)}R` : "—"}</td>
                <td className="px-4 py-2.5 text-right font-medium" style={{ color: pnlColor(p.pnl) }}>{fmtMoney(p.pnl, { sign: true })}</td>
                <td className="px-4 py-2.5 text-right" style={{ color: pnlColor(p.pnl) }}>{fmtMoney(p.pnl / p.n, { sign: true })}</td>
              </tr>
            ))}
            {byPlaybook.length === 0 && <tr><td colSpan={6} className="p-8 text-center" style={{ color: EB.mutedForeground }}>Tag trades with a playbook to see performance per strategy.</td></tr>}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">R-multiple distribution</h3>
            <span className="text-xs" style={{ color: EB.mutedForeground }}>
              Expectancy: <span style={{ color: rStats.expectancy != null ? pnlColor(rStats.expectancy) : EB.mutedForeground }}>{rStats.expectancy != null ? `${rStats.expectancy.toFixed(2)}R` : "—"}</span>
            </span>
          </div>
          {rStats.n === 0 ? (
            <div className="grid h-72 place-items-center text-xs" style={{ color: EB.mutedForeground }}>Set a stop loss on trades to see R-multiple analytics.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={rStats.buckets}>
                  <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: EB.mutedForeground, fontSize: 10 }} />
                  <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="n" isAnimationActive={false}>{rStats.buckets.map((b, i) => <Cell key={i} fill={b.max <= 0 ? EB.loss : EB.win} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="overflow-x-auto">
          <h3 className="mb-3 text-sm font-medium">Hold-time buckets</h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase" style={{ color: EB.mutedForeground }}>
              <tr style={{ borderBottom: `1px solid ${EB.border}` }}>
                <th className="py-2 text-left font-medium">Bucket</th><th className="py-2 text-right font-medium">Trades</th>
                <th className="py-2 text-right font-medium">Win rate</th><th className="py-2 text-right font-medium">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {holdBuckets.map((b) => (
                <tr key={b.bucket} style={{ borderBottom: `1px solid ${EB.border}` }}>
                  <td className="py-2 font-medium">{b.bucket}</td>
                  <td className="py-2 text-right">{b.n}</td>
                  <td className="py-2 text-right">{fmtPct(b.wins / b.n)}</td>
                  <td className="py-2 text-right font-medium" style={{ color: pnlColor(b.pnl) }}>{fmtMoney(b.pnl, { sign: true })}</td>
                </tr>
              ))}
              {holdBuckets.length === 0 && <tr><td colSpan={4} className="py-8 text-center" style={{ color: EB.mutedForeground }}>No closed trades yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-medium">Daily P&L (last 13 weeks)</h3>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {Array.from({ length: 13 }, (_, week) => (
            <div key={week} className="flex flex-col gap-[3px]">
              {calendar.days.slice(week * 7, week * 7 + 7).map((d, i) => {
                const intensity = d.pnl == null ? 0 : Math.min(1, Math.abs(d.pnl) / calendar.maxAbs);
                const bg = d.pnl == null
                  ? "transparent"
                  : d.pnl === 0
                  ? EB.muted
                  : d.pnl > 0
                  ? `oklch(0.78 0.18 155 / ${0.15 + intensity * 0.75})`
                  : `oklch(0.66 0.22 25 / ${0.15 + intensity * 0.75})`;
                return (
                  <div
                    key={i}
                    title={d.pnl == null ? "" : `${d.date.toLocaleDateString()}: ${fmtMoney(d.pnl, { sign: true })}`}
                    className="size-3 rounded-sm"
                    style={{ background: bg, border: `1px solid ${EB.border}` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-medium">Expectancy by hour × weekday</h3>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-[3px]">
            {timeOfDay.grid.map((row, dow) => (
              <div key={dow} className="flex items-center gap-[3px]">
                <span className="w-7 shrink-0 text-[10px]" style={{ color: EB.mutedForeground }}>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dow]}</span>
                {row.map((cell) => {
                  const avg = cell.n ? cell.pnl / cell.n : 0;
                  const intensity = cell.n ? Math.min(1, Math.abs(avg) / timeOfDay.maxAbs) : 0;
                  const bg = !cell.n
                    ? "transparent"
                    : avg === 0
                    ? EB.muted
                    : avg > 0
                    ? `oklch(0.78 0.18 155 / ${0.15 + intensity * 0.75})`
                    : `oklch(0.66 0.22 25 / ${0.15 + intensity * 0.75})`;
                  return (
                    <div
                      key={cell.hour}
                      title={cell.n ? `${cell.hour}:00 ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]}: ${fmtMoney(avg, { sign: true })} avg (${cell.n} trades)` : ""}
                      className="size-3 rounded-sm"
                      style={{ background: bg, border: `1px solid ${EB.border}` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium">Symbol concentration</h3>
          {symbolConcentration.length === 0 ? (
            <div className="grid h-64 place-items-center text-xs" style={{ color: EB.mutedForeground }}>No closed trades yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={symbolConcentration} dataKey="n" nameKey="symbol" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.symbol}>
                    {symbolConcentration.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v: any, _n, p: any) => [`${v} trades`, p.payload.symbol]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: EB.mutedForeground }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-medium">Drawdown (underwater curve)</h3>
          {drawdownCurve.length === 0 ? (
            <div className="grid h-64 place-items-center text-xs" style={{ color: EB.mutedForeground }}>No closed trades yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={drawdownCurve}>
                  <CartesianGrid stroke={EB.border} strokeDasharray="3 3" />
                  <XAxis dataKey="i" tick={{ fill: EB.mutedForeground, fontSize: 10 }} tickFormatter={() => ""} />
                  <YAxis tick={{ fill: EB.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: EB.card, border: `1px solid ${EB.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [fmtMoney(v, { sign: true }), "Drawdown"]} labelFormatter={() => ""} />
                  <Area type="monotone" dataKey="drawdown" stroke={EB.loss} fill={EB.loss} fillOpacity={0.25} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {slippageReport && (
        <Card>
          <h3 className="mb-3 text-sm font-medium">Slippage report</h3>
          <p className="mb-2 text-xs" style={{ color: EB.mutedForeground }}>Planned entry vs actual fill, across {slippageReport.n} trades with a planned price set.</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[10px] uppercase" style={{ color: EB.mutedForeground }}>Avg slippage</div>
              <div className="text-lg font-semibold" style={{ color: slippageReport.avg >= 0 ? EB.win : EB.loss }}>{slippageReport.avg.toFixed(3)} pts</div>
            </div>
            <div>
              <div className="text-[10px] uppercase" style={{ color: EB.mutedForeground }}>Worst slippage</div>
              <div className="text-lg font-semibold" style={{ color: EB.loss }}>{slippageReport.worst.toFixed(3)} pts</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsView({ trades, riskSettings, onChange, onOpenTrade }: { trades: Trade[]; riskSettings: RiskSettings | null; onChange: () => Promise<Trade[]>; onOpenTrade: (t: Trade) => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm" style={{ color: EB.mutedForeground }}>Broker connections and data hygiene.</p>
      </div>
      <Card>
        <RiskRulesCard riskSettings={riskSettings} onChange={onChange} />
      </Card>
      <Card>
        <BrokerConnections />
      </Card>
      <Card>
        <DuplicateTrades trades={trades} onChange={onChange} onOpenTrade={onOpenTrade} />
      </Card>
    </div>
  );
}

function RiskRulesCard({ riskSettings, onChange }: { riskSettings: RiskSettings | null; onChange: () => Promise<Trade[]> }) {
  const { user } = useAuth();
  const [dailyLimit, setDailyLimit] = useState(riskSettings?.daily_loss_limit?.toString() ?? "");
  const [maxTrades, setMaxTrades] = useState(riskSettings?.max_trades_per_day?.toString() ?? "");
  const [rules, setRules] = useState<string[]>(riskSettings?.checklist_rules ?? []);
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDailyLimit(riskSettings?.daily_loss_limit?.toString() ?? "");
    setMaxTrades(riskSettings?.max_trades_per_day?.toString() ?? "");
    setRules(riskSettings?.checklist_rules ?? []);
  }, [riskSettings]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await sb.from("risk_settings").upsert(
      {
        user_id: user.id,
        daily_loss_limit: dailyLimit ? Number(dailyLimit) : null,
        max_trades_per_day: maxTrades ? Number(maxTrades) : null,
        checklist_rules: rules,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Risk rules saved."); onChange(); }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Risk rules & checklist</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Daily loss limit ($)"><Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="e.g. 500" style={fieldStyle()} /></Field>
        <Field label="Max trades / day"><Input type="number" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} placeholder="e.g. 5" style={fieldStyle()} /></Field>
      </div>
      <div>
        <Label>Pre-trade checklist rules</Label>
        <div className="space-y-1.5">
          {rules.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm" style={{ border: `1px solid ${EB.border}` }}>
              <span>{r}</span>
              <button onClick={() => setRules((rs) => rs.filter((_, ri) => ri !== i))} style={{ color: EB.destructive }}><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="e.g. Stop set before entry" style={fieldStyle()} />
          <Button
            onClick={() => { if (newRule.trim()) { setRules((rs) => [...rs, newRule.trim()]); setNewRule(""); } }}
            style={{ border: `1px solid ${EB.border}` }}
          >
            Add
          </Button>
        </div>
      </div>
      <Button onClick={save} disabled={saving} style={{ background: EB.primary, color: EB.primaryForeground }}>
        {saving ? "Saving…" : "Save risk rules"}
      </Button>
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
