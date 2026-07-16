// Built-in trading knowledge base for the AI Tutor. Curated, static reference
// entries covering fundamentals the Z1 book may not spell out in depth — so
// the tutor can answer general trading questions (definitions, mechanics,
// concepts) while staying grounded in vetted content rather than the model's
// open-ended memory. Selected by keyword overlap and injected into context
// alongside the relevant book chapters.

export type KBEntry = { id: string; title: string; keywords: string[]; body: string };

export const KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: "candlestick-anatomy",
    title: "Candlestick anatomy",
    keywords: ["candle", "candlestick", "wick", "body", "shadow", "ohlc", "open", "close", "high", "low", "bullish", "bearish"],
    body: "A candlestick shows four prices for one time period: open, high, low, close. The rectangular BODY spans open-to-close; the thin WICKS (shadows) mark the high and low extremes. A candle is bullish (commonly green) when it closes above its open, bearish (red) when it closes below. A long wick signals a rejection — price reached that level but was pushed back. Small body + long wicks = indecision; large body + short wicks = strong conviction.",
  },
  {
    id: "candle-patterns",
    title: "Key candlestick patterns",
    keywords: ["pattern", "doji", "hammer", "engulfing", "pin bar", "shooting star", "marubozu", "spinning top", "reversal"],
    body: "Doji: open≈close, indecision, often precedes reversals at levels. Hammer: small body up top with a long lower wick — sellers rejected, bullish at support. Shooting star: mirror of hammer at highs, bearish. Bullish engulfing: a green body that fully swallows the prior red body — buyers seized control. Bearish engulfing: the reverse at highs. Pin bar: a long wick spiking through a level then closing back — a rejection signal. Patterns only matter AT a level (support/resistance), not in the middle of a range.",
  },
  {
    id: "support-resistance",
    title: "Support and resistance",
    keywords: ["support", "resistance", "level", "zone", "breakout", "flip", "role reversal", "round number"],
    body: "Support is a price zone where buying repeatedly overwhelms selling; resistance is where selling repeatedly caps price. Treat them as ZONES, not exact lines. The more times price reacts at a zone, the more significant it is. When support breaks decisively it often flips into resistance (role reversal) and vice versa. Round numbers act as psychological levels. Best trades start at these zones; the middle of a range is low-probability.",
  },
  {
    id: "trend-structure",
    title: "Trend and market structure",
    keywords: ["trend", "uptrend", "downtrend", "range", "higher high", "lower low", "structure", "swing", "consolidation"],
    body: "An uptrend is a sequence of higher highs and higher lows (HH/HL); a downtrend is lower highs and lower lows (LH/LL); no clear sequence is a range. The trend is 'broken' when the sequence breaks — e.g. an uptrend printing a lower low. 'Trade with the trend' means aligning entries with the higher-timeframe structure. In a range, trade the edges or stand aside.",
  },
  {
    id: "risk-management",
    title: "Risk management & position sizing",
    keywords: ["risk", "position size", "1%", "sizing", "account", "drawdown", "ruin", "money management", "lot", "contracts"],
    body: "Risk a small fixed fraction of your account per trade — commonly 1%. On a $10,000 account that's $100 of risk per trade. Position size = (dollar risk) / (per-unit risk in points × point value). Small risk survives losing streaks: at 1% a 10-loss streak costs ~10%; at 10% per trade the same streak wipes ~65%. Survival first, profits second.",
  },
  {
    id: "stop-loss-r",
    title: "Stop losses and R-multiples",
    keywords: ["stop", "stop loss", "stop-loss", "r multiple", "r:r", "risk reward", "target", "take profit", "reward"],
    body: "A stop loss is the price where your idea is proven wrong; set it BEFORE entering. Entry-to-stop distance = 1R (one unit of risk). If you buy at 100 with a stop at 98, 1R = 2 points; a target at 106 is a 3R trade. Thinking in R makes outcomes comparable regardless of instrument. Never widen a stop mid-trade — that's just choosing to lose more than planned. A 2:1+ reward-to-risk lets you profit even with a sub-50% win rate.",
  },
  {
    id: "expectancy",
    title: "Win rate vs expectancy",
    keywords: ["expectancy", "win rate", "edge", "probability", "profit factor", "average", "profitable"],
    body: "Win rate alone doesn't determine profitability — expectancy does. Expectancy = (win% × avg win) − (loss% × avg loss). A 40% win rate averaging +2R wins and −1R losses yields +0.2R per trade (profitable). A 70% win rate averaging +0.5R wins and −2R losses yields −0.25R (losing). This is why cutting losers fast and letting winners run is universal advice — it's the math. Profit factor = gross wins / gross losses; above 1.0 is profitable.",
  },
  {
    id: "order-types",
    title: "Order types & the spread",
    keywords: ["order", "market order", "limit order", "stop order", "bid", "ask", "spread", "slippage", "fill", "liquidity"],
    body: "Bid = highest price buyers will pay; ask = lowest price sellers accept; the gap is the SPREAD, a cost on every trade. Market order: fills immediately at the current price (you pay the spread + possible slippage). Limit order: fills only at your price or better (price control, but may not fill). Stop order: becomes a market order once a trigger price is hit — used for stop losses and breakout entries. Liquid instruments have tight spreads; illiquid ones quietly erode profits.",
  },
  {
    id: "instruments",
    title: "Instruments: stocks, futures, forex, crypto",
    keywords: ["stock", "future", "futures", "forex", "currency", "crypto", "contract", "leverage", "multiplier", "pip", "es", "nq", "gold"],
    body: "Stocks: fractional ownership of companies, regular hours. Futures: standardized leveraged contracts on indexes/commodities, near-24h; each has a $ value per point (ES=$50/pt, MES=$5, NQ=$20, MNQ=$2, MGC=$10). Forex: currency pairs, huge and highly leveraged, measured in pips. Crypto: 24/7, volatile. Leverage magnifies both gains AND losses — it's the fastest way beginners blow up. Same supply/demand/risk rules apply across all of them.",
  },
  {
    id: "indicators",
    title: "Common indicators",
    keywords: ["indicator", "moving average", "ema", "sma", "rsi", "macd", "vwap", "bollinger", "atr", "volume", "oscillator"],
    body: "Moving averages (SMA/EMA) smooth price to show trend direction and dynamic support/resistance. RSI: momentum oscillator 0–100; >70 'overbought', <30 'oversold' (in trends these can persist — not automatic reversals). MACD: momentum via two moving averages and a signal line. VWAP: volume-weighted average price, a key intraday reference for institutions. Bollinger Bands: volatility envelope around a moving average. ATR: measures volatility, useful for sizing stops. Indicators are derived from price and LAG it — they confirm, they don't predict. Price and structure lead.",
  },
  {
    id: "psychology",
    title: "Trading psychology & discipline",
    keywords: ["psychology", "discipline", "emotion", "fear", "greed", "revenge", "fomo", "tilt", "patience", "overtrading", "plan"],
    body: "Most traders lose from behavior, not strategy. Common traps: revenge trading (re-entering bigger after a loss — the #1 account killer), FOMO (chasing a move that already happened), moving stops, and overtrading out of boredom. The antidote is a WRITTEN plan (setups, risk, entry, stop, target, daily stop-loss) followed mechanically. If it's not written down, it's a mood, not a plan. Discipline over 30+ trades beats any indicator.",
  },
  {
    id: "trade-metrics",
    title: "Journaling metrics (MFE/MAE, R, expectancy)",
    keywords: ["journal", "mfe", "mae", "excursion", "metric", "review", "log", "edgebook", "statistics", "analytics"],
    body: "A journal reveals YOUR personal leaks. Track per trade: setup, entry/stop/target, result in R, and emotional state. MFE (max favorable excursion) = the best unrealized price reached — high MFE with small realized gains means you're cutting winners early. MAE (max adverse excursion) = the worst drawdown before the trade worked — helps right-size stops. Review weekly for patterns (time-of-day, symbol, setup, mood). The Edgebook journal in this app tracks all of this automatically.",
  },
  {
    id: "timeframes",
    title: "Timeframes & multi-timeframe analysis",
    keywords: ["timeframe", "time frame", "intraday", "swing", "scalp", "daily", "hourly", "anchor", "1 minute", "5 minute"],
    body: "The same market is in different trends on different timeframes simultaneously — all true at once. Use ONE anchor timeframe (e.g. 1h/4h) to define the trend you trade with, and ONE lower timeframe (e.g. 5m) purely to time entries. Two is enough. Scalping = minutes, day trading = intraday (flat by close), swing = days-to-weeks, position = weeks-to-months. Flipping through many timeframes just manufactures whatever bias you were hoping to confirm.",
  },
  {
    id: "trading-terms",
    title: "Common trading terminology",
    keywords: ["term", "long", "short", "leverage", "margin", "pip", "tick", "spread", "liquidity", "volatility", "gap", "slippage", "drawdown", "definition", "what is"],
    body: "Long = buy, betting price rises. Short = sell first, betting price falls. Margin = collateral to hold a leveraged position. Tick = smallest price increment; pip = smallest forex increment. Volatility = how much price moves. Liquidity = how easily you can enter/exit without moving price. Gap = a jump between one candle's close and the next's open. Slippage = the difference between expected and actual fill price. Drawdown = the decline from a peak in your account equity.",
  },
];

// Select the KB entries most relevant to a query, by keyword overlap.
export function selectKnowledge(query: string, limit = 4): KBEntry[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((e) => {
    let score = 0;
    for (const kw of e.keywords) if (q.includes(kw)) score += kw.includes(" ") ? 3 : 2;
    if (q.includes(e.title.toLowerCase())) score += 4;
    return { e, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e);
}
