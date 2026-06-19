import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

type Mode = "daily" | "after-loss" | "after-quiz-fail" | "before-session";
interface Mindset { tip: string; quote: string; tag: string }

const cacheKey = (mode: Mode, dateStr: string) => `z1.mindset.${mode}.${dateStr}`;
const today = () => new Date().toISOString().slice(0, 10);

export function MindsetCard({ mode = "daily", compact = false }: { mode?: Mode; compact?: boolean }) {
  const [data, setData] = useState<Mindset | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(force = false) {
    setErr(null);
    const k = cacheKey(mode, today());
    if (!force) {
      try {
        const cached = localStorage.getItem(k);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          // Daily card: keep cache for the whole day. Contextual modes always refresh.
          if (mode === "daily") return;
        }
      } catch { /* ignore */ }
    }
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("daily-mindset", {
      body: { mode, seed: force ? Date.now() : today() },
    });
    if (error || !res?.tip) {
      setErr("Couldn't reach the mindset coach. Try again.");
      setLoading(false);
      return;
    }
    setData(res as Mindset);
    try { localStorage.setItem(k, JSON.stringify(res)); } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, [mode]);

  if (loading && !data) {
    return (
      <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${compact ? "" : "min-h-[112px]"}`}>
        <Loader2 className="size-4 text-gold-bright animate-spin" />
        <span className="text-xs text-muted-foreground">Drawing today's edge…</span>
      </div>
    );
  }

  if (err && !data) {
    return (
      <button onClick={() => load(true)} className="glass rounded-2xl p-4 w-full text-left press">
        <div className="text-xs text-muted-foreground">{err}</div>
      </button>
    );
  }
  if (!data) return null;

  return (
    <div className={`glass rounded-2xl ${compact ? "p-4" : "p-5"} gold-border relative overflow-hidden`}>
      <div className="absolute -top-16 -right-16 size-40 bg-gold/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-gold-bright">
            <Sparkles className="size-3" />
            {data.tag} · {mode === "daily" ? "Today" : "Mindset"}
          </div>
          {mode === "daily" && (
            <button onClick={() => load(true)} aria-label="New tip" className="size-7 grid place-items-center rounded-full glass press">
              {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3 text-muted-foreground" />}
            </button>
          )}
        </div>
        <p className="text-[15px] leading-snug text-foreground/95 font-medium">
          "{data.quote}"
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          <span className="text-gold-bright/90 font-medium">Tip — </span>{data.tip}
        </p>
      </div>
    </div>
  );
}