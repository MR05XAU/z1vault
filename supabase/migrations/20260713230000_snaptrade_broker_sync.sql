-- SnapTrade broker sync: user registration, connected accounts, sync log.
-- All writes happen server-side (edge functions using service_role) since
-- these tables hold encrypted SnapTrade secrets and sync state; clients get
-- read-only access to their own rows.

CREATE TABLE public.snaptrade_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  st_user_id TEXT NOT NULL UNIQUE,
  st_user_secret_ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.snaptrade_users TO authenticated;
GRANT ALL ON public.snaptrade_users TO service_role;
ALTER TABLE public.snaptrade_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snaptrade user read" ON public.snaptrade_users FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER snaptrade_users_updated BEFORE UPDATE ON public.snaptrade_users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.brokerage_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  st_account_id TEXT NOT NULL,
  brokerage_name TEXT,
  account_name TEXT,
  account_number_masked TEXT,
  currency TEXT,
  total_value NUMERIC,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, st_account_id)
);
GRANT SELECT ON public.brokerage_accounts TO authenticated;
GRANT ALL ON public.brokerage_accounts TO service_role;
ALTER TABLE public.brokerage_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brokerage accounts read" ON public.brokerage_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER brokerage_accounts_updated BEFORE UPDATE ON public.brokerage_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.broker_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  trades_added INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
GRANT SELECT ON public.broker_sync_log TO authenticated;
GRANT ALL ON public.broker_sync_log TO service_role;
ALTER TABLE public.broker_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync log read" ON public.broker_sync_log FOR SELECT USING (auth.uid() = user_id);

-- Trades: source + external id, so repeated syncs upsert idempotently.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS trades_user_external_uniq
  ON public.trades(user_id, external_id) WHERE external_id IS NOT NULL;
