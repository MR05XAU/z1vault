-- Per-user progress for self-contained mini-courses (e.g. "starting-trading").
-- completed holds lesson ids plus "quiz:<levelId>" markers — one row per
-- user per course keeps sync trivial across devices.
CREATE TABLE public.course_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  completed TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_progress TO authenticated;
GRANT ALL ON public.course_progress TO service_role;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own course progress" ON public.course_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
