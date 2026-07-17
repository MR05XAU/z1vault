import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Z1Wordmark } from "@/components/Z1Logo";
import { InstallNudge } from "@/components/InstallNudge";
import { ProgressRing } from "@/components/ProgressRing";
import { pickMindset } from "@/data/mindset";
import {
  BookOpen, Sparkles, BookMarked, Trophy, BarChart3, Highlighter, ArrowRight, Settings,
  CalendarDays, LineChart, CandlestickChart, Download, ShoppingBag, Flame, Calculator, GraduationCap, Layers, Search,
} from "lucide-react";

interface Progress { chapter_id: string; progress_percentage: number; completed: boolean; updated_at: string }
interface QuizResult { score: number; total_questions: number }

// Modules grouped by what the user is doing — mirrors the journey rail:
// learn first, then trade, with notes and utilities behind them.
const moduleGroups: { title: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    title: "Learn",
    items: [
      { to: "/starting-trading", label: "Starting Trading", icon: GraduationCap },
      { to: "/library", label: "Book", icon: BookOpen },
      { to: "/tutor", label: "Tutor", icon: Sparkles },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
      { to: "/patterns", label: "Candles", icon: CandlestickChart },
    ],
  },
  {
    title: "Trade",
    items: [
      { to: "/journal", label: "Edgebook", icon: LineChart },
      { to: "/calculators", label: "Calculator", icon: Calculator },
      { to: "/analytics", label: "Stats", icon: BarChart3 },
      { to: "/news", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Notes",
    items: [
      { to: "/notebook?tab=notes", label: "Notes", icon: BookMarked },
      { to: "/notebook?tab=highlights", label: "Highlights", icon: Highlighter },
      { to: "/notebook?tab=bookmarks", label: "Bookmarks", icon: Trophy },
    ],
  },
  {
    title: "More",
    items: [
      { to: "/shop", label: "Shop", icon: ShoppingBag },
      { to: "/offline", label: "Sync", icon: Download },
    ],
  },
];

// Upcoming economic events with a live countdown — data via the
// econ-calendar edge function (Forex Factory weekly feed, cached server-side).
function UpcomingNews({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const [events, setEvents] = useState<{ title: string; country: string; date: string; impact: string }[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const { data } = await supabase.functions.invoke("econ-calendar", {
          body: {},
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setEvents((data?.events ?? []).slice(0, 4));
      } catch { /* box just stays empty */ }
    })();
    const t = setInterval(() => setTick((n) => n + 1), 30_000); // refresh countdowns
    return () => clearInterval(t);
  }, []);

  const until = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "now";
    const m = Math.floor(ms / 60000);
    if (m < 60) return `in ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `in ${h}h ${m % 60}m`;
    return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  };
  const impactColor = (impact: string) =>
    impact === "High" ? "bg-danger" : impact === "Medium" ? "bg-gold" : "bg-muted-foreground/50";

  if (events.length === 0) return null;
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Upcoming news</h3>
        <button onClick={onOpenCalendar} className="text-[11px] mint-text press">Full calendar</button>
      </div>
      <ul className="space-y-2.5 text-sm">
        {events.map((e, i) => (
          <li key={i} className="flex items-center gap-2.5 border-b border-border pb-2.5 last:border-b-0 last:pb-0">
            <span className={`size-2 shrink-0 rounded-full ${impactColor(e.impact)}`} title={`${e.impact} impact`} />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-[13px] font-medium leading-snug">{e.title}</div>
              <div className="text-[11px] text-muted-foreground">{e.country}</div>
            </div>
            <span className="shrink-0 text-xs mint-text tabular-nums">{until(e.date)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// Flat, bordered card — Edgebook's actual card style (no blur/glow), used
// throughout this rebuild instead of the app-wide "glass" glassmorphism.
function Panel({ children, className = "", ...rest }: any) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default function Vault() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: chapters = [] } = useChapters();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
  const [courseCompleted, setCourseCompleted] = useState<string[]>([]);
  const [tradePnls, setTradePnls] = useState<number[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, q, c, t] = await Promise.all([
        supabase.from("user_progress").select("chapter_id,progress_percentage,completed,updated_at").eq("user_id", user!.id),
        supabase.from("quiz_results").select("score,total_questions").eq("user_id", user!.id),
        (supabase as any).from("course_progress").select("completed").eq("user_id", user!.id).eq("course", "starting-trading").maybeSingle(),
        (supabase as any).from("trades").select("pnl").eq("user_id", user!.id).not("pnl", "is", null),
      ]);
      setProgress(p.data ?? []);
      setQuizzes(q.data ?? []);
      setCourseCompleted(c.data?.completed ?? []);
      setTradePnls((t.data ?? []).map((r: any) => Number(r.pnl)));
      setLoading(false);
    })();
  }, [user]);

  const totalProgress = chapters.length
    ? Math.round(progress.reduce((s, p) => s + Number(p.progress_percentage || 0), 0) / chapters.length)
    : 0;
  const chaptersDone = progress.filter((p) => p.completed).length;
  const quizAvg = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + (q.score / q.total_questions) * 100, 0) / quizzes.length)
    : 0;

  // Most recent INCOMPLETE chapter the user touched; fall back to next chapter after
  // the latest completed one; finally first chapter.
  const continueChapter = (() => {
    const sorted = [...progress].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    const incomplete = sorted.find((p) => !p.completed);
    if (incomplete) {
      const ch = chapters.find((c) => c.id === incomplete.chapter_id);
      if (ch) return ch;
    }
    const lastDone = sorted.find((p) => p.completed);
    if (lastDone) {
      const i = chapters.findIndex((c) => c.id === lastDone.chapter_id);
      if (i >= 0 && chapters[i + 1]) return chapters[i + 1];
    }
    return chapters[0];
  })();

  // The straight-through journey: basics course -> book chapters -> journal.
  // One "next step" resolved from actual progress, so the home card always
  // points at the right stage.
  const courseStarted = courseCompleted.length > 0;
  const courseDone = courseCompleted.includes("quiz:l5"); // final level's quiz = course complete
  const journey = (() => {
    if (!courseDone && chaptersDone === 0) {
      return {
        label: "Starting Trading",
        title: courseStarted ? "Continue the basics course" : "New here? Start with the basics",
        sub: "Five levels: markets, candlesticks, risk, psychology, your first trade.",
        cta: courseStarted ? "Continue course" : "Start course",
        to: "/starting-trading",
      };
    }
    if (continueChapter && chaptersDone < chapters.length) {
      return {
        label: "The Book",
        title: continueChapter.title,
        sub: `Chapter ${continueChapter.chapter_number} · ${continueChapter.estimated_minutes ?? 8} min · ${chaptersDone}/${chapters.length} done`,
        cta: "Resume reading",
        to: `/read/${continueChapter.id}`,
      };
    }
    return {
      label: "Edgebook",
      title: "Book complete — now trade it",
      sub: "Log trades, run the checklist, and let the analytics find your edge.",
      cta: "Open Edgebook",
      to: "/journal",
    };
  })();

  // Recent activity — mirrors Edgebook's "Recent trades" sidebar list.
  const recentActivity = [...progress]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 7)
    .map((p) => ({ ...p, chapter: chapters.find((c) => c.id === p.chapter_id) }))
    .filter((p) => p.chapter);

  // Real day-streak: consecutive days with activity counting back from today.
  const streak = (() => {
    const days = new Set(
      progress.map((p) => new Date(p.updated_at).toISOString().slice(0, 10))
    );
    let n = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();

  const mindset = pickMindset("daily", new Date().toISOString().slice(0, 10));

  // Milestone toasts at 3 / 7 / 30 days. Show once per milestone per user.
  useEffect(() => {
    if (!user || streak === 0) return;
    const milestones = [3, 7, 30];
    const hit = milestones.find((m) => streak === m);
    if (!hit) return;
    const key = `z1.streakToast.${user.id}.${hit}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const copy: Record<number, string> = {
      3: "🔥 3-day streak. The habit is forming.",
      7: "🏆 7 days straight. You're locking it in.",
      30: "👑 30 days. You're operating like a pro.",
    };
    toast.success(copy[hit]);
  }, [streak, user]);

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Welcome back</div>
            <div className="display text-lg font-medium mt-1">
              {user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Trader"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Z1Wordmark />
            <button
              onClick={() => window.dispatchEvent(new Event("z1:command"))}
              aria-label="Search (Cmd+K)"
              className="size-9 grid place-items-center rounded-xl border border-border bg-card press"
            >
              <Search className="size-4 text-foreground/80" />
            </button>
            <button
              onClick={() => nav("/calculators")}
              aria-label="Calculators"
              className="size-9 grid place-items-center rounded-xl border border-border bg-card press"
            >
              <Calculator className="size-4 text-foreground/80" />
            </button>
            <button
              onClick={() => nav("/account")}
              aria-label="Account settings"
              className="size-9 grid place-items-center rounded-xl border border-border bg-card press"
            >
              <Settings className="size-4 text-foreground/80" />
            </button>
          </div>
        </header>
      }
    >
      {/* KPI row — same shape as Edgebook's Net P&L / Win rate / Profit factor / Trades */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-up">
        <Panel>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Mastery</div>
          <div className="mt-0.5 text-xl font-medium mint-text">{totalProgress}%</div>
        </Panel>
        <Panel>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg quiz</div>
          <div className="mt-0.5 text-xl font-medium mint-text">{quizAvg}%</div>
        </Panel>
        <Panel>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Chapters</div>
          <div className="mt-0.5 text-xl font-medium">{chaptersDone}<span className="text-xs text-muted-foreground">/{chapters.length}</span></div>
        </Panel>
        <Panel>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Streak</div>
          <div className="mt-0.5 flex items-center gap-1 text-xl font-medium">
            {streak}d {streak > 0 && <Flame className="size-3.5 text-mint-bright" />}
          </div>
        </Panel>
      </section>

      {/* Journey strip full-width, then three equal boxes — heights balance
          instead of two short cards stretching against a tall column. */}
      <section className="mt-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <Panel>
          <div className="flex items-center gap-4">
            <ProgressRing value={totalProgress} size={64} stroke={5} theme="mint" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-mint-bright">{journey.label}</span>
                <span className="shrink-0 text-xs mint-text">{totalProgress}% mastery</span>
              </div>
              <div className="mt-0.5 text-[15px] font-medium line-clamp-1">{journey.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{journey.sub}</div>
            </div>
            <button
              onClick={() => nav(journey.to)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs mint-text font-medium press"
            >
              {journey.cta} <ArrowRight className="size-3.5 text-mint-bright" />
            </button>
          </div>
        </Panel>

        <div className="mt-3 grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Edgebook stats</h3>
              <button onClick={() => nav("/journal")} className="text-[11px] mint-text press">Open Edgebook</button>
            </div>
            {tradePnls.length === 0 ? (
              <p className="text-xs text-muted-foreground">No closed trades yet — log or import your first trade in Edgebook.</p>
            ) : (
              (() => {
                const net = tradePnls.reduce((a, b) => a + b, 0);
                const wins = tradePnls.filter((p) => p > 0);
                const grossW = wins.reduce((a, b) => a + b, 0);
                const grossL = Math.abs(tradePnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
                const pf = grossL > 0 ? grossW / grossL : wins.length ? Infinity : 0;
                const stat = (label: string, value: string, color?: string) => (
                  <div className="rounded-xl border border-border px-3 py-2.5 text-center">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className={`mt-0.5 text-sm font-semibold tabular-nums ${color ?? ""}`}>{value}</div>
                  </div>
                );
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {stat("Net P&L", `${net >= 0 ? "+" : "-"}$${Math.abs(net).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, net >= 0 ? "text-success" : "text-danger")}
                    {stat("Win rate", `${Math.round((wins.length / tradePnls.length) * 100)}%`)}
                    {stat("Profit factor", pf === Infinity ? "∞" : pf.toFixed(2))}
                    {stat("Trades", String(tradePnls.length))}
                  </div>
                );
              })()
            )}
          </Panel>

          <UpcomingNews onOpenCalendar={() => nav("/news")} />

          <Panel>
            <h3 className="mb-3 text-sm font-medium">Recent activity</h3>
            <ul className="space-y-2.5 text-sm">
              {recentActivity.map((p) => (
                <li key={p.chapter_id}>
                  <button
                    onClick={() => nav(`/read/${p.chapter_id}`)}
                    className="flex w-full flex-col gap-0.5 border-b border-border pb-2.5 text-left last:border-b-0 last:pb-0"
                  >
                    <span className="line-clamp-1 font-medium leading-snug">{p.chapter?.title}</span>
                    <span className={`text-xs ${p.completed ? "mint-text" : "text-muted-foreground"}`}>
                      {p.completed ? "Done" : `${Math.round(p.progress_percentage)}% complete`}
                    </span>
                  </button>
                </li>
              ))}
              {recentActivity.length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
            </ul>
          </Panel>
        </div>
      </section>

      {/* Milestone badges — cheap dopamine, computed from data already loaded */}
      <section className="mt-3 animate-fade-up" style={{ animationDelay: "90ms" }}>
        <Panel>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-medium">Milestones</h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {[
                tradePnls.length >= 1, tradePnls.length >= 10, chaptersDone >= 5,
                chaptersDone >= Math.ceil(chapters.length / 2), courseDone, streak >= 7, streak >= 30,
              ].filter(Boolean).length}/7 earned
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "First trade", earned: tradePnls.length >= 1 },
              { label: "10 trades", earned: tradePnls.length >= 10 },
              { label: "5 chapters", earned: chaptersDone >= 5 },
              { label: "Half the book", earned: chapters.length > 0 && chaptersDone >= Math.ceil(chapters.length / 2) },
              { label: "Course graduate", earned: courseDone },
              { label: "7-day streak", earned: streak >= 7 },
              { label: "30-day streak", earned: streak >= 30 },
            ].map((b) => (
              <span
                key={b.label}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${b.earned ? "border-mint/50 bg-mint/10 mint-text" : "border-border text-muted-foreground/60"}`}
              >
                <Trophy className={`size-3 ${b.earned ? "text-mint-bright" : "opacity-40"}`} />
                {b.label}
              </span>
            ))}
          </div>
        </Panel>
      </section>

      <InstallNudge />

      {/* Mindset tip — kept as a slim strip rather than a big gradient card */}
      <section className="mt-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <Panel className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-mint-bright" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">"{mindset.quote}"</p>
            <p className="mt-1 text-xs text-muted-foreground"><span className="mint-text font-medium">Tip — </span>{mindset.tip}</p>
          </div>
        </Panel>
      </section>

      {/* Modules grid — mirrors the calendar section: one full-width panel below */}
      <section className="mt-4 animate-fade-up" style={{ animationDelay: "140ms" }}>
        <Panel className="p-0">
          <div className="flex items-baseline justify-between px-4 pt-3.5 pb-3 border-b border-border">
            <h2 className="text-sm font-medium">Modules</h2>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Quick access</span>
          </div>
          <div className="space-y-1 px-4 py-4">
            {moduleGroups.map((group) => (
              <div key={group.title}>
                <div className="mb-2 mt-3 flex items-center gap-3 first:mt-0">
                  <span className="text-[10px] uppercase tracking-[0.24em] text-mint-bright">{group.title}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => nav(to)}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-4 press hover:bg-accent hover:border-border-strong transition-colors"
                    >
                      <div className="size-9 rounded-lg bg-mint/10 grid place-items-center">
                        <Icon className="size-4 text-mint-bright" />
                      </div>
                      <div className="px-1 text-center text-xs font-medium leading-tight text-foreground/90">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      <div className="h-8" />
    </MobileShell>
  );
}
