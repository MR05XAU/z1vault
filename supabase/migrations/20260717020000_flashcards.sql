-- Spaced-repetition review state per user per card. Cards themselves are
-- derived from existing quiz questions at runtime (card_id = quiz row id),
-- so this table only stores each user's SR schedule.
CREATE TABLE public.flashcard_reviews (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL,            -- references a quizzes.id
  ease INTEGER NOT NULL DEFAULT 0,  -- consecutive correct streak (SR box)
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_reviews TO authenticated;
GRANT ALL ON public.flashcard_reviews TO service_role;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcard reviews" ON public.flashcard_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
