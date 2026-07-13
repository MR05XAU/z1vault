-- Tradovate broker connection (per-user API credentials, distinct from SnapTrade's
-- app-level clientId/consumerKey model). Credentials are stored ciphertext-only.
CREATE TABLE public.tradovate_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'demo')),
  username_ciphertext TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  app_id_ciphertext TEXT NOT NULL,
  app_version TEXT NOT NULL DEFAULT '1.0',
  cid_ciphertext TEXT NOT NULL,
  sec_ciphertext TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tradovate_connections TO authenticated;
GRANT ALL ON public.tradovate_connections TO service_role;
ALTER TABLE public.tradovate_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tradovate connection read" ON public.tradovate_connections FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER tradovate_connections_updated BEFORE UPDATE ON public.tradovate_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Distinguish which broker a connected account came from, now that there are two.
ALTER TABLE public.brokerage_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'snaptrade';
