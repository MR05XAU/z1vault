import type { Candle } from "@/components/CandleGlyph";

export type Pattern = {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  candles: number;
  summary: string;
  meaning: string;
  confirmation: string;
  glyph: Candle[];
};

// All glyph coords use the 0..100 SVG viewBox (top=0, bottom=100).
export const PATTERNS: Pattern[] = [
  {
    name: "Doji",
    type: "neutral",
    candles: 1,
    summary: "Open ≈ close, long wicks.",
    meaning: "Indecision; momentum may be stalling.",
    confirmation: "Wait for the next candle to break the doji's high or low.",
    glyph: [{ c: "d", bt: 50, bb: 50, wt: 15, wb: 85 }],
  },
  {
    name: "Hammer",
    type: "bullish",
    candles: 1,
    summary: "Small body at top, long lower wick (2x body).",
    meaning: "Sellers rejected; potential bottom after a downtrend.",
    confirmation: "Bullish close above the hammer's high.",
    glyph: [{ c: "g", bt: 20, bb: 38, wt: 18, wb: 92 }],
  },
  {
    name: "Inverted Hammer",
    type: "bullish",
    candles: 1,
    summary: "Small body at bottom, long upper wick.",
    meaning: "Buyers attempted control after downtrend.",
    confirmation: "Strong bullish follow-through next candle.",
    glyph: [{ c: "g", bt: 60, bb: 80, wt: 8, wb: 82 }],
  },
  {
    name: "Hanging Man",
    type: "bearish",
    candles: 1,
    summary: "Looks like a hammer but at top of uptrend.",
    meaning: "Sellers stepping in at highs.",
    confirmation: "Bearish close below the body.",
    glyph: [{ c: "r", bt: 20, bb: 38, wt: 18, wb: 92 }],
  },
  {
    name: "Shooting Star",
    type: "bearish",
    candles: 1,
    summary: "Small body at bottom, long upper wick, at top of uptrend.",
    meaning: "Buyers exhausted, rejection at highs.",
    confirmation: "Bearish close next candle.",
    glyph: [{ c: "r", bt: 60, bb: 80, wt: 8, wb: 82 }],
  },
  {
    name: "Marubozu (Bullish)",
    type: "bullish",
    candles: 1,
    summary: "Full body, no wicks.",
    meaning: "Strong buying pressure end-to-end.",
    confirmation: "Continuation candle in same direction.",
    glyph: [{ c: "g", bt: 12, bb: 88, wt: 12, wb: 88 }],
  },
  {
    name: "Marubozu (Bearish)",
    type: "bearish",
    candles: 1,
    summary: "Full body, no wicks.",
    meaning: "Strong selling pressure end-to-end.",
    confirmation: "Continuation candle down.",
    glyph: [{ c: "r", bt: 12, bb: 88, wt: 12, wb: 88 }],
  },
  {
    name: "Spinning Top",
    type: "neutral",
    candles: 1,
    summary: "Small body, wicks both sides.",
    meaning: "Indecision after a move.",
    confirmation: "Direction of the next decisive candle.",
    glyph: [{ c: "d", bt: 45, bb: 58, wt: 14, wb: 88 }],
  },
  {
    name: "Bullish Engulfing",
    type: "bullish",
    candles: 2,
    summary: "Green candle fully engulfs prior red body.",
    meaning: "Reversal of selling pressure.",
    confirmation: "Close above engulfing high.",
    glyph: [
      { c: "r", bt: 40, bb: 62, wt: 30, wb: 70 },
      { c: "g", bt: 22, bb: 78, wt: 18, wb: 82 },
    ],
  },
  {
    name: "Bearish Engulfing",
    type: "bearish",
    candles: 2,
    summary: "Red candle fully engulfs prior green body.",
    meaning: "Reversal of buying pressure.",
    confirmation: "Close below engulfing low.",
    glyph: [
      { c: "g", bt: 40, bb: 62, wt: 30, wb: 70 },
      { c: "r", bt: 22, bb: 78, wt: 18, wb: 82 },
    ],
  },
  {
    name: "Tweezer Bottom",
    type: "bullish",
    candles: 2,
    summary: "Two candles with matching lows.",
    meaning: "Support holding twice.",
    confirmation: "Bullish close above the pair.",
    glyph: [
      { c: "r", bt: 35, bb: 70, wt: 28, wb: 88 },
      { c: "g", bt: 30, bb: 65, wt: 22, wb: 88 },
    ],
  },
  {
    name: "Tweezer Top",
    type: "bearish",
    candles: 2,
    summary: "Two candles with matching highs.",
    meaning: "Resistance holding twice.",
    confirmation: "Bearish close below the pair.",
    glyph: [
      { c: "g", bt: 30, bb: 65, wt: 12, wb: 72 },
      { c: "r", bt: 35, bb: 70, wt: 12, wb: 78 },
    ],
  },
  {
    name: "Piercing Line",
    type: "bullish",
    candles: 2,
    summary: "Red then green closing above midpoint of red.",
    meaning: "Buyers reclaiming control.",
    confirmation: "Continuation up.",
    glyph: [
      { c: "r", bt: 28, bb: 72, wt: 22, wb: 78 },
      { c: "g", bt: 42, bb: 80, wt: 38, wb: 84 },
    ],
  },
  {
    name: "Dark Cloud Cover",
    type: "bearish",
    candles: 2,
    summary: "Green then red closing below midpoint of green.",
    meaning: "Sellers reclaiming control.",
    confirmation: "Continuation down.",
    glyph: [
      { c: "g", bt: 28, bb: 72, wt: 22, wb: 78 },
      { c: "r", bt: 20, bb: 58, wt: 16, wb: 62 },
    ],
  },
  {
    name: "Morning Star",
    type: "bullish",
    candles: 3,
    summary: "Red, small-body indecision, strong green.",
    meaning: "Trend reversal up.",
    confirmation: "Green close above first candle midpoint.",
    glyph: [
      { c: "r", bt: 30, bb: 70, wt: 24, wb: 76 },
      { c: "d", bt: 78, bb: 84, wt: 74, wb: 90 },
      { c: "g", bt: 28, bb: 68, wt: 22, wb: 74 },
    ],
  },
  {
    name: "Evening Star",
    type: "bearish",
    candles: 3,
    summary: "Green, small-body indecision, strong red.",
    meaning: "Trend reversal down.",
    confirmation: "Red close below first candle midpoint.",
    glyph: [
      { c: "g", bt: 30, bb: 70, wt: 24, wb: 76 },
      { c: "d", bt: 16, bb: 22, wt: 10, wb: 26 },
      { c: "r", bt: 32, bb: 72, wt: 26, wb: 78 },
    ],
  },
  {
    name: "Three White Soldiers",
    type: "bullish",
    candles: 3,
    summary: "Three consecutive strong green candles.",
    meaning: "Sustained buying pressure.",
    confirmation: "Volume increase across the three.",
    glyph: [
      { c: "g", bt: 58, bb: 88, wt: 54, wb: 92 },
      { c: "g", bt: 38, bb: 68, wt: 34, wb: 72 },
      { c: "g", bt: 18, bb: 48, wt: 14, wb: 52 },
    ],
  },
  {
    name: "Three Black Crows",
    type: "bearish",
    candles: 3,
    summary: "Three consecutive strong red candles.",
    meaning: "Sustained selling pressure.",
    confirmation: "Volume increase across the three.",
    glyph: [
      { c: "r", bt: 18, bb: 48, wt: 14, wb: 52 },
      { c: "r", bt: 38, bb: 68, wt: 34, wb: 72 },
      { c: "r", bt: 58, bb: 88, wt: 54, wb: 92 },
    ],
  },
  {
    name: "Bullish Harami",
    type: "bullish",
    candles: 2,
    summary: "Small green inside prior large red body.",
    meaning: "Selling pressure weakening.",
    confirmation: "Break above harami high.",
    glyph: [
      { c: "r", bt: 18, bb: 82, wt: 14, wb: 86 },
      { c: "g", bt: 42, bb: 60, wt: 38, wb: 64 },
    ],
  },
  {
    name: "Bearish Harami",
    type: "bearish",
    candles: 2,
    summary: "Small red inside prior large green body.",
    meaning: "Buying pressure weakening.",
    confirmation: "Break below harami low.",
    glyph: [
      { c: "g", bt: 18, bb: 82, wt: 14, wb: 86 },
      { c: "r", bt: 42, bb: 60, wt: 38, wb: 64 },
    ],
  },
];

export const typeStyle: Record<Pattern["type"], string> = {
  bullish: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  bearish: "text-red-400 bg-red-400/10 border-red-400/30",
  neutral: "text-amber-300 bg-amber-300/10 border-amber-300/30",
};