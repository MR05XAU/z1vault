-- Z1 INSIGHTS audiobook: each generated MP3 is served by the app's static
-- hosting and exposed only within the already access-controlled reader.
ALTER TABLE public.book_chapters
  ADD COLUMN IF NOT EXISTS audio_url text;

UPDATE public.book_chapters
SET audio_url = '/audio/ch' || lpad(chapter_number::text, 2, '0') || '.mp3'
WHERE chapter_number BETWEEN 1 AND 30;
