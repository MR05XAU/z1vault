import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Z1Wordmark } from "@/components/Z1Logo";
import { ProgressRing } from "@/components/ProgressRing";
import { pickMindset } from "@/data/mindset";
import {
  BookOpen, Sparkles, BookMarked, Trophy, BarChart3, Highlighter, ArrowRight, Settings,
  CalendarDays, LineChart, CandlestickChart, Download, ShoppingBag, Flame,
} from "lucide-react";

interface Progress { chapter_id: string; progress_percentage: number; completed: boolean; updated_at: string }
interface QuizResult { score: number; total_questions: number }

const modules = [
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/library", label: "Book", icon: BookOpen },
  { to: "/tutor", label: "Tutor", icon: Sparkles },
  { to: "/journal", label: "Edgebook", icon: LineChart },
  { to: "/patterns", label: "Candles", icon: CandlestickChart },
  { to: "/notebook?tab=notes", label: "Notes", icon: BookMarked },
  { to: "/notebook?tab=highlights", label: "Highlights", icon: Highlighter },
  { to: "/notebook?tab=bookmarks", label: "Bookmarks", icon: Trophy },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/news", label: "Calendar", icon: CalendarDays },
  { to: "/offline", label: "Sync", icon: Download },
];

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
  const [, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, q] = await Promise.all([
        supabase.from("user_progress").select("chapter_id,progress_percentage,completed,updated_at").eq("user_id", user!.id),
        supabase.from("quiz_results").select("score,total_questions").eq("user_id", user!.id),
      ]);
      setProgress(p.data ?? []);
      setQuizzes(q.data ?? []);
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

      {/* Big feature card + sidebar list — mirrors "Equity curve" + "Recent trades" */}
      <section className="mt-4 grid gap-3 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <Panel className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Continue reading</h3>
            <span className="text-xs mint-text">{totalProgress}% mastery</span>
          </div>
          <div className="flex items-center gap-6">
            <ProgressRing value={totalProgress} size={100} stroke={7} theme="mint" />
            <div className="flex-1 min-w-0">
              {continueChapter ? (
                <>
                  <div className="text-base font-medium line-clamp-2">{continueChapter.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Chapter {continueChapter.chapter_number} · {continueChapter.estimated_minutes ?? 8} min · {chaptersDone}/{chapters.length} done
                  </div>
                  <button
                    onClick={() => nav(`/read/${continueChapter.id}`)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm mint-text font-medium press"
                  >
                    Resume reading <ArrowRight className="size-3.5 text-mint-bright" />
                  </button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading vault…</div>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-3 text-sm font-medium">Recent activity</h3>
          <ul className="space-y-2.5 text-sm">
            {recentActivity.map((p) => (
              <li key={p.chapter_id}>
                <button
                  onClick={() => nav(`/read/${p.chapter_id}`)}
                  className="flex w-full flex-col gap-0.5 border-b border-border pb-2.5 text-left last:border-b-0 last:pb-0"
                >
                  <span className="font-medium leading-snug">{p.chapter?.title}</span>
                  <span className={`text-xs ${p.completed ? "mint-text" : "text-muted-foreground"}`}>
                    {p.completed ? "Done" : `${Math.round(p.progress_percentage)}% complete`}
                  </span>
                </button>
              </li>
            ))}
            {recentActivity.length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
          </ul>
        </Panel>
      </section>

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
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-2xl bg-border sm:grid-cols-4">
            {modules.map(({ to, label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => nav(to)}
                className="flex flex-col items-center justify-center gap-2 bg-card py-5 press hover:bg-accent"
              >
                <div className="size-9 rounded-lg bg-mint/10 grid place-items-center">
                  <Icon className="size-4 text-mint-bright" />
                </div>
                <div className="text-xs font-medium text-foreground/90">{label}</div>
              </button>
            ))}
          </div>
        </Panel>
      </section>
      <div className="h-8" />
    </MobileShell>
  );
}
