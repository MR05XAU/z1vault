import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookmarkPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { lookup } from "@/lib/dictionary";

interface Props {
  word: string;
  x: number;
  y: number;
  chapterId?: string;
  onClose: () => void;
}

export function WordPopover({ word, x, y, chapterId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [definition, setDefinition] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const def = await lookup(word);
        if (cancelled) return;
        if (!def) setError("Not in dictionary");
        else setDefinition(def);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Lookup failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [word]);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any).from("vocab").upsert({
      user_id: user.id, word: word.toLowerCase(), definition, chapter_id: chapterId ?? null,
    }, { onConflict: "user_id,word" });
    if (error) toast.error(error.message);
    else toast.success("Saved to vocab.");
    onClose();
  };

  // Keep popover within viewport
  const top = Math.min(y, window.innerHeight - 200);
  const left = Math.min(Math.max(8, x - 140), window.innerWidth - 296);

  return (
    <div
      className="fixed z-50 w-72 glass-strong rounded-2xl shadow-lift gold-border p-3 animate-fade-up"
      style={{ top, left }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Definition</div>
          <div className="text-sm font-medium capitalize mt-0.5">{word}</div>
        </div>
        <button onClick={onClose} className="size-7 grid place-items-center rounded-lg glass press shrink-0">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 text-sm text-foreground/90 min-h-[40px]">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" /> Looking up…
          </div>
        ) : error ? (
          <div className="text-xs text-muted-foreground">{error}</div>
        ) : (
          definition
        )}
      </div>
      {!loading && !error && definition && (
        <button
          onClick={save}
          className="mt-3 w-full glass rounded-xl py-2 text-xs flex items-center justify-center gap-1.5 press"
        >
          <BookmarkPlus className="size-3" /> Save to vocab
        </button>
      )}
    </div>
  );
}