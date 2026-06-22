/**
 * Curated tutor Q&A — fixed answers grounded in the Z1 INSIGHTS book.
 * Used by the offline Tutor so users get instant, reliable answers without
 * any AI / network call.
 */
export interface FaqEntry {
  q: string;
  a: string;
  /** lowercase keywords/aliases used for matching */
  keys: string[];
  /** optional chapter pointer e.g. "Ch 3" */
  ref?: string;
}

export const TUTOR_FAQ: FaqEntry[] = [
  {
    q: "What is a candlestick?",
    a: "A candlestick shows the open, high, low and close for one period. The body is between open and close — green/white when close > open (bullish), red/black when close < open (bearish). The wicks (shadows) show how far price reached but failed to hold.",
    keys: ["candle", "candlestick", "ohlc", "wick", "body", "shadow"],
    ref: "Ch 2",
  },
  {
    q: "What is market structure?",
    a: "Market structure is the sequence of highs and lows. An uptrend prints higher highs (HH) and higher lows (HL). A downtrend prints lower highs (LH) and lower lows (LL). A break of structure (BOS) confirms continuation; a change of character (CHoCH) signals a possible reversal.",
    keys: ["structure", "hh", "ll", "bos", "choch", "trend", "higher high", "lower low"],
    ref: "Ch 4",
  },
  {
    q: "What is support and resistance?",
    a: "Support is a price floor where buyers have stepped in before; resistance is a ceiling where sellers have. They are zones, not exact lines. Once broken, support often flips to resistance (and vice versa) — that flip is called polarity.",
    keys: ["support", "resistance", "supply", "demand", "polarity", "flip"],
    ref: "Ch 5",
  },
  {
    q: "What is a fair value gap (FVG)?",
    a: "A fair value gap is a three-candle imbalance where price moved so fast that the wicks of candle 1 and candle 3 do not overlap, leaving a gap in candle 2. Price often returns to fill that gap before continuing.",
    keys: ["fvg", "fair value", "imbalance", "gap"],
    ref: "Ch 7",
  },
  {
    q: "What is an order block?",
    a: "An order block is the last opposing candle before a strong move that breaks structure. A bullish OB is the last down candle before a strong up move; a bearish OB is the last up candle before a strong drop. Price often returns to mitigate it.",
    keys: ["order block", "ob", "mitigation", "smc"],
    ref: "Ch 8",
  },
  {
    q: "What is liquidity?",
    a: "Liquidity sits where stop-losses cluster — above swing highs (buy-side liquidity) and below swing lows (sell-side liquidity). Large players push price into these pools to fill their orders before reversing.",
    keys: ["liquidity", "stop", "sweep", "raid", "pool", "buy side", "sell side"],
    ref: "Ch 9",
  },
  {
    q: "How do I size a position?",
    a: "Risk a FIXED % of your account per trade (1–2% max). Position size = (account × risk%) ÷ (entry − stop). The stop distance dictates lot size — never the other way round. If the maths gives you a tiny size, the stop is too wide for that pair.",
    keys: ["position size", "risk", "lot", "sizing", "money management"],
    ref: "Ch 11",
  },
  {
    q: "What is risk-to-reward?",
    a: "R:R compares what you risk to what you target. 1:3 means risking 1 to make 3. With a 1:3 R:R you only need to win ~33% of trades to break even. Set the stop and target BEFORE entry — never after.",
    keys: ["risk reward", "rr", "r:r", "target", "tp", "sl"],
    ref: "Ch 11",
  },
  {
    q: "What is a trading plan?",
    a: "A written set of rules covering: market & session, setup criteria, entry trigger, stop placement, target, max risk per trade, daily loss limit, and journal review. If a trade doesn't tick every box, you don't take it.",
    keys: ["plan", "rules", "checklist", "process"],
    ref: "Ch 12",
  },
  {
    q: "How do I control emotions?",
    a: "Emotion is downstream of risk. If a loss hurts, your size is too big. Cap risk so any single loss is meaningless. Use a hard daily loss limit (e.g. 3R) — hit it and you're done for the day. Walk away from screens between setups.",
    keys: ["emotion", "psychology", "fear", "greed", "tilt", "mindset", "discipline"],
    ref: "Ch 13",
  },
  {
    q: "What is confluence?",
    a: "Confluence is multiple independent reasons lining up at the same level — e.g. a higher-timeframe order block + an FVG + a key session high. The more confluences, the higher the probability. Two is the minimum to act on.",
    keys: ["confluence", "alignment", "multi timeframe", "htf"],
    ref: "Ch 10",
  },
  {
    q: "Why do I keep losing?",
    a: "Almost always one of: oversizing (>2% risk), no plan, moving stops, revenge trading after a loss, trading low-probability setups out of boredom. Journal every trade with screenshots — patterns appear in 20 trades.",
    keys: ["losing", "lose", "losses", "blow", "blew", "drawdown"],
    ref: "Ch 13",
  },
];

export function matchFaq(query: string): FaqEntry | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of TUTOR_FAQ) {
    let score = 0;
    for (const k of entry.keys) {
      if (q.includes(k)) score += k.length;
    }
    if (entry.q.toLowerCase().includes(q)) score += 20;
    if (score > (best?.score ?? 0)) best = { entry, score };
  }
  return best && best.score >= 3 ? best.entry : null;
}