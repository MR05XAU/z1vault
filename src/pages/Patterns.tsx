import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";

type Pattern = {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  candles: number;
  summary: string;
  meaning: string;
  confirmation: string;
};

const PATTERNS: Pattern[] = [
  { name: "Doji", type: "neutral", candles: 1, summary: "Open ≈ close, long wicks.", meaning: "Indecision; momentum may be stalling.", confirmation: "Wait for the next candle to break the doji's high or low." },
  { name: "Hammer", type: "bullish", candles: 1, summary: "Small body at top, long lower wick (2x body).", meaning: "Sellers rejected; potential bottom after a downtrend.", confirmation: "Bullish close above the hammer's high." },
  { name: "Inverted Hammer", type: "bullish", candles: 1, summary: "Small body at bottom, long upper wick.", meaning: "Buyers attempted control after downtrend.", confirmation: "Strong bullish follow-through next candle." },
  { name: "Hanging Man", type: "bearish", candles: 1, summary: "Looks like a hammer but at top of uptrend.", meaning: "Sellers stepping in at highs.", confirmation: "Bearish close below the body." },
  { name: "Shooting Star", type: "bearish", candles: 1, summary: "Small body at bottom, long upper wick, at top of uptrend.", meaning: "Buyers exhausted, rejection at highs.", confirmation: "Bearish close next candle." },
  { name: "Marubozu (Bullish)", type: "bullish", candles: 1, summary: "Full body, no wicks.", meaning: "Strong buying pressure end-to-end.", confirmation: "Continuation candle in same direction." },
  { name: "Marubozu (Bearish)", type: "bearish", candles: 1, summary: "Full body, no wicks.", meaning: "Strong selling pressure end-to-end.", confirmation: "Continuation candle down." },
  { name: "Spinning Top", type: "neutral", candles: 1, summary: "Small body, wicks both sides.", meaning: "Indecision after a move.", confirmation: "Direction of the next decisive candle." },
  { name: "Bullish Engulfing", type: "bullish", candles: 2, summary: "Green candle fully engulfs prior red body.", meaning: "Reversal of selling pressure.", confirmation: "Close above engulfing high." },
  { name: "Bearish Engulfing", type: "bearish", candles: 2, summary: "Red candle fully engulfs prior green body.", meaning: "Reversal of buying pressure.", confirmation: "Close below engulfing low." },
  { name: "Tweezer Bottom", type: "bullish", candles: 2, summary: "Two candles with matching lows.", meaning: "Support holding twice.", confirmation: "Bullish close above the pair." },
  { name: "Tweezer Top", type: "bearish", candles: 2, summary: "Two candles with matching highs.", meaning: "Resistance holding twice.", confirmation: "Bearish close below the pair." },
  { name: "Piercing Line", type: "bullish", candles: 2, summary: "Red then green closing above midpoint of red.", meaning: "Buyers reclaiming control.", confirmation: "Continuation up." },
  { name: "Dark Cloud Cover", type: "bearish", candles: 2, summary: "Green then red closing below midpoint of green.", meaning: "Sellers reclaiming control.", confirmation: "Continuation down." },
  { name: "Morning Star", type: "bullish", candles: 3, summary: "Red, small-body indecision, strong green.", meaning: "Trend reversal up.", confirmation: "Green close above first candle midpoint." },
  { name: "Evening Star", type: "bearish", candles: 3, summary: "Green, small-body indecision, strong red.", meaning: "Trend reversal down.", confirmation: "Red close below first candle midpoint." },
  { name: "Three White Soldiers", type: "bullish", candles: 3, summary: "Three consecutive strong green candles.", meaning: "Sustained buying pressure.", confirmation: "Volume increase across the three." },
  { name: "Three Black Crows", type: "bearish", candles: 3, summary: "Three consecutive strong red candles.", meaning: "Sustained selling pressure.", confirmation: "Volume increase across the three." },
  { name: "Bullish Harami", type: "bullish", candles: 2, summary: "Small green inside prior large red body.", meaning: "Selling pressure weakening.", confirmation: "Break above harami high." },
  { name: "Bearish Harami", type: "bearish", candles: 2, summary: "Small red inside prior large green body.", meaning: "Buying pressure weakening.", confirmation: "Break below harami low." },
];

const typeStyle: Record<Pattern["type"], string> = {
  bullish: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  bearish: "text-red-400 bg-red-400/10 border-red-400/30",
  neutral: "text-amber-300 bg-amber-300/10 border-amber-300/30",
};

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
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Reference</div>
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
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs border ${filter === t ? "bg-gold/15 border-gold/40 text-gold-bright" : "glass border-transparent text-muted-foreground"}`}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>
    }>
      <div className="px-5 py-4 space-y-3">
        {list.map((p) => (
          <article key={p.name} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{p.name}</h2>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeStyle[p.type]}`}>{p.type}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{p.candles} candle{p.candles > 1 ? "s" : ""}</div>
            <p className="text-sm mt-2">{p.summary}</p>
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