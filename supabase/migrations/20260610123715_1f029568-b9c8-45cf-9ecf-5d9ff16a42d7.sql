ALTER TABLE public.book_chapters ADD COLUMN IF NOT EXISTS is_background boolean NOT NULL DEFAULT false;

UPDATE public.book_chapters SET is_background = true WHERE chapter_number IN (1, 3, 22, 23);

DELETE FROM public.quizzes WHERE chapter_id IN (SELECT id FROM public.book_chapters WHERE is_background = true);