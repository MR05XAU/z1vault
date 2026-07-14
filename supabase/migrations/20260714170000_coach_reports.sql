CREATE TABLE public.coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.coach_reports TO authenticated;
GRANT ALL ON public.coach_reports TO service_role;
ALTER TABLE public.coach_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach reports" ON public.coach_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
