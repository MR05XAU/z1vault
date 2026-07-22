import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Check, Lock } from "lucide-react";

function stripChapterPrefix(title: string): string {
  return title.replace(/^chapter\s+\d+\s*[:.\-–]\s*/i, "");
}
function isChapterUnlocked(chapter: any, index: number, progress: Record<string, any>, allChapters: any[]) {
  if (index === 0) return true;
  const prevChapter = allChapters[index - 1];
  return progress[prevChapter?.id]?.done === true;
}
export default function Library() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: chapters = [] } = useChapters();
  const [progress, setProgress] = useState<Record<string, { pct: number; done: boolean }>>({});

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("user_progress")
        .select("chapter_id,progress_percentage,completed")
        .eq("user_id", user!.id);
      const map: Record<string, any> = {};
      (p ?? []).forEach((x: any) => {
        map[x.chapter_id] = { pct: Number(x.progress_percentage), done: x.completed };
      });
      setProgress(map);
    })();
  }, [user]);

  const { coreChapters, bgChapters } = useMemo(() => ({
    coreChapters: chapters.filter((c) => !c.is_background),
    bgChapters: chapters.filter((c) => c.is_background),
   const renderRow = (c: any, i: number, numeral: string, chapterList: any[]) => {
    const p = progress[c.id] ?? { pct: 0, done: false };
    const unlocked = isChapterUnlocked(c, i, progress, chapterList);
    
    return (
      <button
        key={c.id}
        onClick={() => unlocked ? nav(`/read/${c.id}`) : null}
        disabled={!unlocked}
        className={`group relative rounded-2xl border border-border bg-surface-elevated/40 p-3 sm:p-4 text-left press animate-fade-up transition-colors w-full ${
          unlocked 
            ? "hover:border-border-strong cursor-pointer" 
            : "opacity-50 cursor-not-allowed"
        }`}
        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="display shrink-0 text-sm sm:text-lg text-muted-foreground/70 tabular-nums leading-5 sm:leading-6 mt-0.5">
            {unlocked ? numeral : <Lock className="size-4 mt-0.5" />}
          </span>
          <div className="min-w-0 flex-1 overflow-visible">
            <div className="display text-sm sm:text-[15px] font-medium leading-snug sm:leading-6 group-hover:mint-text transition-colors break-words">
              {stripChapterPrefix(c.title)}
            </div>
            <div className="mt-1 sm:mt-1.5 flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground tabular-nums">
              {!unlocked ? (
                <span className="flex items-center gap-1 text-muted-foreground"><Lock className="size-3" /> Complete previous chapter</span>
              ) : p.done ? (
                <span className="flex items-center gap-1 mint-text"><Check className="size-3" /> Read</span>
              ) : p.pct > 0 ? (
                <span className="text-mint-bright">{Math.round(p.pct)}% read</span>
              ) : (
                <span>{c.estimated_minutes ?? 8} min</span>
              )}
            </div>
          </div>
        </div>
        {!p.done && p.pct > 0 && unlocked && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60">
            <div className="h-full mint-fill" style={{ width: `${p.pct}%` }} />
          </div>
        )}
      </button>
    );
  };
        )}
      </button>
    );
  };

  const continueChapter =
    chapters.find((c) => !progress[c.id]?.done && (progress[c.id]?.pct ?? 0) > 0) ??
    chapters.find((c) => !progress[c.id]?.done);

  const cover = (
    <div className="relative rounded-3xl border border-border bg-gradient-to-b from-surface-elevated to-background px-4 sm:px-7 py-6 sm:py-10 text-center lg:py-14">
      <div className="mx-auto h-px w-10 bg-mint/60" />
      <div className="mt-3 sm:mt-4 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">A Complete Trading Curriculum</div>
      <h1 className="display mt-2 sm:mt-3 text-3xl sm:text-4xl font-medium leading-tight lg:text-5xl">Z1 Insights</h1>
      <div className="mx-auto mt-4 sm:mt-5 h-px w-10 bg-mint/60" />
      <p className="mt-3 sm:mt-5 text-xs italic text-muted-foreground">
        {chapters.length} chapters · {doneCount} read
      </p>
      <div className="mx-auto mt-4 sm:mt-6 h-1 w-32 sm:w-40 overflow-hidden rounded-full bg-border-strong">
        <div className="h-full mint-fill" style={{ width: `${chapters.length ? (doneCount / chapters.length) * 100 : 0}%` }} />
      </div>
      {continueChapter && (
        <button
          onClick={() => nav(`/read/${continueChapter.id}`)}
         {coreChapters.map((c, i) => renderRow(c, i, String(i + 1).padStart(2, "0"), coreChapters))}
        >
          {(progress[continueChapter.id]?.pct ?? 0) > 0 ? "Continue reading" : "Start reading"}
        </button>
      )}
    </div>
  );

  const contents = (
    <>
      <section>
       {bgChapters.map((c, i) => renderRow(c, i, "app. " + String.fromCharCode(65 + i), bgChapters))}
          <h2 className="display text-base sm:text-lg font-medium">Contents</h2>
        </div>
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          {coreChapters.map((c, i) => renderRow(c, i, String(i + 1).padStart(2, "0")))}
        </div>
      </section>

      {bgChapters.length > 0 && (
        <section className="mt-8 sm:mt-10">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="display text-base sm:text-lg font-medium">Background Reading</h2>
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">No quiz</span>
          </div>
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
            {bgChapters.map((c, i) => renderRow(c, i, "app. " + String.fromCharCode(65 + i)))}
          </div>
        </section>
      )}
    </>
  );

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-4 sm:px-5 pt-4 sm:pt-6 safe-top" />
      }
    >
      <div className="mt-2 lg:grid lg:grid-cols-[minmax(280px,340px)_1fr] lg:items-start lg:gap-10">
        <div className="lg:sticky lg:top-8">{cover}</div>
        <div className="mt-6 sm:mt-8 lg:mt-0">{contents}</div>
      </div>
      <div className="h-8 sm:h-4" />
    </MobileShell>
  );
}
