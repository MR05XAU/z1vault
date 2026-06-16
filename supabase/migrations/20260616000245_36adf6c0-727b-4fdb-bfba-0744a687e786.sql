-- Strategies
CREATE TABLE public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategies" ON public.strategies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER strategies_updated BEFORE UPDATE ON public.strategies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trades
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long','short')),
  entry_price numeric NOT NULL,
  exit_price numeric,
  size numeric NOT NULL,
  pnl numeric,
  fees numeric DEFAULT 0,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  notes text,
  screenshot_url text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trades_user_opened_idx ON public.trades(user_id, opened_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades" ON public.trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trades_updated BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Vocab
CREATE TABLE public.vocab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  definition text NOT NULL,
  source text NOT NULL DEFAULT 'dictionary',
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocab TO authenticated;
GRANT ALL ON public.vocab TO service_role;
ALTER TABLE public.vocab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vocab" ON public.vocab FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shared definition cache (avoid repeat AI calls)
CREATE TABLE public.definitions_cache (
  word text PRIMARY KEY,
  definition text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.definitions_cache TO authenticated;
GRANT ALL ON public.definitions_cache TO service_role;
ALTER TABLE public.definitions_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read cache" ON public.definitions_cache FOR SELECT TO authenticated USING (true);

-- Recap flag on quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_recap boolean NOT NULL DEFAULT false;

-- Chapter summary for tutor context (cuts tokens dramatically)
ALTER TABLE public.book_chapters ADD COLUMN IF NOT EXISTS summary text;

-- Admin-granted entitlement flag (for comped test accounts)
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS granted_by_admin boolean NOT NULL DEFAULT false;