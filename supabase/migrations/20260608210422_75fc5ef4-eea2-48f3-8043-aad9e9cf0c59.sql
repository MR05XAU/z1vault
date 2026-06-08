
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- Seed sample chapters
INSERT INTO public.book_chapters (chapter_number, title, subtitle, content, estimated_minutes, order_index) VALUES
(1, 'The Trader''s Mindset', 'Discipline before edge', E'# The Trader''s Mindset\n\nBefore charts, before strategies, before risk models — there is the mind. Markets are mirrors. They reflect, with brutal honesty, every flaw in your psychology.\n\n## The Three Pillars\n\n**1. Patience.** The amateur acts. The professional waits. Most of trading is sitting on your hands until the market hands you a setup that fits your edge.\n\n**2. Process over outcome.** A great trade can lose money. A terrible trade can win. Judge yourself on the quality of your decisions, not the result of a single hand.\n\n**3. Acceptance of loss.** Losses are tuition. They are the cost of doing business. The trader who cannot lose cannot win.\n\n## The Inner Game\n\nFear and greed are the two currents that move every market. They also move every trader. The work is not to eliminate them — it is to recognize them in yourself before they move your finger to the button.\n\nWrite this on your screen: *I trade my plan, not my feelings.*', 9, 1),
(2, 'Reading Price Action', 'The language of the tape', E'# Reading Price Action\n\nPrice is the only truth. Every indicator, every model, every opinion — all of it derives from price. Learn to read price directly and you bypass an entire industry of noise.\n\n## Structure\n\nMarkets move in three states: **trending**, **ranging**, and **transitioning**. Your first job on any chart is to identify which one you are in. A strategy that prints money in a trend will bleed you dry in a range.\n\n## Higher Highs, Higher Lows\n\nAn uptrend is a sequence of higher highs and higher lows. Until that sequence breaks, the trend is intact. When it breaks, do not predict — react.\n\n## Volume Confirms\n\nPrice tells you what. Volume tells you how serious. A breakout on thin volume is a trap. A breakout on expanding volume is a message.', 11, 2),
(3, 'Risk Management', 'Survive first, profit second', E'# Risk Management\n\nThe single most important chapter in this book. Skip everything else. Read this twice.\n\n## The 1% Rule\n\nNever risk more than 1% of your account on a single trade. Not 2. Not 5. One. This rule alone separates traders who last decades from traders who last quarters.\n\n## Position Sizing\n\nPosition size is calculated *from* your stop, not *toward* it. \n\n`Position size = (Account × Risk%) / (Entry − Stop)`\n\nIf you cannot define your stop before entry, you have no trade. You have a hope.\n\n## The Math of Ruin\n\nLose 10%, you need 11% to recover. Lose 50%, you need 100%. Lose 90%, you need 900%. Drawdowns compound against you. Protect capital first; returns follow.', 12, 3),
(4, 'Trade Setups', 'Pattern, context, trigger', E'# Trade Setups\n\nA setup has three parts: a **pattern** the market has shown before, a **context** that makes the pattern likely to repeat, and a **trigger** that confirms the move is starting.\n\n## Without Context, Patterns Lie\n\nA double-bottom in an uptrend is a continuation. The same shape in a downtrend is often a fake-out. Same pattern. Different outcome. The difference is context.\n\n## The A+ Filter\n\nKeep a checklist. If a trade doesn''t meet 4 of 5 criteria — skip it. The trades you don''t take are as important as the ones you do.', 8, 4),
(5, 'The AI Edge', 'Using technology without losing the human', E'# The AI Edge\n\nAI doesn''t replace the trader. It compresses time. What used to take an analyst a week now takes a model thirty seconds.\n\n## Use It For\n\n- Summarizing news flow\n- Backtesting strategy variations\n- Surfacing setups across hundreds of instruments\n- Stress-testing your own reasoning\n\n## Don''t Use It For\n\n- Predicting the next candle\n- Replacing your risk management\n- Outsourcing the decision to enter\n\nThe model has no skin in the game. You do. Use AI as a co-pilot, never as a captain.', 7, 5);

-- Seed quizzes (3 questions per chapter for ch 1)
WITH c1 AS (SELECT id FROM public.book_chapters WHERE chapter_number = 1)
INSERT INTO public.quizzes (chapter_id, question, options, correct_answer, explanation, order_index)
SELECT c1.id, q.question, q.options::jsonb, q.ans, q.exp, q.idx FROM c1, (VALUES
  ('What are the three pillars described in the trader''s mindset?', '["Patience, process, acceptance of loss","Charts, indicators, models","Speed, leverage, conviction","Tips, news, gut feel"]', 0, 'Patience, process over outcome, and acceptance of loss form the foundation.', 1),
  ('How should a trader judge themselves?', '["By single-trade P&L","By the quality of their decisions","By account size","By number of trades per day"]', 1, 'Process over outcome — judge decisions, not isolated results.', 2),
  ('What is the goal regarding fear and greed?', '["Eliminate them","Amplify them","Recognize them before they drive action","Ignore them completely"]', 2, 'You cannot eliminate emotion. You can notice it before it moves your hand.', 3)
) AS q(question, options, ans, exp, idx);

WITH c2 AS (SELECT id FROM public.book_chapters WHERE chapter_number = 2)
INSERT INTO public.quizzes (chapter_id, question, options, correct_answer, explanation, order_index)
SELECT c2.id, q.question, q.options::jsonb, q.ans, q.exp, q.idx FROM c2, (VALUES
  ('What are the three states of a market?', '["Up, down, sideways","Trending, ranging, transitioning","Open, closed, halted","Bullish, bearish, neutral"]', 1, 'Identify the state first — strategies for trends fail in ranges.', 1),
  ('What defines an intact uptrend?', '["Green candles","Higher highs and higher lows","Rising volume","Positive news"]', 1, 'A sequence of higher highs and higher lows. Break that — react.', 2)
) AS q(question, options, ans, exp, idx);

WITH c3 AS (SELECT id FROM public.book_chapters WHERE chapter_number = 3)
INSERT INTO public.quizzes (chapter_id, question, options, correct_answer, explanation, order_index)
SELECT c3.id, q.question, q.options::jsonb, q.ans, q.exp, q.idx FROM c3, (VALUES
  ('What is the maximum risk per trade according to the 1% rule?', '["10% of account","5% of account","1% of account","Whatever feels right"]', 2, 'One percent. This single rule separates long-term traders from blown accounts.', 1),
  ('Position size is calculated from what?', '["Your account balance only","Your stop loss distance","Your profit target","Market volatility"]', 1, 'Position size = (Account × Risk%) / (Entry − Stop). No stop, no trade.', 2),
  ('If you lose 50%, what return do you need to recover?', '["50%","75%","100%","150%"]', 2, 'Drawdowns compound against you. A 50% loss requires a 100% gain to break even.', 3)
) AS q(question, options, ans, exp, idx);
