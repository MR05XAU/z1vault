import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Check, ChevronRight, GraduationCap, Lock, Trophy } from "lucide-react";
import { DIAGRAMS } from "@/components/CourseDiagrams";

const COURSE = "starting-trading";

type Lesson = { id: string; title: string; body: string; diagram?: keyof typeof DIAGRAMS; body2?: string };
type QuizQ = { q: string; options: string[]; answer: number };
type Level = { id: string; title: string; blurb: string; lessons: Lesson[]; quiz: QuizQ[] };

// A BabyPips-style "School of Pipsology" ladder, condensed: five levels of
// absolute basics, each capped with a short quiz. Static content by design —
// this is the free on-ramp, the full curriculum lives in the Book.
const LEVELS: Level[] = [
  {
    id: "l1", title: "Level 1 — What Trading Actually Is",
    blurb: "Markets, prices, and who's on the other side of your trade.",
    lessons: [
      {
        id: "l1a", title: "What a market is",
        body: `A market is just a place where buyers and sellers meet. Every price you see — gold, Apple, bitcoin — is simply **the last price a buyer and seller agreed on**.

When you buy, someone real sells to you. When you sell, someone buys from you. There is no "the market" deciding anything — there are only other participants: banks, funds, algorithms, and traders like you.

Why it matters: every trade you take is a bet **against someone else's opinion**. Your job isn't to be right about the world — it's to be on the profitable side of that disagreement more often than not, with the losses kept small.`,
      },
      {
        id: "l1b", title: "Why prices move",
        body: `Prices move because of **imbalance**. If there are more willing buyers than sellers at the current price, the price gets pulled up until enough sellers show up. More sellers than buyers, it gets pushed down.

News, earnings, economic data, fear, greed — all of it only matters because it changes *who wants to buy or sell right now*.

Key idea: price doesn't move because something is "good" or "bad". It moves when reality differs from **what was already expected**. Great news that everyone saw coming often moves nothing.`,
      },
      {
        id: "l1d", title: "Bid, ask, and the spread",
        diagram: "bidAsk",
        body: `At any moment there are two prices, not one:

- The **bid** — the highest price any buyer is currently willing to pay.
- The **ask** — the lowest price any seller is currently willing to accept.

The gap between them is the **spread**. When you buy instantly ("at market"), you pay the ask; when you sell instantly, you receive the bid — so you start every trade slightly negative. That's a real cost, on top of commissions.

Two basic order types cover 90% of what you need:

- **Market order** — fill me *now* at whatever the price is. Fast, but you pay the spread and possible slippage.
- **Limit order** — fill me only at *this price or better*. You control the price, but you might not get filled.

Liquid markets (big stocks, major futures) have tiny spreads. Illiquid ones can quietly eat your profits — another reason beginners should stick to major, liquid instruments.`,
      },
      {
        id: "l1c", title: "The instruments",
        body: `The main things people trade:

- **Stocks** — ownership slices of companies. Slower, good for learning. Regular market hours.
- **Futures** — standardized contracts on gold, oil, stock indexes. Leveraged, trade nearly 24h, favored by day traders. Each contract has a fixed dollar value per point (e.g. ES = $50/point, MGC = $10/point).
- **Forex** — currency pairs like EUR/USD. The biggest market on earth, heavily leveraged, moves in "pips".
- **Crypto** — 24/7, extremely volatile, thin regulation.

They all obey the same rules of supply, demand, and risk. **Pick one instrument and learn it deeply** — jumping between markets is one of the fastest ways beginners lose money. Everything in this course applies to all of them.`,
      },
    ],
    quiz: [
      { q: "When you buy an instrument, who sells it to you?", options: ["The exchange creates it", "Another market participant", "Your broker always"], answer: 1 },
      { q: "Prices move mainly because…", options: ["News is good or bad", "Buying/selling pressure is imbalanced", "Exchanges set them"], answer: 1 },
      { q: "The best way to start is…", options: ["Trade every market for experience", "Pick one instrument and learn it deeply", "Follow signals from social media"], answer: 1 },
    ],
  },
  {
    id: "l2", title: "Level 2 — Candlesticks & Charts",
    blurb: "Candle anatomy, the candle types that matter, reversal patterns, and market structure.",
    lessons: [
      {
        id: "l2a", title: "Candlestick anatomy",
        diagram: "candleAnatomy",
        body: `A candlestick summarizes everything price did in one chunk of time — one candle per minute on a 1m chart, per day on a daily chart.

Four prices build every candle:

- **Open** — where price started the period.
- **Close** — where it finished. Open→close forms the **body**.
- **High / Low** — the extremes reached, drawn as thin **wicks** above and below the body.

Color is just open vs close: **green** = closed above its open (buyers won the period), **red** = closed below (sellers won).

The single most useful reading skill: **wicks are rejections**. A long wick means price *went* there and got pushed back — someone stepped in. Big body, small wicks = conviction. Small body, big wicks = a fight.`,
      },
      {
        id: "l2b", title: "The candle types that matter",
        diagram: "candleTypes",
        body: `You don't need 50 Japanese pattern names. These five shapes cover most of what candles can tell you:

- **Marubozu** — all body, no wicks. One side steamrolled the whole period. Strong continuation signal in a trend.
- **Doji** — open ≈ close, wicks both sides. Total indecision; often appears before reversals *at important levels*.
- **Hammer** — small body at the top, long lower wick. Sellers pushed down hard and got completely rejected. Bullish **when it forms at support**.
- **Shooting star** — the mirror: small body at the bottom, long upper wick. Buyers got rejected. Bearish at resistance.
- **Spinning top** — small body, modest wicks both sides. Mild indecision, momentum fading.

Critical caveat: a candle shape means almost **nothing in the middle of nowhere**. A hammer at major support is information; a hammer in random chop is noise. Location first, candle second.`,
      },
      {
        id: "l2c", title: "Reversal patterns: engulfing",
        diagram: "engulfing",
        body: `Two-candle patterns show a *shift in control* between periods:

- **Bullish engulfing** — a red candle followed by a green candle whose body completely swallows the red one. Sellers had it, buyers took it back — and then some. Strongest at support or after a pullback in an uptrend.
- **Bearish engulfing** — the mirror image at highs: a green candle swallowed by a bigger red one.

Why it works: the engulfing candle proves that everyone who traded the previous candle is now underwater. Trapped traders exiting fuel the new direction.

Checklist for a valid engulfing signal: (1) it's **at a level** you'd marked in advance, (2) the engulfing body is clearly bigger — not a technicality, (3) the trend context agrees (bullish engulfing in an uptrend's pullback beats one fighting a downtrend).`,
      },
      {
        id: "l2d", title: "Reversal patterns: the pin bar",
        diagram: "pinBar",
        body: `A **pin bar** (the hammer/shooting star used in context) is the cleanest rejection signal in trading:

1. Price drives **into a level** — support or resistance.
2. It gets violently rejected, leaving a long wick *through* the level.
3. The candle **closes back on the right side** of it.

The story it tells: stops were run, the level *held*, and everyone who chased the break is now trapped. Entries are commonly taken on the break of the pin bar's high (for bullish pins), with the stop under the wick's tip — a naturally tight, logical stop.

The wick should be at least **2× the body**, and the close matters more than the shape: a long wick that still closed *beyond* the level is not a rejection, it's a warning.`,
      },
      {
        id: "l2e", title: "Support & resistance",
        diagram: "supportResistance",
        body: `**Support** is a price area where buying has repeatedly overwhelmed selling; **resistance** is where selling has repeatedly capped price. They're **zones, not exact lines** — draw them as bands.

How to find the ones that matter:

- Zoom out. The levels visible on the daily chart outrank anything on the 5-minute.
- Look for **multiple touches** — the more times a zone has turned price, the more real it is.
- Round numbers (4000 on gold, 20,000 on NQ) act as magnets and battlegrounds.

Two behaviors happen at a zone: **bounce** or **break**. When support breaks decisively, it commonly flips into resistance (and vice versa) — the "role reversal" that structures most chart reading. Your best trades will start at these zones; the middle of the range is where accounts go to die.`,
      },
      {
        id: "l2f", title: "Trend structure & timeframes",
        diagram: "trend",
        body: `**Trend** is a repeating sequence, not a feeling:

- Uptrend: **higher highs and higher lows** (HH/HL).
- Downtrend: **lower highs and lower lows** (LH/LL).
- Neither: a range — play the edges or stand aside.

The trend "breaks" when the sequence breaks: an uptrend printing a lower low is on notice.

On timeframes: the same market is in *different trends on different timeframes simultaneously*, and all of them are true. Pick **one anchor timeframe** (say 1h or 4h) to define the trend you trade with, and **one lower timeframe** (say 5m) purely to time entries. Two is enough; flipping through nine timeframes manufactures whatever opinion you were hoping to find.`,
      },
    ],
    quiz: [
      { q: "A long lower wick means…", options: ["Sellers are in control", "Price went down and got rejected", "Volume was low"], answer: 1 },
      { q: "A hammer candle is meaningful when it forms…", options: ["Anywhere on the chart", "At a support zone", "Only on the 1-minute chart"], answer: 1 },
      { q: "A bullish engulfing pattern is…", options: ["A green body completely swallowing the prior red body", "Two green candles in a row", "A candle with no wicks"], answer: 0 },
      { q: "A valid bullish pin bar at support should…", options: ["Close below the support level", "Close back above the level with a wick at least 2x the body", "Have no lower wick"], answer: 1 },
      { q: "An uptrend is over when…", options: ["You see one red candle", "The higher-high/higher-low sequence breaks", "RSI is above 70"], answer: 1 },
    ],
  },
  {
    id: "l3", title: "Level 3 — Risk Comes First",
    blurb: "Position sizing, stop losses, and why win rate isn't what you think.",
    lessons: [
      {
        id: "l3a", title: "The 1% rule",
        body: `Before you think about profits, decide what you'll **lose** when you're wrong — because you will be wrong, often.

The classic rule: **risk no more than 1% of your account on any single trade.** With a $5,000 account, that's $50 of risk per trade.

Why so small? Losing streaks happen to everyone. Risking 1%, a brutal 10-loss streak costs ~10% of your account — annoying, survivable. Risking 10% per trade, the same streak wipes out **65%** of your account. Survival is the entire game early on.`,
      },
      {
        id: "l3b", title: "Stop losses and R",
        diagram: "riskReward",
        body: `A **stop loss** is the price where your trade idea is proven wrong and you exit — decided **before** you enter, never after.

The distance from entry to stop defines your **R** (one unit of risk). If you buy at 100 with a stop at 98, then 1R = 2 points. A target at 106 is a **3R** trade: risking 1 to make 3.

Thinking in R changes everything: a trade that makes 2R is a *good trade even if most trades lose*, and moving your stop further away mid-trade is just deciding to lose more than you planned.`,
      },
      {
        id: "l3c", title: "Win rate vs expectancy",
        body: `Beginners chase high win rates. Professionals chase **expectancy** — the average R you make per trade over many trades.

- Win 40% of the time but average +2R on wins and −1R on losses → you make **+0.2R per trade**. Profitable.
- Win 70% of the time but average +0.5R on wins and −2R on losses → you lose **−0.25R per trade**. Losing, despite winning most trades.

This is why "I'm right most of the time" means nothing, and why cutting losers fast while letting winners run is repeated by every trading book ever written: it's the math, not a motto.`,
      },
    ],
    quiz: [
      { q: "With a $10,000 account and the 1% rule, your max risk per trade is…", options: ["$1,000", "$100", "$10"], answer: 1 },
      { q: "When do you decide your stop loss?", options: ["Before entering the trade", "When the trade goes against you", "Never — stops are for cowards"], answer: 0 },
      { q: "A 40% win rate can be profitable if…", options: ["You trade more often", "Average wins are much bigger than average losses", "You use more leverage"], answer: 1 },
    ],
  },
  {
    id: "l4", title: "Level 4 — Your Own Worst Enemy",
    blurb: "Discipline, the classic psychological traps, and why journaling works.",
    lessons: [
      {
        id: "l4a", title: "The plan is the edge",
        body: `Most beginners lose not because their strategy is bad, but because **they don't follow it.**

A trading plan answers, in writing, before the session: what setups you take, what you risk, when you enter, where your stop and target go, and when you stop trading for the day.

If it's not written down, it's not a plan — it's a mood. The market is exceptionally good at turning moods into losses. Every legendary trader interview eventually says the same boring thing: the money is in the **discipline**, not the indicator.`,
      },
      {
        id: "l4b", title: "The classic traps",
        body: `Every trader falls into the same holes; knowing their names helps you climb out faster:

- **Revenge trading** — re-entering immediately after a loss, bigger size, to "win it back". The single fastest account killer.
- **FOMO** — chasing a move that already happened because everyone's talking about it. You're buying someone else's exit.
- **Moving stops** — deciding mid-trade to lose more than planned.
- **Overtrading** — forcing trades on days with no real setups, out of boredom.

One clean trade a day is plenty. The screen is a hunting hide, not a slot machine.`,
      },
      {
        id: "l4c", title: "Journal everything",
        body: `A trading journal is how you find *your* actual leaks — not generic advice, but facts about you: "I lose most after 2pm", "my second trade of the day is my worst", "I cut winners at 1R that ran to 4R".

For every trade, record: the setup, entry/stop/target, the result in R, and **how you felt**. Review weekly.

This is exactly what **Edgebook** in this app is built for — trades, tags, discipline score, and the analytics that expose your patterns. The journal doesn't judge you; it just shows you the tape of who you actually are as a trader. That's where improvement starts.`,
      },
    ],
    quiz: [
      { q: "Revenge trading is…", options: ["A valid recovery strategy", "Re-entering bigger right after a loss to win it back", "Trading rival markets"], answer: 1 },
      { q: "A trading plan counts as a plan when…", options: ["You have it in your head", "It's written down before the session", "Your win rate is above 50%"], answer: 1 },
      { q: "The main purpose of a journal is…", options: ["Tax records", "Finding your personal, repeated leaks", "Sharing wins online"], answer: 1 },
    ],
  },
  {
    id: "l5", title: "Level 5 — Your First (Paper) Trade",
    blurb: "Demo accounts, a starter checklist, and what 'ready' actually looks like.",
    lessons: [
      {
        id: "l5a", title: "Paper trade first — properly",
        body: `Every serious platform offers a **demo/paper account** with fake money and real prices. Use it — but use it *seriously*, or it teaches you nothing.

Paper trade with the account size you'd actually fund, the 1% rule, real stops, and a journal entry for every trade. Treat fills with suspicion (real fills are worse).

The goal is not paper profits. The goal is proving you can **follow your plan for 30+ consecutive trades**. Discipline transfers to real money; luck doesn't.`,
      },
      {
        id: "l5b", title: "The starter checklist",
        body: `Before every single trade, answer these — out loud if you have to:

1. Is this one of **my** setups, written in my plan?
2. Where is my stop, and is the risk ≤ 1%?
3. Is the reward at least **2R** at a realistic target?
4. Am I trading with my anchor timeframe's trend?
5. Am I calm — not chasing, not revenging, not bored?

Five nos-or-yeses. If any answer is no, there is no trade. This exact checklist can be configured in **Edgebook's settings** so it appears every time you log a trade.`,
      },
      {
        id: "l5c", title: "What 'ready' looks like",
        body: `You're ready to risk real money when — and only when — all of these are true:

- 30+ paper trades executed **according to plan** (the result matters less than the obedience).
- Your journal shows positive expectancy in R over that sample.
- You can state your setup, risk rule, and daily stop-loss limit from memory.
- Losing your planned 1% doesn't make you want to immediately re-enter.

Then start with **small real size** — real money feels 10× heavier than paper. Scale up only after the discipline survives contact with real feelings. Welcome to the long game. 📈`,
      },
    ],
    quiz: [
      { q: "The goal of paper trading is…", options: ["Making fake profits fast", "Proving you can follow your plan over 30+ trades", "Testing every strategy at once"], answer: 1 },
      { q: "If one checklist answer is 'no'…", options: ["Reduce size and enter anyway", "There is no trade", "Ask a friend"], answer: 1 },
      { q: "When starting with real money…", options: ["Go full size — you earned it", "Start small; real emotions change everything", "Skip stops to give trades room"], answer: 1 },
    ],
  },
];

const ALL_IDS = LEVELS.flatMap((lv) => [...lv.lessons.map((l) => l.id), `quiz:${lv.id}`]);

export default function StartingTrading() {
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [lesson, setLesson] = useState<{ level: Level; lesson: Lesson } | null>(null);
  const [quizLevel, setQuizLevel] = useState<Level | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("course_progress").select("completed").eq("user_id", user.id).eq("course", COURSE).maybeSingle()
      .then(({ data }: any) => { if (data?.completed) setDone(new Set(data.completed)); });
  }, [user]);

  const persist = async (next: Set<string>) => {
    setDone(next);
    if (!user) return;
    await (supabase as any).from("course_progress").upsert(
      { user_id: user.id, course: COURSE, completed: Array.from(next) },
      { onConflict: "user_id,course" },
    );
  };

  const markLesson = (id: string) => {
    const next = new Set(done);
    next.add(id);
    persist(next);
    setLesson(null);
  };

  const submitQuiz = () => {
    if (!quizLevel) return;
    const wrong = quizLevel.quiz.filter((q, i) => answers[i] !== q.answer).length;
    if (wrong === 0) {
      const next = new Set(done);
      next.add(`quiz:${quizLevel.id}`);
      persist(next);
      toast.success("Level passed!", { description: "On to the next one." });
      setQuizLevel(null);
    } else {
      toast.error(`${wrong} answer${wrong === 1 ? "" : "s"} wrong — review and try again.`);
    }
  };

  const totalDone = useMemo(() => ALL_IDS.filter((id) => done.has(id)).length, [done]);
  const pct = Math.round((totalDone / ALL_IDS.length) * 100);
  const levelComplete = (lv: Level) => lv.lessons.every((l) => done.has(l.id)) && done.has(`quiz:${lv.id}`);
  // A level unlocks when the previous one is fully complete (level 1 is open).
  const levelUnlocked = (idx: number) => idx === 0 || levelComplete(LEVELS[idx - 1]);

  return (
    <MobileShell bottomNav={<BottomNav />} header={<header className="px-5 pt-6 safe-top" />}>
      <div className="mt-2 rounded-3xl border border-border bg-gradient-to-b from-surface-elevated to-background px-6 py-8 text-center">
        <GraduationCap className="mx-auto size-8 text-mint-bright" />
        <h1 className="display mt-3 text-3xl font-medium">Starting Trading</h1>
        <p className="mt-2 text-sm text-muted-foreground">The absolute basics, level by level. Pass each quiz to unlock the next.</p>
        <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-border-strong">
          <div className="h-full mint-fill transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground tabular-nums">{pct}% complete</div>
      </div>

      <div className="mt-6 space-y-4 pb-6">
        {LEVELS.map((lv, idx) => {
          const unlocked = levelUnlocked(idx);
          const complete = levelComplete(lv);
          return (
            <div key={lv.id} className={`rounded-2xl border border-border bg-surface-elevated/40 p-4 ${unlocked ? "" : "opacity-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="display text-[15px] font-medium flex items-center gap-2">
                    {lv.title}
                    {complete && <Check className="size-4 text-mint-bright shrink-0" />}
                    {!unlocked && <Lock className="size-3.5 text-muted-foreground shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{lv.blurb}</p>
                </div>
              </div>
              {unlocked && (
                <div className="mt-3 space-y-1.5">
                  {lv.lessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLesson({ level: lv, lesson: l })}
                      className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm press"
                    >
                      <span className="min-w-0 truncate">{l.title}</span>
                      {done.has(l.id)
                        ? <Check className="size-4 shrink-0 text-mint-bright" />
                        : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                    </button>
                  ))}
                  <button
                    onClick={() => { setQuizLevel(lv); setAnswers(new Array(lv.quiz.length).fill(-1)); }}
                    disabled={!lv.lessons.every((l) => done.has(l.id))}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm press disabled:opacity-40 mint-border border"
                  >
                    <span className="flex items-center gap-2"><Trophy className="size-4 text-mint-bright" /> Level quiz</span>
                    {done.has(`quiz:${lv.id}`)
                      ? <Check className="size-4 text-mint-bright" />
                      : <span className="text-[11px] text-muted-foreground">{lv.lessons.every((l) => done.has(l.id)) ? "Ready" : "Finish lessons first"}</span>}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {pct === 100 && (
          <div className="rounded-2xl border border-border bg-surface-elevated/60 p-6 text-center">
            <Trophy className="mx-auto size-7 text-mint-bright" />
            <div className="display mt-2 text-lg font-medium">Course complete</div>
            <p className="mt-1 text-sm text-muted-foreground">You know the basics. The real curriculum is in the Book — and your journal lives in Edgebook.</p>
          </div>
        )}
      </div>

      {/* Lesson sheet */}
      <Sheet open={lesson != null} onOpenChange={(o) => !o && setLesson(null)}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto bg-surface-elevated border-border-strong rounded-t-3xl">
          <SheetHeader><SheetTitle className="display mint-text">{lesson?.lesson.title}</SheetTitle></SheetHeader>
          {lesson?.lesson.diagram && (() => { const D = DIAGRAMS[lesson.lesson.diagram]; return <D />; })()}
          <div className="prose-z1 mt-4 text-sm">
            <ReactMarkdown>{lesson?.lesson.body ?? ""}</ReactMarkdown>
          </div>
          <Button onClick={() => lesson && markLesson(lesson.lesson.id)} className="mt-5 w-full h-12 rounded-xl mint-fill press">
            {lesson && done.has(lesson.lesson.id) ? "Read again — got it" : "Mark as read"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Quiz sheet */}
      <Sheet open={quizLevel != null} onOpenChange={(o) => !o && setQuizLevel(null)}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto bg-surface-elevated border-border-strong rounded-t-3xl">
          <SheetHeader><SheetTitle className="display mint-text">Level quiz</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-5 pb-4">
            {quizLevel?.quiz.map((q, qi) => (
              <div key={qi}>
                <div className="text-sm font-medium">{qi + 1}. {q.q}</div>
                <div className="mt-2 space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm press ${answers[qi] === oi ? "mint-border bg-mint/10" : "border-border"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={submitQuiz} disabled={answers.some((a) => a === -1)} className="w-full h-12 rounded-xl mint-fill press">
              Submit answers
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MobileShell>
  );
}
