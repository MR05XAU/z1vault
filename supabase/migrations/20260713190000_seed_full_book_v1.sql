-- Full Z1 INSIGHTS manuscript (Volume 01, First Edition) — 30 chapters.
-- Non-destructive upsert by chapter_number: existing chapters (e.g. the
-- 5-chapter placeholder seed) are updated IN PLACE, preserving their id so
-- any real user_progress/highlights/bookmarks/quizzes referencing them stay
-- intact. New chapters (6-30) are inserted fresh. No rows are deleted.
-- Chapters 1-5 keep their old quiz questions until regenerated from Admin ->
-- "Regenerate ALL quizzes via AI"; chapters 6-30 will have no quizzes until
-- that same regenerate step is run.

INSERT INTO public.book_chapters (chapter_number, title, subtitle, content, estimated_minutes, order_index, is_background) VALUES

(1, 'Purpose of This Book', 'Why this book exists, and why survival comes first', $ch1$# Part 1: The Foundation

# Chapter 1: Purpose of This Book

I have spent over seven years trading in various markets, from the high volatility of crypto to the strategic demands of forex, and most recently the complex world of stocks and futures. Each market has presented unique challenges and valuable lessons, shaping my approach and strengthening my understanding of what it takes to succeed.

Like many of you, my motivation has always been to continually learn, refine my skills, and become a more profitable and disciplined trader. This book is the resource I wish I had when I first started, a comprehensive guide to everything I have learned through mistakes, hard-earned insights, and practical experience.

I will walk you through my strategy, the journey of creating it, and the steps to develop a trading approach that fits your own goals. Whether you are a newcomer or a trader looking to sharpen your skills, this book offers an honest look at the realities of trading, and I am sharing everything I have learned to help you achieve success with fewer setbacks and a deeper understanding of what trading really takes.

## Background

Over seven years of trading I have navigated the ups and downs of some of the most unpredictable markets in the world. I started in crypto, where profits and losses each added to my understanding of what it takes to survive and grow. I then expanded into forex, discovering new strategies and unique challenges in the currency markets. More recently I ventured into stocks, futures, and options, applying everything I had learned to yet another financial landscape. Each market has taught me something new, and my goal with this book is to share all of it.

One thing this book will return to repeatedly, because it cannot be said enough, is survival. Most traders do not fail because the markets are impossible. They fail because greed pushes them into sizes they cannot afford and emotion pushes them into trades they should never take. Everything in this book is built around avoiding that outcome first, and building from there.

## The Noise Problem

For most people, trading begins not with education but with a post: a screenshot, a lifestyle, someone claiming they made thousands last week. Just follow their calls. Join the group.

This causes more damage than any losing trade. People learn to copy before they learn to think, and when the loss comes, and it always comes, they have no framework to process it. Only frustration and the urge to find a better signal.

The trading education space has genuine teachers in it. But it also has people whose primary skill is selling the appearance of success. Learning to tell the difference matters. Ask whether they explain their reasoning or just post results. Ask whether they show losses with the same honesty as wins. Ask whether their income comes from trading or from selling trading content. Ask whether they are building your independence or your dependence.

This book is designed to make you independent. Nothing here requires you to follow anyone or return for the next instalment. The goal is a framework strong enough to evaluate any idea, including the ones written here, on its own merits.$ch1$, 6, 1, true),

(2, 'What Trading Really Is', 'Precision, not prediction', $ch2$# Chapter 2: What Trading Really Is

Trading is the act of buying and selling financial assets with the aim of profiting from changes in their prices. That definition sounds simple, but it hides a difficult reality: profit does not come merely from being right about direction. It comes from being right enough, at the right time, with the right size, with the right risk control, and with the emotional discipline to follow the plan all the way through.

This is one of the first important distinctions between trading and long-term investing. Long-term investing often allows a person to rely more heavily on broad economic growth, business quality, or a long enough time horizon to smooth out mistakes. Trading compresses time. It asks for more precision. A trader must decide when to enter, when to scale, when to reduce risk, when to take profit, and when to accept that the market has invalidated the original idea.

## The Major Markets

- **Crypto.** BTC, ETH, altcoins, and perpetuals. Trades 24/7, highly volatile (meaning prices swing dramatically), narrative-heavy, and internally correlated (most coins rise and fall together). The key lesson: volatility is only opportunity if risk is controlled.
- **Stocks.** Individual shares and ETFs (baskets of stocks you can buy as one unit). Regulated, company-specific, and earnings-driven. Good for learning both technical and fundamental analysis.
- **Forex.** Currency pairs (like EUR/USD) and metals. Very liquid (meaning it is easy to buy and sell without moving the price much), macro-driven, and institution-heavy. Liquidity does not make a market easy.
- **Futures.** Contracts to buy or sell an asset at a set price in the future. Involves margin (borrowed capital), leverage (amplified exposure), and fast price discovery. Learn the specifications before trading live.
- **Options.** Contracts that give you the right, but not the obligation, to buy or sell an asset. Direction, time, and volatility all matter. Defined-risk structures are safer starting points for learners.

## Asset Classes Behave Differently

One of the worst beginner habits is treating all charts as though they behave the same way. A small-cap altcoin, an index future, a large-cap stock, and a short-dated option contract may all produce candlesticks, but the forces behind those candlesticks differ dramatically. A skilled trader does not learn charts in isolation. They learn how price behaviour interacts with market structure. That is the beginning of real understanding.$ch2$, 7, 2, false),

(3, 'The Five Stages of Skill', 'Where you actually are', $ch3$# Chapter 3: The Five Stages of Skill

A useful model for understanding your own progress is the five-stage development ladder. It deserves to appear early because it gives you a map of what progress feels like, and more importantly, where you currently are.

## The Five Stages

- **Stage 1, Unconscious incompetence:** You do not know what you do not know. This is the most dangerous phase because confidence is disconnected from reality. You feel like you could win on every trade.
- **Stage 2, Conscious incompetence:** You start to realise how much you do not understand. This can feel uncomfortable, but it is healthy. Awareness has begun.
- **Stage 3, The struggle phase:** You are learning concepts, but execution is inconsistent. This is usually the longest and most frustrating stage.
- **Stage 4, Conscious competence:** You can perform the process, but only with concentration and deliberate thought.
- **Stage 5, Unconscious competence:** Good decision-making becomes instinctive. You have trained deeply enough that good process survives pressure.

This framework matters because many beginners believe they are far more advanced than they are. Stage 1 and Stage 5 can feel similar from the inside. Both involve acting quickly and with confidence. The difference is that Stage 1 confidence is ignorance while Stage 5 confidence is earned pattern recognition.

> **Figure 3.1.** Skill level versus confidence across the five stages of trader development. Confidence peaks early and drifts down through the struggle phase before skill overtakes it; skill itself climbs steadily and slowly from stage to stage.

## Practical Application

When you begin reading the rest of this book, assume you are somewhere between Stage 1 and Stage 3. That is not an insult; it is an advantage. It means you can stop pretending and start learning. You do not need perfect confidence. You need honest feedback, repetition, and systems that reduce the damage you can do while improving.$ch3$, 6, 3, true),

(4, 'Technical Analysis Without the Fantasy', 'Reading price as it is, not as you wish it were', $ch4$# Part 2: Market Understanding

# Chapter 4: Technical Analysis Without the Fantasy

Technical analysis is the study of price, volume, and market structure to estimate probabilities (the likelihood that something will happen). It does not tell the future with certainty. It gives the trader a way to organise information and frame decisions.

This is a crucial distinction because many beginners misuse technical analysis by treating it as fortune telling. The better use is structural. Technical analysis helps answer questions such as: Is this market trending or consolidating? Where are the major reaction zones? Where is the trade idea invalidated? Is momentum confirming or weakening?

One of the most valuable lessons I have learned is this: all timing methods have flaws. Trend systems whipsaw (give false signals) in ranging conditions. Mean-reversion tools (tools that assume price returns to average) fail badly in strong trends. Indicators can remain overbought or oversold far longer than new traders expect. There is no perfect entry tool. There is no indicator that guarantees money. Once this is understood, a trader can stop searching for a magic signal and start building a process.

## Lessons Learned

- Technical analysis estimates probabilities. It does not predict certainty.
- Every timing method has a flaw. Learn the flaw before you rely on the method.
- Stop searching for a magic signal. Start building a repeatable process.

## Charts and Timeframes

Charts are the foundation of technical analysis. Candlestick charts are particularly useful because they compress open, high, low, and close into one visual unit. Yet the real power lies in how timeframes are used together.

A beginner should learn to separate context from execution. The higher timeframe (daily, weekly) defines the larger trend, major zones, and broader market structure. The lower timeframe (1-hour, 15-minute) helps with entry, stop placement, and timing. This prevents one of the most common beginner errors: staring at a low timeframe chart without any anchor to the bigger picture.

Without an anchor timeframe, every small move feels important, every dip feels like an opportunity, and every candle becomes a reason to panic. A long-term investor obsessing over a one-hour RSI is making the same mistake as someone examining a paint chip on a ship while ignoring the ocean around it.

## Support, Resistance, and Trend Structure

Support is an area where demand (buying) has historically appeared strongly enough to stop or slow price declines. Resistance is an area where supply (selling) has historically appeared strongly enough to stop or slow advances. These zones matter because price memory exists in markets: traders remember where they bought, sold, got trapped, took profits, or got stopped out.

Trend structure matters even more than perfectly drawn lines. An uptrend is typically a sequence of higher highs and higher lows. A downtrend is a sequence of lower highs and lower lows. A range is a condition in which price oscillates between relatively equal highs and lows without establishing directional dominance.

Beginners often make their lives harder by fighting obvious trends. A simple but powerful rule: if you want higher probability, align yourself with the prevailing structure rather than against it.

## Indicators and Oscillators

Indicators should be treated as assistants, not dictators.

- **Moving Averages (MA):** Smooth price data to help reveal trend direction. Useful for trend filters, dynamic support and resistance, and simple rule-based systems. Their weakness is lag. They react after the price has already moved.
- **RSI (Relative Strength Index):** A momentum oscillator from 0 to 100. Often used to identify overbought and oversold conditions, but the beginner must immediately learn that overbought does not mean 'must fall' and oversold does not mean 'must rise.' In strong trends, RSI can remain extended for long periods.
- **MACD:** Helps assess momentum shifts and potential trend transitions. Works best when aligned with structure rather than used in isolation.
- **Volume:** Helps estimate participation and conviction. Strong directional movement on strong volume generally carries more informational value than the same movement on weak volume. Volume is not a guarantee of continuation, but it often helps distinguish genuine interest from weak drift.

> **Figure 4.1.** Timeframes, trend structure (HH/HL), and support & resistance zones — three panels showing higher-timeframe vs lower-timeframe context, higher highs/higher lows defining the trend, and the support/resistance bands price has reacted to.

## Reading Multiple Timeframes Together

One of the most powerful habits a trader can develop is the discipline of checking at least two timeframes before making any decision. The higher timeframe sets the context: is this market in a clear trend, or is it ranging? The lower timeframe provides the timing: where precisely can an entry be placed with a tight, logical stop?

A common error is using a single timeframe for everything. The trader who only looks at the one-hour chart may take a long trade that looks perfect in isolation, not realising the daily chart has been in a downtrend for three weeks. The position then struggles from the moment it opens because the broader structure is working against it. Multi-timeframe analysis does not eliminate risk. It eliminates avoidable risk, which is a different and more useful thing entirely.

## The Deeper Lesson

The real value of indicators is not that they predict perfectly. It is that they make observations testable. Once a rule can be stated clearly, it can be evaluated. That moves trading away from vague intuition and toward evidence-based decision-making.

This is the quiet shift that separates a frustrated beginner from a developing trader. The beginner wants the indicator to be right. The developing trader wants the indicator to be measurable, because a measurable rule can be tested, refined, kept, or discarded on evidence rather than on feeling. Every concept in the chapters that follow is built to be examined in exactly this way, which is why the same discipline of definition and testing returns again and again throughout the book.

The three-panel figure above illustrates this in practice. The left panel shows price across two timeframes, separated by the gold line. The middle panel identifies the higher highs and higher lows that define the trend. The right panel marks the support and resistance zones where price has historically reacted. These are not separate tools. They are three lenses on the same market, and reading all three together is where real analytical skill begins. A trader who only ever looks at one lens will eventually be surprised by a move that the other two lenses had already been warning about.$ch4$, 12, 4, false),

(5, 'Market Structure, FVG, BOS, and Order Blocks', 'Where the market has been, and where it is likely going', $ch5$# Chapter 5: Market Structure, FVG, BOS, and Order Blocks

Once you understand what a trend looks like, the next step is to understand how trends break, pause, and continue. This chapter gives you three concepts that work together: Break of Structure (BOS), Fair Value Gap (FVG), and Order Blocks (OB). Think of them as a three-part reading system for understanding where the market has been, where it is likely going, and where to enter.

## What Market Structure Means

Market structure is the sequence by which price organises itself. It answers the question: Is price advancing, declining, or balancing? Once structure is understood, many complex-looking charts become simpler because the trader stops obsessing over every candle and starts focusing on the key swings that actually define control.

> **Figure 5.1.** Higher highs and higher lows defining bullish market structure.

## Fair Value Gap (FVG)

Imagine price is moving steadily along, then suddenly shoots upward so fast that almost no selling happened along the way. That empty stretch, where price flew through without much back-and-forth, is a Fair Value Gap. It is identified using three candles:

- Candle 1 has a high point.
- Candle 2 is the big impulse move. It shoots up with force.
- Candle 3 has a low point.

The FVG is the space between the high of candle 1 and the low of candle 3. Price often comes back to revisit this gap later, like returning to a missed turn on a road trip. It is an area of interest, not a guaranteed reversal point. The usefulness of an FVG increases when it aligns with the broader trend and a clear break of structure.

> **Figure 5.2.** A Fair Value Gap: the three-candle imbalance where price moved too fast, leaving an unfilled zone.

## Break of Structure (BOS)

A Break of Structure happens when price breaks through a meaningful prior swing point, signalling that the previous trend may be changing. In an uptrend, losing an important higher low can warn that buyers are losing control. In a downtrend, reclaiming an important lower high can warn that sellers are losing control.

The key word is meaningful. New traders count every minor wiggle as a BOS. Better traders define their timeframe first, then identify which swings actually matter on that timeframe. Think of it like this: a car swerving slightly in a lane is not a crash, but hitting the barrier is. Same idea.

> **Figure 5.3.** Break of Structure in the trend direction followed by a Fair Value Gap entry zone.

## Order Blocks (OB)

An Order Block is the final opposing candle (or small group of candles) just before a strong impulsive move that breaks structure. The idea is that large institutions placed significant orders in that zone, so price often returns there before continuing. Think of it like a launch pad: rocket goes up, comes back down briefly, then relaunches. That brief return is the order block retest.

> **Figure 5.4.** The order block retest zone after an impulsive BOS move.

Order blocks are not hard science. Their practical value lies in confluence, meaning they become powerful when combined with other signals, not used alone.

## Putting Them Together

These three concepts are most powerful as a combined framework, not as separate tools. Here is a clean workflow:

- Identify the anchor timeframe and determine if the market is trending or consolidating.
- Mark the key swing highs and lows that define structure.
- Wait for a meaningful BOS in the direction of the higher-timeframe bias.
- Locate the nearest FVG or order block likely to provide a structured entry.
- Place the stop where the idea is invalidated, not just where the loss feels uncomfortable.
- Take profit into opposing liquidity, major zones, or a pre-defined plan.

## Case Study: BOS and FVG in a Trend Continuation Setup

Picture a market making higher highs and higher lows on the four-hour chart. Price pushes upward sharply, leaving a visible imbalance (FVG) behind. Then it pulls back and breaks a minor swing, creating a BOS in the direction of the bigger trend. The trader waits for price to retrace into the FVG, enters only if reaction confirms, and places a stop below the structural low that would invalidate the continuation idea.

This is not profitable because 'FVG works.' It is profitable when it works because trend, structure, entry zone, and invalidation all align into one coherent framework. Remove any one of those, and the edge weakens significantly.

A complete trade idea built from this framework always has four parts: a directional bias from the higher timeframe, a trigger from the BOS, a precise entry zone from the FVG or order block, and a defined stop that invalidates the whole thesis. Without all four, it is not a trade idea. It is a guess dressed up as one. This distinction is what separates traders who improve from traders who repeat the same mistakes.

## A Simple Rule to Carry Forward

Before entering any trade using these concepts, ask yourself three questions. First: what is the higher timeframe telling me, is this market in a clear trend or in consolidation? Second: has structure actually broken, or am I forcing a BOS on noise? Third: does my entry zone have a clear invalidation point, or am I just hoping price does not go lower? If you cannot answer all three cleanly, the trade is not ready. Wait for the setup that answers all three without hesitation.

## Lessons Learned

- Structure matters more than isolated candles.
- FVGs and order blocks are zones of interest, not certainties.
- BOS becomes more useful when judged from meaningful swings rather than noise.
- Confluence, multiple signals pointing the same way, makes any setup stronger.
- A trade needs bias, trigger, entry zone, and invalidation. Missing one weakens the whole.$ch5$, 13, 5, false),

(6, 'Boxes, Zones, and the Language of Consolidation', 'Reading the pause before the move', $ch6$# Chapter 6: Boxes, Zones, and the Language of Consolidation

Before price picks a direction and runs, it usually pauses. That pause has a shape. Learning to read that shape is one of the most practical skills in all of trading, because it tells you when a market is resting versus when it is about to move.

This chapter covers two related ideas that build on each other naturally: the Zone-to-Zone framework and the Box System. Start with zones. They are the foundation. Boxes are simply a more specific version of zone behaviour.

## Zone-to-Zone Thinking

Think of the market like a bus route. Price moves from one stop (zone) to the next. It does not randomly wander. It tends to move from one meaningful level of acceptance to the next, then pause again.

Once price establishes itself above or below a major level, the next obvious destination is often the next major zone. This makes trading clearer because the trader can define three things before entering: where price currently is, where it is likely headed if accepted, and where the idea is wrong if acceptance fails.

Rather than chasing noise, zone-to-zone thinking teaches you to map terrain. That mapping process also creates logical stop and target placement, which immediately improves risk control.

## How Zones Connect to Indicators

Here is how zones link to the tools you already know. When price sits inside a zone and RSI shows oversold conditions, it is not a coincidence. Both are reading the same exhaustion. When price breaks out of a zone on strong volume, MACD often confirms the shift in momentum at the same moment. The indicators are not separate from zone logic. They are a different lens on the same information. Use zones to frame where you are, and indicators to confirm when to act.

## The Box System

A box is a specific type of zone, a period of non-trending behaviour in which price moves sideways between a clear support boundary and a clear resistance boundary. It looks like price is trapped, bouncing back and forth between a floor and a ceiling.

The real insight is not merely that price consolidates. It is that consolidations store potential energy. Think of a coiled spring: the longer you compress it, the more force it releases. A long box often precedes a larger trend than a short box because more time has been spent building consensus, frustration, and trapped positioning inside the range.

The breakout is therefore not just a line break. It is a transition from equilibrium (balance) to expansion. Traders who understand this wait patiently for the breakout rather than guessing which direction it will go.

> **Figure 6.1.** A simple box: support (S) and resistance (R) with a breakout.

## Boxes Within Boxes (Boxception)

Boxes can exist within larger boxes. A market can consolidate on the daily chart while printing smaller boxes on the four-hour or one-hour chart. This matters because missed breakouts do not always mean missed opportunity.

If the larger trend remains healthy, smaller boxes often form along the way, creating secondary entries for disciplined traders who refused to panic-buy the first breakout. Patience is not passivity. It is waiting for a better bus at the next stop.

## Case Study: The Box Breakout Principle

A stock (like Roku) spends an extended period going nowhere, building what looks like boredom rather than opportunity. Most people lose interest. Then the major box breaks, and the trend accelerates sharply.

Even traders who missed the first breakout were not locked out. Smaller boxes formed during the move, offering additional trend-continuation entries. The lesson: trend entries do not require panic buying. They require patience during compression, and discipline once the expansion is underway.

> **Figure 6.2.** Roku-style box breakout: consolidation, then trend expansion with volume.

## Practical Application

When using boxes, the trader should ask:

- Is the market trending or non-trending?
- Where are the true range boundaries with multiple touches?
- How long has the box lasted? Longer boxes store more energy.
- Is the breakout aligned with the higher-timeframe structure?
- What is the nearest opposing zone if the breakout holds?

## Common Mistakes

- Treating every sideways movement as a tradeable box. Not all ranges are the same.
- Buying in the middle of the range instead of near structure or on confirmation.
- Chasing a breakout without a plan.
- Ignoring whether the broader market is supporting the move.

## Lessons Learned

- Zones give you the map. Boxes give you the setup.
- Longer consolidations often lead to bigger moves.
- A missed breakout is not a missed trade. Secondary entries exist.
- Patience during compression is a skill, not a weakness.$ch6$, 11, 6, false),

(7, 'Relative Strength, Choosing Where to Place Capital', 'Back the leader, not the laggard', $ch7$# Chapter 7: Relative Strength, Choosing Where to Place Capital

One of the most overlooked lessons in trading is that not all opportunities deserve equal attention. The relative strength framework teaches the trader to stop asking only 'What do I like?' and start asking 'Where is capital already showing leadership?'

## What It Means in Plain English

Relative strength is just a comparison. You are not looking at one asset in isolation. You are asking: compared to something else, is this asset stronger or weaker?

Think of it like a school class. If one student scores 70 on every test and another scores 90, the second student has relative strength, not because 70 is bad, but because if you had to back one of them, you back the one already performing better. Markets work the same way. When money flows into one sector faster than another, that is relative strength in action.

The practical question is simple: if I have money to put to work, am I putting it in the market that is already moving, or the one that is lagging behind? Relative strength stops you from picking the slow runner while ignoring the fast one.

## The Ratio Chart, How You Actually See It

On TradingView, you can create a ratio chart by typing one ticker divided by another. For example, typing QQQ/SPY shows whether the Nasdaq 100 (technology-heavy index) is outperforming or underperforming the broader S&P 500. That is it. One line. Goes up, QQQ is winning. Goes down, SPY is winning. Sits flat in a box, neither is clearly leading yet.

> **Figure 7.1.** QQQ vs SPY price (left) and their ratio chart (right). When the ratio breaks up, QQQ is the leader.

You already know how to read boxes and breakouts from Chapter 6. Apply exactly the same thinking here. When the ratio breaks out of a box upward, leadership has shifted. That is your signal to concentrate capital in the leader.

- **Ratio rising:** the top asset (QQQ) is the stronger choice right now.
- **Ratio falling:** the bottom asset (SPY) is outperforming.
- **Ratio in a box:** neither is clearly leading. Wait for the breakout.

## A Real Example: QQQ vs SPY

During one clear period, QQQ and SPY moved in step, neither pulling ahead. The ratio sat flat. Then the ratio broke upward. QQQ began rising faster and further than SPY. A trader who recognised this and concentrated exposure in QQQ captured significantly more of the move than someone who split capital evenly across both. The lesson is not always buy QQQ. The lesson is: find who is leading, then back that market while the ratio trend holds.

## One Important Rule: Leadership Rotates

Relative strength is not permanent. A market that leads today may lag next month. Leadership shifts, sector by sector, asset by asset, cycle by cycle. This is why you do not find the leader once and forget about it. You check your ratios as part of your weekly review and update your view when the evidence changes.

## How This Fits Into Everything Else

Relative strength does not replace zones, boxes, or structure. It layers on top of everything you have already learned. Once you have found a valid setup using the tools from Chapters 4, 5, and 6, relative strength is the final filter: am I in the right market? Use structure to find the trade. Use relative strength to confirm you are playing in the right game.

## Lessons Learned

- Not all setups deserve equal capital. Back the leader, not the laggard.
- A ratio chart is just a price chart of one thing versus another. Same tools apply.
- When the ratio breaks out of a box, that is your signal to concentrate.
- Leadership rotates. Check your ratios weekly, not yearly.$ch7$, 9, 7, false),

(8, 'Fundamental Analysis and Why Drivers Matter', 'What is actually driving the price', $ch8$# Part 3: Fundamental and Flow-Based Thinking

# Chapter 8: Fundamental Analysis and Why Drivers Matter

Technical analysis helps a trader read price. Fundamental analysis helps a trader understand what may be driving it. The two work together, not in competition.

In stocks, fundamentals include revenue growth, margins, earnings, debt, cash flow, management execution, and valuation. In macro-sensitive markets like forex or bonds, fundamentals include inflation, interest rates, employment data, central-bank behaviour, and geopolitical stress. Crypto requires a more flexible approach because many digital assets are not businesses in the traditional sense. Their fundamentals may include token issuance rates, burn mechanics (coins being permanently removed from circulation), network activity, developer adoption, staking yield (rewards for locking up coins), regulatory trajectory, and narrative strength.

The goal of fundamental analysis is not to replace technical analysis. It is to provide depth. A technically attractive setup backed by a strong fundamental tailwind may be more durable than an identical chart with no underlying support. Think of it like a boat going with the current versus against it: same boat, very different experience.$ch8$, 5, 8, false),

(9, 'Sentiment, Narrative, and Market Psychology in Motion', 'Why the crowd moves before the story does', $ch9$# Chapter 9: Sentiment, Narrative, and Market Psychology in Motion

Markets are not moved only by logic or valuation. They are moved by people reacting to information, to price itself, and to each other. Sentiment, the overall mood of the crowd, is often the deciding factor between a technical setup that works and one that fails.

## Why News Lags Behind Price

An important point that traders often miss: news is lagging. News tells you what happened, not what will happen. By the time most traders see a headline, the move may already be well underway or nearly exhausted. This does not mean news is irrelevant. It means news is often less useful than people think unless it is integrated into a broader view of positioning, structure, and liquidity. The chart moves before the story appears in the press.

## How Narrative Works

People do not buy stories in the abstract. They buy stories when price makes the story feel believable. This is one of the most sophisticated ideas in trading. Price often leads narrative adoption, and narrative adoption then brings in new demand, which reinforces price. The cycle becomes reflexive (self-reinforcing).

Think of it like a fire. Sentiment is the oxygen. A small spark (early price move) gets more oxygen (narrative and FOMO), which makes the fire bigger, which attracts more attention, which adds more oxygen. The fire eventually burns out, but not before those who bought the story late get burned.

## Three Sentiment States You Need to Know

- **Euphoria.** Everyone is buying, mainstream news is covering it, your neighbour is asking how to invest. This is usually close to a peak.
- **Capitulation.** Everyone gives up. 'It's dead.' 'Never going back up.' This is often close to a bottom.
- **Disbelief.** Price starts recovering but most people assume it is a dead-cat bounce (a temporary rise before more falls). This is often where the real move begins for those paying attention.

> **Figure 9.1.** Sentiment drives the cycle: euphoria at peaks, capitulation at troughs, both are traps.

## Case Study: Tesla and Forced Demand

Tesla's inclusion in the S&P 500 is a classic example of structural demand meeting a sticky shareholder base. Index funds tracking the S&P 500 had to buy Tesla once it entered the index. They had no choice. Many existing holders were unwilling to sell. The result was a powerful imbalance: known future buying pressure still produced a major move despite being widely discussed in advance.

The lesson is not that every known event is tradable. It is that some events cannot simply be 'priced in' because the flows themselves, the actual buying, are what matters, not the discussion beforehand.

## Case Study: IPO Lockup Expiration

When a company floats on the stock market (IPO), insiders, founders, early investors, and employees are usually prevented from selling their shares for a fixed period (the lockup). When that lockup expires, they can suddenly sell. This floods the market with price-insensitive supply (sellers who need to sell regardless of price) and often pressures the stock downward.

Both the Tesla and lockup case studies teach the same thing: the key force is not whether an asset is 'good' or 'bad'. It is who must buy or must sell, and how sensitive they are to price.

## Lessons Learned

- News confirms what price has already decided. Read charts first.
- Narrative brings in late buyers, which can push price further, then crash it.
- Identify who is forced to buy or sell. Those flows are more predictable than opinions.
- Euphoria and capitulation are both traps for the unprepared.$ch9$, 10, 9, false),

(10, 'Scalping, Day Trading, and Why Speed Isn''t Skill', 'Excitement is not an edge', $ch10$# Part 4: Strategy and Execution

# Chapter 10: Scalping, Day Trading, and Why Speed Isn't Skill

Scalping and day trading appeal strongly to beginners because they appear exciting, fast, and controllable. In reality, they are often the most punishing styles for people without structure, emotional control, and screen experience.

Scalping seeks small, quick moves. Day trading closes positions within the same session. Both styles require fast execution, high focus, and a tolerance for noise. They also tend to magnify emotional mistakes because the trader receives constant feedback and constant temptation to overtrade.

One of the most consistent lessons I have learned is that new traders often mix styles. They attempt to swing trade on the daily chart while reacting emotionally to five-minute candles. They use a short-term oscillator to manage a long-term position. They read one timeframe for context and another for panic. This is one of the fastest ways to destroy clarity. The remedy is to choose a style, define the anchor timeframe, and build the analysis around that scale.

## Case Study: The Shorting Professionalism Lesson

When it comes to shorting (betting on price falling) around crisis-like events, professionals may act within minutes of new information, using blockchain intelligence tools, automated bots, and specialised workflows. The educational point is not that beginners should try to beat professionals at their own game. It is that competition in very short-term trading is far stronger than most people realise. Speed is not an edge by itself. In many cases, speed simply means being late against someone faster.

## Lessons Learned

- Excitement is not edge. Slow and deliberate beats fast and emotional.
- Choose one style and one anchor timeframe, then stick to it.
- Short-term trading has professional competition you cannot see.$ch10$, 6, 10, false),

(11, 'Swing Trading and the Anchor Timeframe', 'The productive middle ground', $ch11$# Chapter 11: Swing Trading and the Anchor Timeframe

Swing trading occupies a productive middle ground. Positions are held for days or weeks rather than minutes or months. This gives the trader enough time to think, enough room for structure to matter, and enough frequency to keep learning. It is therefore one of the best developmental styles for serious beginners.

A central lesson in swing trading is the importance of the anchor timeframe. Choosing a 'north star', often the daily chart, simplifies the decision process. The daily trend defines directional bias. Lower timeframes can still be used for execution, but the larger framework remains stable. This reduces confusion and prevents the trader from constantly changing opinion based on random intraday movement.

## Moving Average Crossover as a Training Framework

A moving average crossover strategy is not the final answer to trend following, but it is a useful learning tool because it is simple, discrete, and testable. A crossover system gives clear long or short signals, avoids repainting (changing past signals), and allows for statistical evaluation. Its educational value is that it forces the trader to think systematically rather than emotionally.

The deeper lesson is equally important: no single strategy is perfect. Even a good trend model will whipsaw in sideways conditions. This is why edges must be layered, not idolised.

## Case Study: Trend-Following Versus Reality

The 'dream' version of trend following looks like this: one clean entry, one long sustained move, one profitable exit. The reality: multiple false signals, flat trades, repeated whipsaw, and frustration. A valid strategy can still look terrible over short windows. Understanding this prevents traders from abandoning good methods during normal variance.

## Lessons Learned

- Choose an anchor timeframe before making decisions.
- Simple systems reveal structure better than complex ones during learning.
- Evaluate strategy behaviour statistically, not based on the last three trades.
- A whipsaw is not proof a strategy is useless. It is normal variance.$ch11$, 8, 11, false),

(12, 'Long-Term Investing and Simplicity', 'Survive long enough to learn', $ch12$# Chapter 12: Long-Term Investing and Simplicity

A principle I strongly believe in for beginners: if you are still struggling with which assets to pick, keep it simple and dollar-cost average (invest a fixed amount regularly regardless of price) into BTC and ETH while you learn. This advice matters because beginners often overestimate the value of finding the 'best' small-cap coin and underestimate the value of surviving long enough to learn.

Long-term investing is not the same as passive neglect. It still requires portfolio construction, position sizing, and emotional discipline. But it allows a beginner to focus on larger market cycles, major structural trends, and broader asset behaviour rather than trying to micromanage every fluctuation.

## Case Study: Bitcoin Halving as a Structural Supply Event

Bitcoin's halving reduces the rate of new coins issued to miners every four years. Miners are structural sellers: they often need to sell coins to cover electricity, equipment, payroll, and taxes. If the amount of newly mined Bitcoin falls while demand remains stable or grows, structural sell pressure declines and the supply-demand balance tightens.

Halving is not a magic switch that guarantees an instant price explosion. The daily flow impact is often small relative to total daily volume. Its power comes from persistence through time, a slight but durable demand-supply mismatch in an already tight market. That is far more realistic than simply saying 'halving means price goes up.'

## The Altcoin Correlation Trap

Many altcoins are highly correlated to Bitcoin, meaning they mostly move with BTC rather than independently. If your portfolio contains many different tokens that all behave like amplified BTC, you are not diversified. You are holding ten versions of the same risk. The practical takeaway: measure correlation first, then decide whether the extra complexity is actually being rewarded.

## Lessons Learned

- Simple, consistent investing often beats complicated token picking for beginners.
- Halving affects supply gradually, not instantly. Patience is required.
- Check correlation before assuming diversification. Many altcoins are just amplified BTC.$ch12$, 7, 12, false),

(13, 'Profit Taking and the Hardest Part of Winning', 'Exits deserve as much planning as entries', $ch13$# Chapter 13: Profit Taking and the Hardest Part of Winning

Many traders spend all their time asking where to buy and very little time asking how to exit well. This is backwards. Entry matters, but profit-taking decisions often determine whether gains become realised capital or evaporate as beautiful but useless unrealised numbers.

## Why Profit-Taking is Difficult

The psychological problem is easy to understand. If you take profit too early, you fear missing the real move. If you take profit too late, you watch large gains round-trip (disappear back to where you started). This tension is especially strong in crypto because the market can produce extreme upside expansion before savage reversals.

## The Three Profit-Taking Models

- **Linear:** Sell a fixed amount at each new all-time high. Simple but can be too conservative. It does not adapt to the pace of the move.
- **Exponential:** The amount sold doubles each time. Elegant in theory but often too aggressive in practice. Portfolio exposure can fall to near zero after only a small number of consecutive new highs.
- **Incremental:** The amount sold increases by a fixed additional amount each time. Sits between the two extremes and may better preserve upside while becoming progressively more aggressive as the move matures.

> **Figure 13.1.** The three profit-taking models across successive all-time highs — linear, exponential, and incremental compared side by side as remaining position percentage.

The preferred version in my experience was an incremental '+2%' style, though this should not be treated as universal truth. It suited a particular market behaviour and may not generalise perfectly. The enduring lesson: exits deserve systemisation just as much as entries do.

## Rebalancing Versus Letting Winners Run

Rebalancing should be treated as a deliberate choice rather than a default behaviour. Rebalancing dampens volatility and harvests gains from winners into laggards. Not rebalancing allows winners to compound but increases concentration and emotional strain. Rebalancing is an implicit mean-reversion bet. Letting winners run is an implicit momentum bet. Both are valid in the right conditions.

## Lessons Learned

- Exits deserve as much planning as entries.
- The incremental model offers a balanced approach to trimming positions.
- Rebalancing and holding are both valid choices. Know which one you are making, and be clear on why.$ch13$, 8, 13, false),

(14, 'Building a Trading Plan, Risk First', 'What risk can you survive?', $ch14$# Part 5: Risk, Portfolio and Trading Plans

# Chapter 14: Building a Trading Plan, Risk First

Before you enter a single trade, you need a plan. Not a vague idea, a written, specific plan that answers the same questions every time. A trading plan is what separates a trader from a gambler. It is the difference between acting with intention and reacting with emotion.

## Setting Goals: Short-Term vs Long-Term

Start by being honest about what you are actually trying to achieve and over what timeframe. Short-term goals and long-term goals require different strategies, different risk tolerances, and different levels of daily involvement.

- **Short-term goals:** Learning a specific strategy, completing 30 demo trades without breaking rules, understanding position sizing. These are process goals, focused on behaviour, not profit.
- **Long-term goals:** Building a second income stream, growing a prop firm account, achieving consistent monthly returns. These are outcome goals, but they are only reachable by achieving the process goals first.

New traders set the long-term goal first and skip the short-term foundations. That is backwards. Set the process goal first. Let the outcome follow. A trader who focuses on executing their plan correctly will make money before a trader who focuses on making money and ignores their plan.

## The Common Mistakes That Destroy Plans

Even traders with solid plans fail because of behavioural pitfalls that are entirely avoidable once you know to watch for them.

- **Overtrading:** Taking too many trades, often out of boredom or the urge to 'make something happen.' More trades does not mean more profit. It usually means more fees, more emotional decisions, and more noise. Quality beats quantity every time.
- **Ignoring stop-losses:** Moving your stop further away when price approaches it, or removing it entirely because you 'believe' in the trade. A stop-loss is not a suggestion. It is the definition of where your idea is wrong.
- **Failing to adapt:** Continuing to apply a strategy that worked in trending conditions when the market has shifted to ranging, or vice versa. The market changes. Your approach must respond.
- **Revenge trading:** Entering a trade immediately after a loss to 'get it back.' This is emotion masquerading as a trade idea. It is almost always a losing decision made at the worst possible time.

These are not rare mistakes. They are the most common reasons traders fail. Name them, recognise them in yourself, and build rules into your plan that explicitly prevent each one.

## Risk First

This deserves to be one of the central rules of the book: the right first question is not 'What return do I want?' but 'What risk can I survive?' This is difficult for beginners because marketing and social media condition people to focus on the upside. They want to know how quickly they can get rich. Professionals reverse the order. They begin with downside, variance (how much results fluctuate), correlation, and sizing.

## Position Sizing

Position sizing is the process of deciding how much capital to allocate to a trade based on account size and the distance to invalidation. A trader who risks too much on one idea is not being brave. They are surrendering the right to survive normal variance. Survive first. Profit second.

> **Figure 14.1.** Max dollar risk per trade at 1%, 2%, and 5% across account sizes from \$1k to \$50k — the same percentage rule scales linearly with account size.

## Correlation Risk

It is possible to be overexposed even when holding many positions, if those positions all depend on the same market move. The portfolio is concentrated whether the trader realises it or not. Many altcoins are simply leveraged expressions of the same underlying Bitcoin movement. Ten positions that all go up and down together is not diversification. It is one big position dressed in ten different costumes.

## Practical Framework

Before entering a trade, the trader should know:

- Where the idea is invalidated.
- How much account equity is at risk if invalidated.
- Whether this position overlaps with existing positions.
- Whether the trade is worth taking relative to available alternatives.

## The Mistakes That End Accounts

Most blown accounts follow the same pattern. It is rarely one catastrophic trade. It is a sequence: a win that builds confidence, confidence that builds size, size that builds exposure, and then one bad read that unravels everything built before it.

Greed is the most common trigger. Not the obvious kind where someone bets everything on a single trade. The quiet kind, where a trader starts moving size up after a good run, stops respecting their own rules because things have been going well, and convinces themselves the market owes them more. It does not.

Emotion is the accelerant. A loss triggers frustration. Frustration triggers a revenge trade. The revenge trade is bigger than it should be, taken in worse conditions than the original, with no real plan behind it. Two losses become four. A manageable drawdown becomes a crisis.

The antidote is not discipline through willpower. It is rules decided before the market opens, size, risk, conditions, that do not change because of how the last trade felt. Professionals are not emotionless. They are pre-decided.

## Lessons Learned

- A good run is not a signal to increase risk. It is a signal to protect what you have built.
- Never make a sizing decision while a trade is live.
- Revenge trading is not recovery. It is the second mistake compounding the first.
- The market does not know your account is down. It does not owe you anything back.
- Risk first. Know your maximum loss before you enter.
- Position size from the stop, not from how much you want to make.
- Ten correlated positions is not ten trades. It is one trade, ten times over.$ch14$, 15, 14, false),

(15, 'Leverage, Why Most People Use It Backwards', 'Magnifies skill, it does not create it', $ch15$# Chapter 15: Leverage, Why Most People Use It Backwards

Few concepts are abused more often than leverage. Leverage magnifies skill. It does not create skill. This means leverage is neutral in itself. In capable hands, it can improve capital efficiency. In poor hands, it accelerates failure. The market does not care whether the trader is emotionally ready. Margin calls and liquidations are indifferent to hope.

Leverage means borrowing capital to increase the size of your position beyond what your own funds allow. 10x leverage means a 1% price move becomes a 10% gain or loss on your capital. 100x leverage means a 1% move wipes your entire account.

## The Two Stages of Leverage

- **Stage 1, Beginner leverage:** Used for capital efficiency by a trader who already understands risk and position structure. Small amounts. Defensive.
- **Stage 2, Advanced leverage:** Applied to an already profitable system to amplify proven edge. Only accessible after Stage 1 is mastered.

Most new traders try to skip straight to Stage 2. They want leverage as a shortcut rather than a multiplier. That is exactly backwards. No one earns the right to use leverage by wanting it. That right must be built through competence.

## Case Study: Leverage in the Wrong Hands

People treating leverage like a lottery ticket assume larger exposure solves the problem of insufficient capital or insufficient patience. In truth, leverage exposes a trader's flaws faster. A disciplined spot trader may survive a bad read. A leveraged trader with the same read may be forced out before the thesis has any chance to recover.

## Lessons Learned

- Leverage magnifies what already exists, skill or lack of it.
- Learn risk and structure first. Add leverage only after profitability is proven.
- A liquidation does not care about your trading thesis.$ch15$, 6, 15, false),

(16, 'Building a Balanced Portfolio', 'Owning things that do not all fail together', $ch16$# Chapter 16: Building a Balanced Portfolio

A balanced portfolio is not about owning many things. It is about owning things that do not all fail at the same time. The goal is to spread exposure across ideas that respond to different conditions, so that one bad market environment does not take the whole account with it.

The trap most beginners fall into is mistaking quantity for diversification. Holding ten assets feels safer than holding one, but if all ten rise and fall together, the risk has not been reduced at all. True balance comes from genuine differences in what drives each position, not from the number of positions held.

Think in terms of correlation, time horizon, and conviction. Some capital can sit in long-term core holdings that you intend to keep through volatility. Some can be allocated to active trades with defined risk. Keeping these buckets separate prevents a short-term trade from contaminating a long-term investment, and stops a long-term conviction from being abandoned during a normal pullback.

## Lessons Learned

- Diversification is about behaviour, not the number of positions.
- Separate long-term holdings from active trades so they do not contaminate each other.
- Balance means surviving the environment you did not expect.$ch16$, 4, 16, false),

(17, 'Choosing a Broker and Prop Firms', 'Regulation first, everything else second', $ch17$# Chapter 17: Choosing a Broker and Prop Firms

Not all brokers are equal and choosing the wrong one is a mistake that has nothing to do with your trading ability.

Look for regulation first. If a broker cannot tell you who regulates them, move on. Check that client funds are held separately from the broker's own money. Understand the fee structure, spreads, commissions, and overnight fees all eat into returns. Test the withdrawal process early. Platform reliability matters too. Test it before committing serious capital.

## Prop Firms

Prop firms let you trade with the firm's capital. You pass an evaluation, demonstrate consistent risk management, and split the profits. The appeal is access to larger capital without risking your own. Evaluation rules are strict: drawdown limits, daily loss limits, minimum trading days. Breaking the rules ends the account regardless of profitability. Choose prop firms with the same scrutiny as brokers. The space has plenty of operations better at collecting evaluation fees than paying out profits.

Used correctly, a prop firm is a legitimate way to scale. Used without understanding the rules, it is an expensive lesson.$ch17$, 5, 17, false),

(18, 'Taxes and Record Keeping', 'A portion was never yours', $ch18$# Chapter 18: Taxes and Record Keeping

Trading profits are taxable. The specifics vary by country but the principle is universal: if you are making money from markets, a portion of it belongs to the government.

Short-term trades are typically taxed harder than long-term holds. If you are actively trading, your profits are usually treated as income rather than capital gains. The difference can be significant, and it is worth understanding which category your activity falls into before the bill arrives, not after.

A habit that saves a great deal of stress is setting aside a percentage of every realised profit as you go, rather than spending it and scrambling later. Treating the tax portion as money that was never yours in the first place keeps you from being caught short when the bill is due.

Crypto deserves particular attention because in many places a taxable event is triggered not only when you cash out, but every time you swap one asset for another. A year of active trading can generate a long trail of these events, and reconstructing them afterwards is far harder than recording them as they happen.

Record keeping from day one is the most important habit. Every entry, every exit, every fee. Trying to reconstruct a year of trading activity at tax time is painful and avoidable.

Find an accountant who understands trading. The cost of good advice is almost always less than the cost of getting it wrong.

## Lessons Learned

- Trading profit is taxable almost everywhere. Plan for it from the start.
- Set aside the tax portion as you go. Treat it as money that was never yours.
- Keep records as you go, not at the end of the year.
- A trading-literate accountant pays for themselves.$ch18$, 6, 18, false),

(19, 'Losses, Drawdowns, and Recovery', 'Getting your discipline back, not just your money', $ch19$# Part 6: Psychology and Behavioural Survival

# Chapter 19: Losses, Drawdowns, and Recovery

Every trader loses. The real test is not whether losses occur, but what happens next. Many accounts are not destroyed by the first meaningful loss. They are destroyed by the emotional chain reaction that follows.

## The Recovery Ladder Trap

A trader loses 15% to 20%, then feels compelled to make it back quickly. They begin taking lower-quality setups with larger sizes because the account pain feels urgent. Losses compound. This is the recovery ladder trap: trying to shorten the recovery process by increasing risk when judgment is already degraded. You cannot sprint your way out of a hole you dug by running too fast.

> **Figure 19.1.** The recovery trap: a 50% loss requires a 100% gain just to break even. The required gain rises far faster than the loss it is recovering from.

## Case Study: Recovering from a Massive Wipeout

The first night after a significant account wipeout brings exhaustion and near-despair. The next morning, the only healthy response is a return to work and system design, not revenge trades. Meaningful recovery begins with analysis, not denial. The trader goes back to work on the process: what went wrong, what was ignored, what the system said versus what emotion decided. This transforms pain into iteration.

## What Recovery Actually Means

Recovery is not only about getting the money back. It is about getting your discipline back. That means protecting capital, staying patient, and returning to the market only when your thinking is clear again. A trader who handles losses well will usually recover better than a trader who constantly fights them.

Fighting a loss means revenge trading, oversizing, and forcing setups that are not there. Handling a loss means stepping back, reviewing what happened honestly, reducing size, and waiting for the right conditions to return. The market will always be there. Your capital may not be if you rush back before you are ready.

## Lessons Learned

- A drawdown is information before it is a tragedy.
- Reduce size after meaningful losses. This is not weakness, it is survival.
- Focus on restoring process quality before restoring account size.
- Recovery means getting your discipline back, not just your money back.
- Loss review is part of the edge. Skipping it is skipping improvement.$ch19$, 8, 19, false),

(20, 'Fear, Greed, and the Source of Most Damage', 'Confidence is procedural, not motivational', $ch20$# Chapter 20: Fear, Greed, and the Source of Most Damage

Trading psychology is often presented as vague self-help. In reality, it is practical and measurable because emotions directly distort execution. Fear causes early exits. Greed causes oversized positions. Hope delays stop-losses. Frustration creates revenge trades. Each of these has a direct, quantifiable cost.

## The Difference Between Confidence and Competence

Real confidence is not motivational. It is procedural. It comes from preparation, repetition, and deep familiarity with the system being used. You do not talk yourself into confidence. You build it by repeatedly executing a process you have rehearsed and understand. A surgeon who has performed a procedure 500 times is confident, not because they told themselves they could, but because they have proved it through repetition.

## Emotional Management in Practice

Emotional management is not about suppressing feelings. It is about building systems that make feelings less influential in the moment. The pre-decided plan is the antidote to in-the-moment emotion. If you have already decided where your stop is, where your target is, and what size you are using, then emotion has far fewer decisions left to corrupt.

Think of it like a pilot's pre-flight checklist. The checklist is not there because pilots are careless. It is there because under pressure, even competent people miss things. Your trading plan is your pre-flight checklist.

## Resilience is Trained, Not Inherited

Resilience is built through repeated exposure under controlled conditions. A trader who has never reviewed losses honestly, never rehearsed plan execution, and never built position sizes small enough to tolerate variance will crack under pressure much faster than one who has done that work. Start small enough that you can trade without adrenaline. Increase size only when the process is stable.

## Case Study: Following Signals Without Understanding Them

A trader follows a signal without understanding the rationale behind it. The position moves against them, stress builds, doubt takes over, and they manually exit just before the market reverses to the intended target. The issue was not bad psychology alone. It was missing context. The trader lacked the framework to understand why the setup was still valid, where the real support was, and why the stop had been placed where it was.

Signals should be the last piece of content you consume, not the first. Without understanding the underlying reasoning, you will sabotage good trades because your emotions will fill the knowledge gap.

## Practical Application

- Reduce size when emotion rises above normal.
- Never make management decisions for the first time while the trade is live.
- Journal not only the result but also the emotional state at entry and exit.
- Build confidence through preparation, not self-talk.
- If you cannot explain why your stop is where it is, your stop is in the wrong place.

## Lessons Learned

- Emotions are not the enemy. Unmanaged emotions are.
- Plans made before the trade protect you from yourself during the trade.
- Resilience is built in small increments, not found in crisis moments.
- Understand every trade you take. Following signals blindly is not trading, it is gambling.$ch20$, 9, 20, false),

(21, 'Scaling Up as Your Account Grows', 'Bigger size changes the psychology', $ch21$# Chapter 21: Scaling Up as Your Account Grows

Growing your account size is not just a financial transition. It is a psychological one. The same risk percentage feels different when the numbers behind it are larger. A 1% loss on a small account is manageable. That same 1% on a significantly larger account can trigger emotions that were never there before, even though nothing about the trade or the plan has changed.

This is where most traders make the mistake. They assume that because their strategy works at one size, it will feel the same at a larger one. It rarely does. The discipline that felt easy at small size gets tested in a completely different way when real money starts to feel real.

The answer is not to jump. Scale gradually. Let your psychology adjust to each level before moving to the next. If emotions are rising above what they were at the previous size, that is a signal, not to stop, but to slow down. The strategy does not need to change. You need time to normalise the new numbers before they start influencing decisions they should not be influencing.

Risk rules do not change as size increases. If anything they become more important. The same position sizing, the same stop placement, the same maximum daily loss limits, these are not beginner tools. They are what professionals use precisely because the stakes are higher.

## Lessons Learned

- Bigger size changes the psychology even when the plan stays the same.
- Scale gradually and let your emotions normalise at each level.
- Rising emotion at a new size is a signal to slow down, not to abandon the plan.
- Risk rules matter more as the account grows, not less.$ch21$, 5, 21, false),

(22, 'Options From the Ground Up', 'The right, but not the obligation', $ch22$# Part 7: Options and Advanced Structures

# Chapter 22: Options From the Ground Up

Options are contracts that grant the right, but not the obligation, to buy or sell an underlying asset at a specified price (strike price) before expiration. Think of it like a deposit on a house. You pay a small amount now for the right to buy at an agreed price later, but you do not have to if you change your mind. The deposit (premium) is your maximum loss.

Options trading is not merely about direction. Time and implied volatility (the market's expectation of how much price will move) matter too. An option can lose money even if the underlying moves in the expected direction, if the move is too slow or if expectations of future volatility collapse.

## The Essential Concepts

- **Moneyness:** 'In the money' means the option already has value if exercised. 'Out of the money' means it does not yet, but could. 'At the money' means the strike is roughly at the current price.
- **Time decay (theta):** Options lose value as expiration approaches, especially short-dated ones. Time is an option buyer's enemy and an option seller's friend.
- **Implied volatility (IV):** Higher expected future movement makes options more expensive. Lower expected movement makes them cheaper. IV spikes around events (earnings, news) and collapses after.

## Defined-Risk Spreads

- **Bull call spread:** Bullish outlook, pay a debit, upside capped at the top strike.
- **Bear put spread:** Bearish outlook, pay a debit, downside target defined.
- **Bull put spread:** Bullish outlook, collect premium, defined max loss.
- **Bear call spread:** Bearish outlook, collect premium, defined max loss.
- **Iron condor:** Range-bound outlook, defined risk on both sides. Collect premium if price stays within a range.

## Case Study: Bull Call Spread in a Trending Market

A stock trading at 95 breaks out with strength. The trader buys the 95 call and sells the 105 call for a net debit of 3.00. Maximum risk: 300 per contract. Maximum reward: 700 if price reaches or exceeds 105 by expiry. If the spread appreciates to 5.50 earlier in the trade, closing realises a profit while freeing capital and removing risk.

## Case Study: Iron Condor in a Range-Bound Market

A stock moving between roughly 190 and 210 with elevated implied volatility presents a different environment. The trader sells an out-of-the-money call spread and an out-of-the-money put spread, collecting premium if price remains within the range. The educational objective is not to glorify premium selling. It is to show the importance of fitting the strategy to the environment. An iron condor is sensible in a stable range; it is dangerous in a directional breakout.

## Why Liquidity Matters So Much

Options with wide bid-ask spreads (the gap between what buyers offer and sellers want), weak open interest, and poor participation can punish a trader even before the market moves. Liquid underlyings such as major indices and large-cap names reduce these problems significantly.

## Common Mistakes

- Chasing high implied volatility because the premium looks attractive, then getting crushed by IV collapse.
- Ignoring liquidity and trading obscure, thinly traded underlyings.
- Selling both sides of a market that is clearly trending.
- Holding too large because max loss is 'defined.' Defined risk is still real risk.

## Lessons Learned

- Options are not just about direction. Time and volatility are equally important.
- Start with defined-risk spreads before selling naked options.
- Liquidity first. Always check volume and open interest before entering.$ch22$, 12, 22, true),

(23, 'Systemisation, Backtesting, and the Gambling Line', 'Where process replaces hope', $ch23$# Chapter 23: Systemisation, Backtesting, and the Gambling Line

At a high level, systemisation is the effort to turn scattered good ideas into a repeatable operating process. It can be manual, semi-automated, or fully automated, but the goal is the same: reduce the number of decisions that emotion can corrupt.

## Trading Is Not Gambling, But It Can Be

Here is an honest truth that most trading books avoid: if you enter the market without a defined edge, a tested system, and consistent risk management, then you are not trading. You are gambling. The difference is not the asset class, the platform, or how sophisticated you feel. The difference is whether you have a demonstrable positive expectancy (meaning over many trades, the system makes more than it loses).

Gambling is defined by randomness and hope. Trading, real trading, is defined by process and probability management. A poker player who understands odds, position, and opponent behaviour is not gambling in the same way as someone pushing chips onto a roulette number. Both are sitting in a casino. Only one has an edge.

Unstructured trading feels like gambling because it essentially is. The excitement of not knowing, the rush of a win, the chase after a loss, these are psychological signatures of gambling behaviour. Recognise them in yourself. The moment you are trading on hope rather than process, you have crossed into gambling territory.

## Building an Edge Instead

An edge in trading means having a reason, backed by evidence, to believe your process produces positive results over a large enough sample size. Not one trade. Not even ten. A statistically meaningful number of trades under similar conditions.

A trader with one edge and one market may experience long variance before expected value appears. A trader with multiple tested edges, used appropriately and systematically, can bring those probabilities closer to the present.

## Backtesting Principles

Backtesting is testing your strategy on historical data to estimate how it might have performed. The warning: strategy tests must use realistic assumptions. If slippage (the difference between the price you wanted and the price you got), unrealistic capital usage, or cherry-picked conditions distort the model, the backtest may flatter a system that would fail in live conditions. A backtest is not useful because it is optimistic. It is useful because it is honest enough to survive contact with reality.

## Case Study: Long-Only Filtering in Crypto

Analysis of Bitcoin and Ethereum trend strategies showed much stronger long-side performance than short-side performance. That insight led to the conclusion that for those systems and that market structure, ignoring many short signals may improve results. The lesson: deeper strategy statistics can reveal hidden asymmetries, and those asymmetries can lead to better system design.

## Lessons Learned

- Without a tested edge, you are gambling, regardless of how sophisticated it feels.
- Trading becomes non-gambling when process replaces hope.
- Backtest honestly. Optimistic backtests produce live losses.
- Look for asymmetries in your data. They often reveal where the real edge lives.$ch23$, 10, 23, true),

(24, 'Knowing When a Strategy Has Stopped Working', 'Journal first, panic never', $ch24$# Chapter 24: Knowing When a Strategy Has Stopped Working

Every strategy goes through periods where results deteriorate. The first thing to do is not panic and not change anything. It is to check the journal. Are you following the plan correctly? Are entries, stops, and targets being placed where they should be? Execution errors look exactly like a broken strategy from the outside.

If the journal checks out and you are executing correctly, then look at the data. Track your win rate across recent trades. If it has dropped significantly from your baseline, fifty percent or more of trades going against you consistently, that is when adjustments are worth considering. Not after three losses. Not after a bad week. After the evidence builds a clear case.

Markets change. A setup that worked cleanly in a trending environment may struggle in a ranging one. That is not failure. It is information. The trader who recognises this and adapts survives. The one who forces the same approach regardless of conditions does not.

## Lessons Learned

- Check execution before blaming the strategy. Journal first.
- Adjust on evidence, not emotion. One bad week is not a broken edge.
- A win rate well below your baseline over a real sample is the signal to adapt.
- A strategy struggling in a new regime is information, not failure.$ch24$, 6, 24, false),

(25, 'Algorithmic Trading, Tech, and Staying Updated', 'Rules clear enough for a computer to follow', $ch25$# Part 8: Advanced Market Insight

# Chapter 25: Algorithmic Trading, Tech, and Staying Updated

You do not need to be a programmer to trade well. But understanding what algorithmic and automated trading is, and how it affects the markets you trade in, makes you a more informed participant.

## Algorithmic and Automated Trading

Algorithmic trading means using a computer programme to execute trades based on predefined rules. Instead of a human watching a chart and pressing a button, the algorithm monitors conditions and acts automatically. At the institutional level, these systems execute millions of orders per second and account for a significant share of daily market volume.

For retail traders, automation is increasingly accessible through platforms like TradingView (Pine Script strategies with broker connections), MT4/MT5 (Expert Advisors), and Python-based systems using broker APIs. The key benefits are consistency and speed. A rule-based system does not get scared, bored, or greedy. The key risk is that a poorly designed system will execute bad rules flawlessly and consistently.

- **Pros:** Removes emotional decisions, backtestable, runs 24/7, executes faster than a human.
- **Cons:** Requires solid rule definition before it works, can fail catastrophically in market conditions it was not designed for, needs ongoing monitoring and adjustment.

The practical takeaway: algorithmic thinking is valuable even if you never write a single line of code. If you can state your trading rules precisely enough for a computer to follow them, your rules are clear enough to trade.

## Leveraging Data and Technology

The tools available to retail traders today are extraordinary compared to what existed even ten years ago. Use them deliberately.

- **TradingView:** Charting, screening, alerts, and Pine Script strategy testing. The most widely used retail analysis platform.
- **Screeners:** Filter stocks, crypto, or forex pairs by technical or fundamental criteria to build a watchlist rather than guessing what to trade.
- **Economic calendars:** Track scheduled events (interest rate decisions, earnings, NFP) that create volatility. Know when the market is about to receive new information.
- **On-chain analytics (crypto):** Tools like Glassnode show wallet flows, exchange reserves, miner activity, and holder behaviour, data that simply does not exist in traditional financial markets.
- **Backtesting tools:** Python (Backtrader, Vectorbt), TradingView strategy tester, or dedicated platforms like QuantConnect for testing rule-based systems before live capital is used.

## Staying Updated and Adapting

Markets evolve. Strategies that worked in one regime may stop working when conditions change. Continuous learning is not optional. It is part of the job.

The most important habit is honest review. Not just consuming new content, but regularly examining whether your current approach is still producing results. If your edge is degrading, that is data, not a reason to panic, but a reason to investigate and adapt.

- Set a monthly review: is my win rate holding, is my R:R consistent, has the market regime changed?
- Follow primary sources: central bank statements, earnings reports, regulatory announcements, not just social media commentary on them.
- Keep learning through doing: paper trading a new strategy, backtesting a new idea, or reviewing your own past trades teaches more than reading passively.

## Lessons Learned

- Algorithmic thinking improves discretionary trading even if you never automate.
- Use the tools available. They give retail traders access that did not exist before.
- Continuous learning means honest review of your own results, not just consuming content.
- Adapt when the evidence tells you to. Stubbornness is not conviction.$ch25$, 11, 25, false),

(26, 'Flows, Liquidity, and Why Prices Overshoot', 'Who must buy, who must sell', $ch26$# Chapter 26: Flows, Liquidity, and Why Prices Overshoot

One of the most advanced themes in trading comes from flow-based analysis: prices are heavily shaped by flows. Supply flows, demand flows, liquidity conditions, and the elasticity (sensitivity to price) of participants often explain market movement better than static valuation arguments alone.

This framework is powerful because it moves analysis away from vague opinions and toward a more precise question: who must buy, who must sell, who can wait, and how sensitive are they to price? That question can apply to options dealers, ETF trackers, miners, stakers, insiders leaving lockups, and passive fund flows alike.

## Liquidity and Elasticity

An asset becomes more volatile when less supply appears as price rises or less demand appears as price falls. If a market is illiquid (thin, hard to trade without moving the price) and a relatively price-insensitive buyer or seller enters, price may need to leap to find the next pocket of opposing orders. This explains why strong narratives and structural flows can create much more dramatic moves than traditional logic predicts.$ch26$, 5, 26, false),

(27, 'Ethereum''s Triple Halving Thesis, Corrected and Reframed', 'Keep the insight, discard the overconfidence', $ch27$# Chapter 27: Ethereum's Triple Halving Thesis, Corrected and Reframed

The Ethereum Triple Halving thesis contains strong analytical thinking, but also aggressive forecasts that did not play out on the stated timeline. The correct approach is to preserve the framework, correct the overstatement, and use the material as a case study in analytical thinking rather than prophecy.

## What the Thesis Got Right

The thesis argued that Ethereum's supply dynamics were changing through three major forces: lower issuance under proof of stake, fee burn through EIP-1559 (coins permanently destroyed with each transaction), and reduced circulating supply through staking and DeFi lock-up. These changes could reduce structural sell pressure and make ETH more sensitive to demand shifts. That broad framework remains analytically valuable.

## What Needed Correction

Specific price targets were not realised. Tokenomics (the economic design of a token) can create favourable conditions, but they do not override macro tightening, regulatory pressure, competition, liquidity withdrawal, or changing investor appetite.

## How to Use a Failed Forecast Properly

A failed forecast does not automatically mean the underlying framework was worthless. The trader should ask: which assumptions were durable, which were too aggressive, and which variables were underestimated? In this case, the flow-based lens was useful. The precise timing and magnitude claims were not. This is how mature analysis evolves.

The honest post-mortem of a failed thesis looks like this. You identify what the model got structurally correct, in this case, that supply dynamics were genuinely changing and that those changes would matter over time. You then identify what was overstated: the certainty of timing, the specific price levels, and the assumption that tokenomics alone could override macro conditions. Finally, you update the model.

This process, audit, extract, update, is what differentiates a trader who learns from a bad call versus one who either doubles down defensively or abandons the framework entirely. Neither extreme is right. The framework had genuine insight. The forecast attached to it was too aggressive. Keep the insight, discard the overconfidence. That is the mature response to any failed thesis, and it applies well beyond Ethereum.

## Lessons Learned

- Frameworks outlast forecasts. Keep the logic, discard the overstated targets.
- Supply changes create conditions. They do not guarantee outcomes.
- Failed trades and failed forecasts are the best teachers if reviewed honestly.
- Audit, extract, update. Apply this to every bad call, not just this one.$ch27$, 8, 27, false),

(28, 'Building a Daily and Weekly Trading Routine', 'Turning knowledge into behaviour', $ch28$# Part 9: Sustainable Practice

# Chapter 28: Building a Daily and Weekly Trading Routine

A sustainable routine turns knowledge into behaviour. Without routine, even good ideas remain theoretical. The trader who reviews the market at random times, makes decisions whenever the urge strikes, and reviews trades only when they feel like it is not building a business. They are maintaining a habit of inconsistency.

## Daily Structure

1. Check the anchor timeframe first.
2. Mark support, resistance, boxes, and major zones.
3. Review market context and watchlists.
4. Define trade candidates, invalidation, and size before execution.
5. Record the plan before entering.
6. Review execution after the session or at day's end.

## Weekly Structure

A weekly review should include more than P&L (profit and loss). It should examine whether trades followed the plan, whether specific setups are improving or degrading, whether correlation risk is increasing, and whether the trader is drifting into lower-quality behaviour.

## Journaling

A trading journal is one of the few tools that pays compounding returns over time. The act of writing a trade plan before entry forces clarity. Reviewing it after the close builds pattern recognition that no indicator can replicate. A useful journal entry includes:

- Setup type and timeframe.
- Entry, stop, and target.
- Position size.
- Thesis, why you are taking this trade.
- Emotional state before and after.
- Lesson learned.

The discipline of recording every trade, win or loss, is what turns scattered experience into a measurable record you can actually learn from. Over months, the journal becomes the single most honest mirror a trader owns. The example below shows what a complete entry looks like in practice.

## Example Trade Journal Entry

The entry below captures everything that matters about a single trade in one place: the setup, the precise levels, the reasoning, the outcome, and the lesson. Notice that the lesson is recorded regardless of result. A win that followed the plan is worth as much to your development as the profit itself.

| Field | Value |
|---|---|
| Date / Time | 2024-03-15, 09:45 EST |
| Market | BTC/USDT |
| Setup Type | BOS + FVG Retest |
| Timeframe | Daily trend, 1H entry |
| Entry | \$68,400 |
| Target | \$72,500 (opposing liquidity) |
| Stop Loss | \$66,800 (below swept low) |
| Risk % | 1.5% of account |
| Thesis | Daily uptrend intact. 1H BOS after HTF FVG retest. Regime: risk-on. |
| Outcome | Hit TP1 at \$71,200 (+4.1R). Partial exit taken. |
| Lesson | Waited patiently for retest. Did not chase. Plan followed. |
| Result | WIN +4.1R |$ch28$, 8, 28, false),

(29, 'Asking Better Questions and Learning Faster', 'The question contains the analysis', $ch29$# Chapter 29: Asking Better Questions and Learning Faster

Poor questioning slows learning dramatically. Vague questions such as 'Thoughts on XRP?' or 'Should I buy this?' force the other person to guess your context, timeframe, constraints, and reasoning. Better questions are specific, situational, and transparent about what you already think and what you have already tried.

This matters in self-study too. The trader who asks 'Where is the market going?' in a lazy way will remain confused. The trader who asks 'On the daily chart, is this still an uptrend after losing the prior higher low, and does that change my swing bias?' is already operating on a much higher level. The question contains the analysis.

## How to Ask Better Questions

- State your current position first: 'I think X because Y.'
- Name the timeframe: 'On the 4H chart...'
- Name what you have already checked: 'RSI is oversold, structure is bullish, but...'
- Ask what you are actually uncertain about, not for a general opinion on the whole market and where it might be heading.

The same standard applies when reviewing your own trades. A journal entry that says 'bad trade' teaches nothing. A journal entry that says 'entered before confirmation, stop was below the wrong low, and I ignored the higher timeframe bias' teaches everything. The question contains the analysis. The better the question, the faster the improvement.

## Lessons Learned

- Vague questions produce vague answers. Specific questions produce usable ones.
- Always state what you already think and what you have already checked.
- Apply the same standard to your own journal entries. Precise reflection compounds over time.$ch29$, 6, 29, false),

(30, 'The Real Path From Beginner to Advanced', 'Foundation first, competence last', $ch30$# Part 10: Conclusion

# Chapter 30: The Real Path From Beginner to Advanced

The journey from beginner to advanced trader is not a straight line. It moves through confusion, excitement, self-deception, partial clarity, painful correction, and gradual competence. Most people fail not because the markets are impossible, but because they try to force results before the building process. They chase the fastest route, the biggest size, the hottest token, the cleverest signal, or the most exciting story.

The professionals survive by doing the opposite: they simplify, define, test, manage, review, and repeat.

This book has deliberately moved from basic definitions to structure, systems, flow analysis, options, portfolio theory, psychology, and advanced execution. That progression reflects the way skill is actually built. Foundation first. Understanding second. Application third. Competence fourth. Advanced execution only after the earlier layers are stable.

## The Enduring Lessons

- Trade with structure, not impulse.
- Manage risk before seeking reward.
- Build systems to protect yourself from yourself.
- Learn slowly enough that the knowledge sticks.
- Accept that no tool is perfect and no method is permanent.
- Focus on becoming the kind of trader who can survive long enough to improve.

## A Final Word to New Traders

If you are reading this at the beginning of your trading journey, the most important thing you can do is be patient with yourself. Every experienced trader you admire went through the confusion you are feeling right now. They made the same mistakes, had the same doubts, and fought the same urges to take shortcuts. The difference is they stayed in the game long enough to learn from those mistakes rather than being wiped out by them.

Trading is one of the few skills where the feedback loop is immediate and often brutal, but that also means improvement is measurable and real. Every honest trade review, every journal entry written, every plan followed under pressure is a deposit in your skill account. Compound those deposits long enough and the results take care of themselves.

Be harder on your process than you are on your results. Be easier on yourself after a loss than you think you deserve to be. And never stop treating the market with respect. It will always be more complex than any single framework, and the best traders know that.

Well, this is the end. I hope this book did everything it needed to. Good luck on the journey, and stay strong.

## Glossary

**Alpha** — Return above a benchmark or above passive buy-and-hold.
**Anchor timeframe** — The primary timeframe used to orient all other analysis. Often the daily chart for swing traders.
**Ask** — The lowest price a seller is currently willing to accept.
**Backtest** — Testing a strategy on historical data to estimate how it might have behaved in the past.
**Bearish** — Expecting prices to decline.
**Beta** — Sensitivity relative to a benchmark. In crypto, often describes amplified BTC-like movement.
**Bid** — The highest price a buyer is currently willing to pay.
**BOS (Break of Structure)** — A break of a meaningful prior swing that may indicate a change in market direction.
**Box** — A consolidation range where price moves sideways between a support boundary and a resistance boundary.
**Bullish** — Expecting prices to rise.
**Candlestick** — A chart element showing open, high, low, and close for a given time period.
**CHoCH (Change of Character)** — A shift in market structure where price breaks the most recent swing in the opposite direction, suggesting the trend may be transitioning.
**Confluence** — Multiple independent reasons supporting the same trade idea, making the setup stronger.
**Correlation** — The degree to which two assets move together. High correlation means they move in sync.
**Credit spread** — An options structure entered for premium received, with a defined maximum loss.
**Delta** — The rate of change in an option's value relative to the underlying price.
**Drawdown** — The fall from a peak in account or portfolio value.
**Edge** — A demonstrable positive expectancy over a meaningful sample of trades.
**Execution** — The actual process of entering, managing, and exiting trades.
**FOMO** — Fear of missing out, entering a trade late because the price has already moved without you.
**FVG (Fair Value Gap)** — A price imbalance created by a fast move, leaving an area with little two-sided activity.
**Gamma** — An options Greek showing how quickly delta changes as the underlying price moves.
**Greeks** — Risk measures for options including delta, theta, vega, and gamma.
**Hedge** — A position used to offset or reduce risk from another existing position.
**Higher high / higher low** — The classic price structure of an uptrend, where each successive peak and trough is higher.
**Implied volatility (IV)** — The market's expectation of future volatility, embedded in the price of options.
**Invalidation** — The specific price or condition that proves the original trade idea is wrong.
**Leverage** — Borrowing capital to increase position size beyond what your own funds allow. Amplifies gains and losses.
**Liquidity** — The ease with which an asset can be bought or sold without significantly moving its price.
**Liquidity pool** — An area where stop losses are likely clustered, typically just below a swing low or above a swing high.
**MACD** — Moving Average Convergence Divergence, a momentum indicator derived from two moving averages.
**Mean reversion** — The tendency for price to return toward a central value after moving too far, too fast.
**Moving average (MA)** — The average price over a selected period, used to smooth fluctuations and reveal trend direction.
**OB (Order Block)** — A price area associated with concentrated order flow just before a strong impulsive move.
**Open interest** — The total number of outstanding, unsettled derivative contracts.
**Overbought / oversold** — Conditions where momentum appears stretched in one direction, often measured with RSI.
**Position sizing** — Determining how large a trade should be relative to account size and acceptable risk.
**Profit factor** — Gross profit divided by gross loss in a strategy test, a basic measure of strategy quality.
**Regime** — The broader market condition (risk-on or risk-off) that influences sizing and management decisions.
**Relative strength** — A comparison of one asset to another to identify which is showing leadership.
**Resistance** — A price zone where selling pressure has historically been strong enough to slow advances.
**Risk-adjusted return** — Return viewed relative to the level of risk taken to earn it.
**RSI** — Relative Strength Index, a momentum oscillator from 0 to 100 used to assess market conditions.
**Sharpe ratio** — A risk-adjusted return metric using total volatility as the measure of risk.
**Slippage** — The difference between the expected execution price and the actual fill price received.
**Sortino ratio** — A risk-adjusted return metric that focuses only on downside volatility.
**Spread** — In options: a multi-leg structure. In order books: the gap between bid and ask.
**Stop-loss** — A predefined exit level designed to cap downside if the trade is invalidated.
**Support** — A price zone where buying pressure has historically been strong enough to slow declines.
**Swing trading** — A style of trading in which positions are held for days to weeks to capture directional moves.
**Systemisation** — Building a repeatable framework with defined rules that reduces emotional decision-making.
**Theta** — The rate at which an option loses value simply due to the passage of time. Time decay.
**Trend** — The general directional bias of price movement over a chosen timeframe.
**Unrealised gain** — Profit visible in an open position that has not yet been captured by closing.
**Vega** — The sensitivity of an option's price to changes in implied volatility.
**Whipsaw** — A sequence of false signals that repeatedly stops out a system in choppy, non-trending conditions.
**Zone-to-zone trading** — A method of trading the movement from one major price zone to the next.$ch30$, 14, 30, false)

ON CONFLICT (chapter_number) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  content = EXCLUDED.content,
  estimated_minutes = EXCLUDED.estimated_minutes,
  order_index = EXCLUDED.order_index,
  is_background = EXCLUDED.is_background,
  updated_at = now();
