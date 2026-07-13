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
import { MindsetCard } from "@/components/MindsetCard";
import { BookOpen, Sparkles, BookMarked, Trophy, BarChart3, Highlighter, ArrowRight, Flame, Clock, Settings, CalendarDays, LineChart, CandlestickChart, Download, ShoppingBag } from "lucide-react";

interface Progress { chapter_id: string; progress_percentage: number; completed: boolean; updated_at: string }
interface QuizResult { score: number; total_questions: number }

const modules = [
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/library", label: "Book", icon: BookOpen },
  { to: "/tutor", label: "Tutor", icon: Sparkles },
  { to: "/journal", label: "Journal", icon: LineChart },
  { to: "/patterns", label: "Candles", icon: CandlestickChart },
  { to: "/notebook?tab=notes", label: "Notes", icon: BookMarked },
  { to: "/notebook?tab=highlights", label: "Highlights", icon: Highlighter },
  { to: "/notebook?tab=bookmarks", label: "Bookmarks", icon: Trophy },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/news", label: "Calendar", icon: CalendarDays },
  { to: "/offline", label: "Sync", icon: Download },
];

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
              className="size-9 grid place-items-center rounded-xl glass press hover:shadow-glow"
            >
              <Settings className="size-4 text-foreground/80" />
            </button>
          </div>
        </header>
      }
    >
      <section className="mt-6 animate-fade-up">
        <div className="glass-strong rounded-3xl p-6 gold-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-60 bg-gold/15 blur-3xl rounded-full" />
          <div className="relative flex items-center gap-6">
            <ProgressRing value={totalProgress} label="Mastery" sub={`${chaptersDone}/${chapters.length} done`} />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Continue</div>
              {continueChapter ? (
                <>
                  <div className="text-base font-medium mt-1.5 line-clamp-2">{continueChapter.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Chapter {continueChapter.chapter_number} · {continueChapter.estimated_minutes ?? 8} min
                  </div>
                  <button
                    onClick={() => nav(`/read/${continueChapter.id}`)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm gold-text font-medium press"
                  >
                    Resume reading <ArrowRight className="size-3.5 text-gold-bright" />
                  </button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">Loading vault…</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <MindsetCard mode="daily" />
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <StatTile icon={Trophy} label="Avg quiz" value={`${quizAvg}%`} />
        <StatTile icon={Flame} label="Done" value={`${chaptersDone}`} />
        <StatTile icon={Clock} label="Streak" value={`${streak}d`} />
      </section>

      <section className="mt-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="display text-xl font-medium">Modules</h2>
          <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Quick access</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {modules.map(({ to, label, icon: Icon }, i) => (
            <button
              key={label}
              onClick={() => nav(to)}
              className="glass rounded-2xl aspect-square flex flex-col items-center justify-center press hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${200 + i * 60}ms` }}
            >
              <div className="size-10 rounded-xl bg-gold/10 grid place-items-center mb-2">
                <Icon className="size-4.5 text-gold-bright" />
              </div>
              <div className="text-xs font-medium text-foreground/90">{label}</div>
            </button>
          ))}
        </div>
      </section>
      <div className="h-8" />
    </MobileShell>
  );
}

function StatTile({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col gap-1.5">
      <Icon className="size-3.5 text-gold-bright" />
      <div className="display text-xl font-medium gold-text leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}