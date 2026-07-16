-- Real-user error monitoring: the frontend ErrorBoundary and a global
-- window.onerror hook insert here. Users can only INSERT their own rows;
-- reading is admin/service-role only (support triage).
CREATE TABLE public.client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.client_errors TO authenticated, anon;
GRANT ALL ON public.client_errors TO service_role;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
-- Anyone may log an error for themselves (or anonymously); nobody but
-- service_role can read them back.
CREATE POLICY "insert own client errors" ON public.client_errors
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE INDEX client_errors_created_idx ON public.client_errors(created_at DESC);
