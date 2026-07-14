-- Import batches: every CSV import gets an id, so "undo import" can roll
-- back exactly the rows from one batch instead of guessing by timestamp.
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import batches" ON public.import_batches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_entry_price NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS commission_per_unit NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS premarket_plan TEXT,
  ADD COLUMN IF NOT EXISTS review_answers JSONB;

-- Manual edit audit log — every update to a trade's core fields via the UI
-- appends a row here rather than silently overwriting history.
CREATE TABLE public.trade_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.trade_edits TO authenticated;
GRANT ALL ON public.trade_edits TO service_role;
ALTER TABLE public.trade_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trade edits" ON public.trade_edits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX trade_edits_trade_idx ON public.trade_edits(trade_id, created_at DESC);

-- Per-symbol futures commission defaults the app can pre-fill (ES=$50/pt
-- style multipliers live in the frontend's static table, not here — this
-- table is just the user's own commission-per-contract overrides).
CREATE TABLE public.commission_rates (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol_root TEXT NOT NULL,
  commission_per_unit NUMERIC(10,4) NOT NULL,
  PRIMARY KEY (user_id, symbol_root)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rates TO authenticated;
GRANT ALL ON public.commission_rates TO service_role;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own commission rates" ON public.commission_rates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trading streak counter (consecutive days with a completed post-trade
-- review) — derived from review_answers being non-null per trade, no
-- separate table needed; kept here as a comment for future readers.
