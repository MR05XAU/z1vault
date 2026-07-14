import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Check } from "lucide-react";

// Chapter titles are often authored as "Chapter N: Title" — redundant next
// to the numbered TOC row it's already displayed in.
function stripChapterPrefix(title: string): string {
  return title.replace(/^chapter\s+\d+\s*[:.\-–]\s*/i, "");
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
  }), [chapters]);

  const doneCount = chapters.filter((c) => progress[c.id]?.done).length;

  // A table-of-contents row: chapter number, title, dotted leader, page/status —
  // set in the display serif, not the app's UI sans-serif, and separated by
  // hairline rules instead of individual bordered "glass" cards.
  const renderRow = (c: any, i: number, numeral: string) => {
    const p = progress[c.id] ?? { pct: 0, done: false };
    return (
      <button
        key={c.id}
        onClick={() => nav(`/read/${c.id}`)}
        className="group flex w-full items-baseline gap-3 border-b border-border/60 py-4 text-left press animate-fade-up first:pt-0"
        style={{ animationDelay: `${i * 40}ms` }}
      >
        <span className="display shrink-0 text-sm text-muted-foreground tabular-nums">{numeral}</span>
        <span className="display shrink-0 text-[15px] font-medium group-hover:mint-text transition-colors">
          {stripChapterPrefix(c.title)}
        </span>
        <span className="min-w-[1rem] flex-1 overflow-hidden border-b border-dotted border-border translate-y-[-3px]" />
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {p.done ? (
            <span className="flex items-center gap-1 mint-text"><Check className="size-3" /> Read</span>
          ) : p.pct > 0 ? (
            <span className="text-mint-bright">{Math.round(p.pct)}%</span>
          ) : (
            `${c.estimated_minutes ?? 8}m`
          )}
        </span>
      </button>
    );
  };

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top" />
      }
    >
      {/* Book cover */}
      <div className="relative mt-2 overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface-elevated to-background px-7 py-10 text-center">
        <div className="mx-auto h-px w-10 bg-mint/60" />
        <div className="mt-4 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">A Complete Trading Curriculum</div>
        <h1 className="display mt-3 text-4xl font-medium leading-tight">Z1 Insights</h1>
        <div className="mx-auto mt-5 h-px w-10 bg-mint/60" />
        <p className="mt-5 text-xs italic text-muted-foreground">
          {chapters.length} chapters · {doneCount} read
        </p>
      </div>

      {/* Table of contents */}
      <section className="mt-8">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="display text-lg font-medium">Contents</h2>
        </div>
        <div>
          {coreChapters.map((c, i) => renderRow(c, i, String(i + 1).padStart(2, "0")))}
        </div>
      </section>

      {bgChapters.length > 0 && (
        <section className="mt-10">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="display text-lg font-medium">Background Reading</h2>
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">No quiz</span>
          </div>
          <div>
            {bgChapters.map((c, i) => renderRow(c, i, "app. " + String.fromCharCode(65 + i)))}
          </div>
        </section>
      )}
      <div className="h-4" />
    </MobileShell>
  );
}
