/**
 * Curated mindset library — used by MindsetCard for instant, offline,
 * zero-credit daily tips. Rotates deterministically by date so every user
 * sees the same "today" entry and it changes once per day.
 */
export interface MindsetEntry { tag: string; quote: string; tip: string }

export const MINDSET_DAILY: MindsetEntry[] = [
  { tag: "Risk", quote: "Protect the downside; the upside protects itself.", tip: "Set your stop BEFORE entry. If you can't define it, you don't have a trade — you have a hope." },
  { tag: "Discipline", quote: "Boredom is the price of professionalism.", tip: "If no A+ setup printed, do nothing. The market pays you to wait, not to participate." },
  { tag: "Psychology", quote: "Fear is a position size problem.", tip: "If a loss would sting, you're too big. Cut size until any single loss is forgettable." },
  { tag: "Process", quote: "Repeat the process; the P&L is a by-product.", tip: "Score the trade by execution, not outcome. A losing trade taken correctly is still a good trade." },
  { tag: "Patience", quote: "The setup arrives when it arrives.", tip: "Force trades, force losses. Watch the levels you marked at the open — let price come to you." },
  { tag: "Recovery", quote: "One clean trade resets the week.", tip: "After a loss, drop size by half on the next entry. Rebuild confidence on smaller wins first." },
  { tag: "Risk", quote: "The only edge is the one you can repeat.", tip: "Fixed risk per trade (1%). Same dollar amount across 100 trades is how compounding works." },
  { tag: "Psychology", quote: "Markets reward what you avoid as much as what you do.", tip: "Skipping a B-grade trade is a win you'll never see in your P&L — but it shows up at month-end." },
  { tag: "Process", quote: "Plan the trade in writing; trade the plan without negotiation.", tip: "Write entry, stop, target BEFORE clicking buy. No mid-trade renegotiation with yourself." },
  { tag: "Discipline", quote: "Hard rules. Soft ego.", tip: "Daily loss limit = 3R. Hit it and you're done. Walk away — tomorrow's setups don't care about today." },
  { tag: "Patience", quote: "You don't need to be in every move.", tip: "One clean trade a day is plenty. The screen is a hunting hide, not a slot machine." },
  { tag: "Risk", quote: "Survive the drawdown, capture the trend.", tip: "Position size from the stop distance, never from how confident you feel. Confidence lies." },
  { tag: "Psychology", quote: "Revenge trades belong in the journal, not the account.", tip: "After a loss, close the platform for 15 minutes. Reopen with the plan, not with feelings." },
  { tag: "Process", quote: "Journal what you did, not what you felt.", tip: "Screenshot every entry and stop. Patterns in your mistakes appear in 20 trades, not 200." },
  { tag: "Discipline", quote: "Small edge, applied ruthlessly.", tip: "55% win rate at 1:2 R:R compounds. You don't need to be right — you need to be consistent." },
  { tag: "Patience", quote: "The best trade of the day is often the one you skipped.", tip: "If you have to talk yourself into it, it's not a setup. A+ trades are obvious." },
  { tag: "Recovery", quote: "Drawdowns end. Bad habits compound.", tip: "After a red week, audit execution before changing strategy. Usually the rules were fine — you weren't following them." },
  { tag: "Risk", quote: "Two losing trades is information. Three is a warning.", tip: "After two losses in a row, halve size. After three, stop. Conditions have changed or you have." },
  { tag: "Psychology", quote: "The chart is neutral. You are not.", tip: "Notice when you 'need' a trade to work. That's the signal to close it and step back." },
  { tag: "Process", quote: "Edges are built in repetition.", tip: "Trade the same setup 50 times before judging it. Anything less is noise, not data." },
  { tag: "Discipline", quote: "Rules don't fail. People stop following rules.", tip: "Print your trading rules and stick them on the monitor. Read them out loud before each session." },
  { tag: "Patience", quote: "Cash is a position.", tip: "No edge, no trade. Holding cash through a chop day is a skilled trade in itself." },
  { tag: "Risk", quote: "Size kills more accounts than strategy.", tip: "Never risk more than you can lose 10 times in a row and still trade. That's your real risk-per-trade." },
  { tag: "Recovery", quote: "Start tomorrow, not five minutes from now.", tip: "Hit your loss limit? Close the platform. Do not 'just check' the chart — that's how the limit becomes a suggestion." },
  { tag: "Process", quote: "Routine beats motivation.", tip: "Same pre-market checklist every day: news, levels, bias, risk. Boring is the goal." },
  { tag: "Psychology", quote: "FOMO is paid for in slippage.", tip: "Late entries = wide stops = poor R:R. If you missed it, you missed it. Wait for the retest." },
  { tag: "Discipline", quote: "A plan only works if you obey it on the bad days.", tip: "Anyone follows rules when winning. Pros follow them when losing — that's the whole edge." },
  { tag: "Patience", quote: "The trend doesn't need your participation to continue.", tip: "Missed the move? Mark the next pullback level. Trends give multiple entries — you only need one." },
  { tag: "Recovery", quote: "Every loss is tuition. Are you learning?", tip: "Write one sentence per losing trade: what specifically went wrong? Vague answers = vague improvements." },
  { tag: "Risk", quote: "Defense first. Always.", tip: "Before any entry, ask: 'If this is wrong, what's the damage?' If the answer scares you, the size is wrong." },
];

export const MINDSET_AFTER_LOSS: MindsetEntry[] = [
  { tag: "Recovery", quote: "One loss is a data point. Two in a row is a warning.", tip: "Drop size to 0.5% for the next trade. Rebuild rhythm before rebuilding size." },
  { tag: "Psychology", quote: "The market owes you nothing.", tip: "Don't chase the loss back. Take a 15-minute walk, then re-read your plan before the next setup." },
  { tag: "Process", quote: "Was it execution or expectation?", tip: "Journal this loss in one line. If the rules were followed, it's just variance — move on." },
  { tag: "Discipline", quote: "Revenge trading is the most expensive emotion in finance.", tip: "Next trade must score 10/10 on your checklist. Anything less, you skip." },
];

export const MINDSET_AFTER_QUIZ_FAIL: MindsetEntry[] = [
  { tag: "Process", quote: "Mastery is iterative.", tip: "Re-read the chapter, then retake the quiz. The brain learns through retrieval, not re-reading alone." },
  { tag: "Discipline", quote: "Confusion now beats expensive confusion later.", tip: "Bookmark the questions you got wrong. Cover them again tomorrow with fresh eyes." },
];

export const MINDSET_BEFORE_SESSION: MindsetEntry[] = [
  { tag: "Process", quote: "Boring preparation, sharp execution.", tip: "Mark your levels, set alerts, define max daily risk. Then close the news tab." },
  { tag: "Patience", quote: "First trade ≠ best trade.", tip: "Let the open settle (15-30 min). Real direction usually shows after the algos finish front-running retail." },
];

export function pickMindset(mode: "daily" | "after-loss" | "after-quiz-fail" | "before-session", seed: string): MindsetEntry {
  const list =
    mode === "after-loss" ? MINDSET_AFTER_LOSS :
    mode === "after-quiz-fail" ? MINDSET_AFTER_QUIZ_FAIL :
    mode === "before-session" ? MINDSET_BEFORE_SESSION :
    MINDSET_DAILY;
  // Stable hash of seed string → index. Same date = same entry for everyone.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}