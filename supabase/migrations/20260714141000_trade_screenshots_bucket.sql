-- Storage bucket for pasted/uploaded trade screenshots. Path convention:
-- {user_id}/{trade_id}/{filename} — policies key off the first path segment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket is public, so reads don't need an RLS policy (served via public URL).
CREATE POLICY "own trade screenshots write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own trade screenshots delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
