import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { ProgressRing } from "@/components/ProgressRing";
import { Trophy, Highlighter, Bookmark, BookOpen, TrendingUp, LogOut } from "lucide-react";

export default function Analytics() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { data: chList = [] } = useChapters();
  const [stats, setStats] = useState({
    chapters: 0,
    done: 0,
    pct: 0,
    quizzes: 0,
    quizAvg: 0,
    highlights: 0,
    bookmarks: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const chapters = chList.reduce<Record<string, any>>((acc, c) => { acc[c.id] = c; return acc; }, {});

  useEffect(() => {
    (async () => {
      const [p, qr, hl, bm] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user!.id),
        supabase.from("quiz_results").select("score,total_questions,chapter_id,completed_at").eq("user_id", user!.id).order("completed_at", { ascending: false }).limit(8),
        supabase.from("highlights").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      const total = chList.length;
      const done = (p.data ?? []).filter((x: any) => x.completed).length;
      const pct = total ? Math.round((p.data ?? []).reduce((s: number, x: any) => s + Number(x.progress_percentage), 0) / total) : 0;
      const quizAvg = qr.data?.length
        ? Math.round(qr.data.reduce((s, q: any) => s + (q.score / q.total_questions) * 100, 0) / qr.data.length)
        : 0;
      setStats({
        chapters: total,
        done,
        pct,
        quizzes: qr.data?.length ?? 0,
        quizAvg,
        highlights: hl.count ?? 0,
        bookmarks: bm.count ?? 0,
      });
      setRecent(qr.data ?? []);
    })();
  }, [user, chList.length]);

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Analytics</div>
            <h1 className="display text-3xl font-medium mt-1">Your edge.</h1>
          </div>
          <button onClick={async () => { await signOut(); nav("/auth", { replace: true }); }} className="size-10 grid place-items-center rounded-full glass press text-muted-foreground">
            <LogOut className="size-4" />
          </button>
        </header>
      }
    >
      <div className="glass-strong rounded-3xl p-6 mt-6 gold-border flex flex-col items-center animate-fade-up">
        <ProgressRing value={stats.pct} size={170} stroke={10} label="Total mastery" sub={`${stats.done}/${stats.chapters} chapters`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <Tile icon={Trophy} label="Avg quiz score" value={`${stats.quizAvg}%`} />
        <Tile icon={TrendingUp} label="Quizzes taken" value={`${stats.quizzes}`} />
        <Tile icon={Highlighter} label="Highlights" value={`${stats.highlights}`} />
        <Tile icon={Bookmark} label="Bookmarks" value={`${stats.bookmarks}`} />
      </div>

      <section className="mt-8 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <h2 className="display text-xl font-medium mb-3">Recent quizzes</h2>
        {recent.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground text-center">
            Take your first quiz to see results here.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((r, i) => {
              const pct = Math.round((r.score / r.total_questions) * 100);
              const ch = chapters[r.chapter_id];
              return (
                <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="size-11 rounded-xl grid place-items-center font-mono text-sm gold-text bg-surface-elevated">
                    {pct}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ch?.title || "Chapter"}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {r.score} / {r.total_questions} · {new Date(r.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-[10px] text-center text-muted-foreground/60 mt-10 tracking-wide">
        Educational content only. Not financial advice.
      </p>
    </MobileShell>
  );
}

function Tile({ icon: Icon, label, value }: any) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-gold-bright" />
      </div>
      <div className="display text-3xl gold-text font-medium mt-3">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}