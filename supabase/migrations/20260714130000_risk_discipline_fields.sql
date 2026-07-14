-- Per-user risk rules: daily loss limit / max trades guardrail, plus a
-- configurable pre-trade checklist (rule labels only — pass/fail is
-- snapshotted per trade in trades.checklist).
CREATE TABLE public.risk_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_loss_limit NUMERIC(14,2),
  max_trades_per_day INTEGER,
  checklist_rules TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_settings TO authenticated;
GRANT ALL ON public.risk_settings TO service_role;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own risk settings" ON public.risk_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER risk_settings_updated BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Snapshot of checklist rule pass/fail at the time each trade was logged,
-- e.g. [{"rule":"Stop set before entry","passed":true}, ...].
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]';

-- Mood already existed; sleep/screen-time let journal entries correlate
-- lifestyle factors with P&L.
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS screen_time_minutes INTEGER;
