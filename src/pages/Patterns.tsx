import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { PATTERNS, typeStyle, type Pattern } from "@/data/patterns";
import { CandleGlyph } from "@/components/CandleGlyph";

export default function Patterns() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Pattern["type"]>("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PATTERNS.filter((p) => (filter === "all" || p.type === filter) && (!needle || p.name.toLowerCase().includes(needle) || p.summary.toLowerCase().includes(needle)));
  }, [q, filter]);

  return (
    <MobileShell bottomNav={<BottomNav />} header={
      <header className="px-5 pt-6 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-xl glass press" aria-label="Back">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">Reference</div>
            <h1 className="display text-3xl font-medium mt-1">Candlestick patterns.</h1>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic mt-2">Educational reference. Always wait for confirmation; patterns alone are not a trading signal.</p>
        <div className="mt-4 relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patterns..." className="pl-9" />
        </div>
        <div className="mt-3 flex gap-2">
          {(["all","bullish","bearish","neutral"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs border ${filter === t ? "bg-mint/15 border-mint/40 text-mint-bright" : "glass border-transparent text-muted-foreground"}`}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>
    }>
      <div className="px-5 py-4 space-y-3">
        {list.map((p) => (
          <article key={p.name} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-surface-elevated/60 border border-border-strong p-2 grid place-items-center">
                <CandleGlyph candles={p.glyph} height={56} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium">{p.name}</h2>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeStyle[p.type]}`}>{p.type}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.candles} candle{p.candles > 1 ? "s" : ""}</div>
                <p className="text-sm mt-2">{p.summary}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <div><span className="text-muted-foreground">Meaning: </span>{p.meaning}</div>
              <div><span className="text-muted-foreground">Confirmation: </span>{p.confirmation}</div>
            </div>
          </article>
        ))}
        {!list.length && <p className="text-sm text-muted-foreground text-center py-12">No patterns match.</p>}
      </div>
    </MobileShell>
  );
}