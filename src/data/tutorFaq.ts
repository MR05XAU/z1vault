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
  {
    q: "What is a pip and how do I value it?",
    a: "A pip is the 4th decimal on most FX pairs (the 2nd decimal on JPY pairs). Pip value = (0.0001 ÷ price) × lot size for non-JPY, or (0.01 ÷ price) × lot size for JPY pairs. On a standard lot (100,000 units) of EURUSD a pip ≈ $10; a mini lot ≈ $1; a micro lot ≈ $0.10.",
    keys: ["pip", "pip value", "pipette", "point"],
    ref: "Ch 11",
  },
  {
    q: "What is leverage and is it dangerous?",
    a: "Leverage lets you control a large position with a small margin deposit — 1:30 means £1 controls £30. It does NOT increase your risk by itself; YOUR POSITION SIZE does. Two traders on 1:500 leverage risking 1% of equity carry identical risk to two traders on 1:10. Leverage only becomes dangerous when you let it tempt you into oversizing.",
    keys: ["leverage", "margin", "1:30", "1:500", "gearing"],
    ref: "Ch 11",
  },
  {
    q: "What is the spread?",
    a: "The spread is the gap between the bid (sell) and ask (buy) price — your broker's cost. You enter long at the ask and exit at the bid, so every trade starts at a small loss equal to the spread. Trade liquid sessions (London/NY overlap) where spreads are tightest; avoid news minutes when they widen.",
    keys: ["spread", "bid", "ask", "slippage", "commission"],
    ref: "Ch 11",
  },
  {
    q: "What timeframes should I trade?",
    a: "Use top-down: bias from the daily/4H (where is price in the bigger picture?), refine on the 1H (structure & key levels), execute on the 15m or 5m (entry trigger). Never trade a setup on a low timeframe that contradicts the higher timeframe — the higher timeframe always wins.",
    keys: ["timeframe", "tf", "htf", "ltf", "top down", "multi timeframe"],
    ref: "Ch 10",
  },
  {
    q: "What is a break of structure (BOS)?",
    a: "A BOS is when price closes beyond the most recent swing high (in an uptrend) or swing low (in a downtrend), confirming the trend continues. Wait for the CLOSE — wicks through a level are not a break, they are usually liquidity sweeps.",
    keys: ["break of structure", "bos", "break", "structure break"],
    ref: "Ch 4",
  },
  {
    q: "What is a change of character (CHoCH)?",
    a: "CHoCH is the first break AGAINST the prevailing trend — e.g. in an uptrend price makes a lower low. It signals momentum is shifting. CHoCH alone is not a reversal; wait for a new opposing BOS to confirm the new trend before trading with it.",
    keys: ["choch", "change of character", "reversal", "shift"],
    ref: "Ch 4",
  },
  {
    q: "What is a liquidity sweep?",
    a: "A sweep (or 'stop hunt') is when price spikes through an obvious high or low, triggers retail stops, then sharply reverses. It usually leaves a long wick and prints right before the real move. Don't chase the breakout — wait for the reclaim back inside the range.",
    keys: ["sweep", "stop hunt", "raid", "fakeout", "wick"],
    ref: "Ch 9",
  },
  {
    q: "What is a session and which one should I trade?",
    a: "Three majors: Asia (low volatility, ranges), London (08:00 GMT, the day's high or low is usually set here), New York (13:30 GMT, biggest moves on the London/NY overlap until 16:00 GMT). For most setups, trade the London open or the NY AM session. Avoid the Asia chop unless your system is built for it.",
    keys: ["session", "london", "new york", "asia", "killzone", "open"],
    ref: "Ch 6",
  },
  {
    q: "How do I set a stop loss?",
    a: "Place stops on STRUCTURE, not on price. Below the swing low for a long, above the swing high for a short, plus a small buffer (5–10 pips on FX majors) for spread and wicks. Never set a stop based on how much money you're willing to lose — size the position to fit the structural stop.",
    keys: ["stop", "sl", "stop loss", "stop placement"],
    ref: "Ch 11",
  },
  {
    q: "When should I take profit?",
    a: "Pre-define the target before entry, at the next opposing liquidity pool or HTF structure level. Common rules: take 50% at 1R to lock in a free trade (move stop to break-even), let the rest run to the planned target. Never move targets further out mid-trade — that's greed talking.",
    keys: ["take profit", "tp", "target", "exit", "partial", "trail"],
    ref: "Ch 11",
  },
  {
    q: "What is a trading journal and what do I log?",
    a: "Every trade: date, pair, direction, entry, stop, target, R risked, R outcome, screenshot of entry & exit, the SETUP NAME from your plan, and one sentence on emotion. Review weekly — your edge or your leak will be obvious after 20 entries.",
    keys: ["journal", "log", "review", "track", "diary"],
    ref: "Ch 12",
  },
  {
    q: "What is revenge trading?",
    a: "Taking a trade purely to win back a loss, outside your plan. It's the #1 account killer. The fix is mechanical, not mental: hit your daily loss limit (e.g. -3R) and the platform CLOSES. No exceptions. Tomorrow always has setups; a blown account does not.",
    keys: ["revenge", "tilt", "anger", "chase", "averaging"],
    ref: "Ch 13",
  },
  {
    q: "What is a demo account good for?",
    a: "Demo is for learning the platform and proving a system mechanically — entries, exits, journaling habit. It is USELESS for practising emotion, because nothing is at stake. Once you have 20+ profitable demo trades on one setup, move to a small live account to learn the psychology.",
    keys: ["demo", "paper", "practice", "simulator"],
    ref: "Ch 12",
  },
  {
    q: "Should I trade the news?",
    a: "Beginners: NO. During red-folder news (NFP, CPI, FOMC) spreads widen 5–20×, stops slip, and price prints two directions in a minute. Wait 15–30 minutes for the dust to settle, then read the new structure. The Economic Calendar tab flags every event.",
    keys: ["news", "nfp", "cpi", "fomc", "interest rate", "fundamental", "event"],
    ref: "Ch 6",
  },
  {
    q: "What is a moving average and how do I use it?",
    a: "A moving average smooths price into a line. The 50 EMA on the 1H acts as dynamic support/resistance in trends; the 200 EMA on the daily defines the long-term bias (price above = bullish regime, below = bearish). Use MAs as confluence with structure, NEVER as a standalone signal.",
    keys: ["moving average", "ema", "sma", "ma", "50 ema", "200"],
    ref: "Ch 10",
  },
  {
    q: "What is RSI and is it useful?",
    a: "RSI measures momentum 0–100. Above 70 = overbought, below 30 = oversold — but in a strong trend RSI stays extreme for days, so 'overbought' is NOT a sell signal. The real edge is DIVERGENCE: price prints a new high but RSI doesn't, hinting momentum is fading before structure confirms it.",
    keys: ["rsi", "divergence", "oscillator", "overbought", "oversold", "momentum"],
    ref: "Ch 10",
  },
  {
    q: "What pairs should a beginner trade?",
    a: "Stick to ONE major pair for your first 100 trades — EURUSD or GBPUSD. They have the tightest spreads, the cleanest technicals, and you learn that pair's personality. Adding pairs adds noise, not edge. Master one, then expand.",
    keys: ["pair", "pairs", "eurusd", "gbpusd", "which", "best pair", "beginner"],
    ref: "Ch 6",
  },
  {
    q: "How much capital do I need to start?",
    a: "Enough that 1% risk is meaningful to you but not painful — typically £200–£1,000 to learn live, after you've proven a system on demo. You will NOT live off £500 — early capital is tuition fees for your psychology. Plan to add to the account from income, not from winning trades.",
    keys: ["capital", "start", "how much", "money", "deposit", "minimum"],
    ref: "Ch 11",
  },
  {
    q: "What is a prop firm challenge?",
    a: "A prop firm gives you funded capital after you pass an evaluation (usually hit a profit target like 8–10% without breaching a daily drawdown like 5% or a total drawdown like 10%). It's not free money — most fail because they treat the eval like a sprint. Trade your normal plan; the target arrives if your edge is real.",
    keys: ["prop", "prop firm", "ftmo", "funded", "challenge", "evaluation"],
    ref: "Ch 12",
  },
  {
    q: "What is a doji and what does it mean?",
    a: "A doji is a candle where open and close are nearly identical — a tiny body with wicks on both sides. It signals INDECISION. On its own it means nothing; at a key level after a strong move it can mark exhaustion. Always read candles in CONTEXT, never as standalone signals.",
    keys: ["doji", "indecision", "pinbar", "pin bar", "hammer", "shooting star"],
    ref: "Ch 2",
  },
  {
    q: "What is an engulfing candle?",
    a: "A bullish engulfing fully covers the previous bearish candle's body, closing above its open — a sign buyers took control. Bearish engulfing is the mirror. They're high-quality entry triggers when they form AT a level (order block, FVG, key S/R), and meaningless in the middle of a range.",
    keys: ["engulfing", "engulf", "bullish engulfing", "bearish engulfing"],
    ref: "Ch 2",
  },
  {
    q: "What is premium and discount?",
    a: "Within any leg of price, the upper half is the 'premium' (expensive — look to sell) and the lower half is the 'discount' (cheap — look to buy). Use the 50% level (equilibrium) of the most recent impulse to define them. Buying in premium or selling in discount is how retail bleeds out.",
    keys: ["premium", "discount", "equilibrium", "50%", "fibonacci"],
    ref: "Ch 8",
  },
  {
    q: "What is an inducement?",
    a: "An inducement is a minor swing high/low placed by smart money to lure retail into entering early, before the real move. You'll often see a small pullback that grabs liquidity ABOVE the inducement before price drops to your actual order block. Wait for the inducement to be swept BEFORE entering.",
    keys: ["inducement", "trap", "fake", "lure"],
    ref: "Ch 9",
  },
  {
    q: "What is a mitigation block?",
    a: "When price returns to an old order block and reacts, that area becomes 'mitigated.' A mitigation block is the second touch — often a higher-probability entry than the original OB because liquidity has been cleared and the level has proven it holds.",
    keys: ["mitigation", "mitigated", "retest", "second touch"],
    ref: "Ch 8",
  },
  {
    q: "How long until I'm consistently profitable?",
    a: "Realistic answer: 2–4 years of focused practice, including a blown account or two. Most quit in year one. Survival > speed: stay small, journal everything, and treat each trade as a data point, not a paycheck. Consistency comes from process, not from prediction.",
    keys: ["how long", "profitable", "consistent", "consistency", "timeline", "years"],
    ref: "Ch 13",
  },
  {
    q: "What is overtrading?",
    a: "Taking trades that don't meet your full plan, usually out of boredom or FOMO. Symptom: more than 2–3 trades per day on a swing system. Fix: pre-define EXACTLY how many setups can exist per session, write them down before market open, and refuse anything else.",
    keys: ["overtrading", "overtrade", "boredom", "fomo", "too many"],
    ref: "Ch 13",
  },
  {
    q: "What is a kill zone?",
    a: "A killzone is a high-probability window where institutional volume concentrates: London open 07:00–10:00 GMT, NY open 12:30–15:00 GMT, NY PM 18:00–20:00 GMT. Setups inside these windows resolve faster and cleaner than the same setup at 03:00 GMT in Asia.",
    keys: ["kill zone", "killzone", "window", "session time"],
    ref: "Ch 6",
  },
];

/** Public list useful for "show me everything" UIs. */
export function allFaq(): FaqEntry[] {
  return TUTOR_FAQ;
}
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