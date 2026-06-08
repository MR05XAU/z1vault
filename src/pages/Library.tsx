import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRight, Check, Clock } from "lucide-react";

export default function Library() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [chapters, setChapters] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, { pct: number; done: boolean }>>({});

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("book_chapters").select("*").order("order_index"),
        supabase.from("user_progress").select("chapter_id,progress_percentage,completed").eq("user_id", user!.id),
      ]);
      setChapters(c.data ?? []);
      const map: Record<string, any> = {};
      (p.data ?? []).forEach((x: any) => {
        map[x.chapter_id] = { pct: Number(x.progress_percentage), done: x.completed };
      });
      setProgress(map);
    })();
  }, [user]);

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">The Book</div>
          <h1 className="display text-3xl font-medium mt-1">Z1 Insights.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {chapters.length} chapters · A complete trading curriculum.
          </p>
        </header>
      }
    >
      <div className="space-y-3 mt-6">
        {chapters.map((c, i) => {
          const p = progress[c.id] ?? { pct: 0, done: false };
          return (
            <button
              key={c.id}
              onClick={() => nav(`/read/${c.id}`)}
              className="w-full glass rounded-2xl p-5 flex items-center gap-4 press hover:shadow-glow text-left animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="size-12 rounded-xl bg-surface-elevated grid place-items-center display gold-text text-lg font-medium gold-border">
                {String(c.chapter_number).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{c.subtitle}</div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Clock className="size-3" />{c.estimated_minutes ?? 8}m</span>
                  {p.done ? (
                    <span className="flex items-center gap-1 text-success"><Check className="size-3" />Complete</span>
                  ) : p.pct > 0 ? (
                    <span className="text-gold-bright">{Math.round(p.pct)}% read</span>
                  ) : (
                    <span>Not started</span>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </MobileShell>
  );
}