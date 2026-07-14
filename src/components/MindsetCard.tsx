import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { pickMindset } from "@/data/mindset";

type Mode = "daily" | "after-loss" | "after-quiz-fail" | "before-session";

const today = () => new Date().toISOString().slice(0, 10);

export function MindsetCard({ mode = "daily", compact = false, theme = "gold" }: { mode?: Mode; compact?: boolean; theme?: "gold" | "mint" }) {
  // Curated, offline rotation — no AI call, no credits, never fails.
  // Daily mode = stable per calendar day. Other modes rotate on each mount /
  // refresh tap so contextual nudges feel fresh.
  const [seed, setSeed] = useState(() => mode === "daily" ? today() : `${mode}-${Date.now()}`);
  useEffect(() => {
    if (mode === "daily") setSeed(today());
    else setSeed(`${mode}-${Date.now()}`);
  }, [mode]);
  const data = pickMindset(mode, seed);
  const accentBg = theme === "mint" ? "bg-mint/10" : "bg-gold/10";
  const accentText = theme === "mint" ? "text-mint-bright" : "text-gold-bright";
  const accentText90 = theme === "mint" ? "text-mint-bright/90" : "text-gold-bright/90";
  const borderClass = theme === "mint" ? "mint-border" : "gold-border";

  return (
    <div className={`glass rounded-2xl ${compact ? "p-4" : "p-5"} ${borderClass} relative overflow-hidden`}>
      <div className={`absolute -top-16 -right-16 size-40 ${accentBg} blur-3xl rounded-full pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] ${accentText}`}>
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
          <span className={`${accentText90} font-medium`}>Tip — </span>{data.tip}
        </p>
      </div>
    </div>
  );
}