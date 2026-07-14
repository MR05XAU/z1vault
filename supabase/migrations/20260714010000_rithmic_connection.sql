-- Rithmic broker connection (used by prop-firm accounts, which are not
-- eligible for Tradovate's own API — Rithmic is the data/execution vendor
-- most prop firms actually run on). Protocol is WebSocket + protobuf,
-- distinct enough from SnapTrade/Tradovate to warrant its own credentials
-- table: gateway host + system_name vary per prop firm, not a fixed constant.
CREATE TABLE public.rithmic_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL,
  system_name TEXT NOT NULL,
  username_ciphertext TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  app_name TEXT NOT NULL DEFAULT 'z1vault',
  app_version TEXT NOT NULL DEFAULT '1.0',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rithmic_connections TO authenticated;
GRANT ALL ON public.rithmic_connections TO service_role;
ALTER TABLE public.rithmic_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rithmic connection read" ON public.rithmic_connections FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER rithmic_connections_updated BEFORE UPDATE ON public.rithmic_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
