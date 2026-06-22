import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { pickMindset } from "@/data/mindset";

type Mode = "daily" | "after-loss" | "after-quiz-fail" | "before-session";

const today = () => new Date().toISOString().slice(0, 10);

export function MindsetCard({ mode = "daily", compact = false }: { mode?: Mode; compact?: boolean }) {
  // Curated, offline rotation — no AI call, no credits, never fails.
  // Daily mode = stable per calendar day. Other modes rotate on each mount /
  // refresh tap so contextual nudges feel fresh.
  const [seed, setSeed] = useState(() => mode === "daily" ? today() : `${mode}-${Date.now()}`);
  useEffect(() => {
    if (mode === "daily") setSeed(today());
    else setSeed(`${mode}-${Date.now()}`);
  }, [mode]);
  const data = pickMindset(mode, seed);

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
            <button
              onClick={() => setSeed(`${today()}-${Date.now()}`)}
              aria-label="New tip"
              className="size-7 grid place-items-center rounded-full glass press"
            >
              <RefreshCw className="size-3 text-muted-foreground" />
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