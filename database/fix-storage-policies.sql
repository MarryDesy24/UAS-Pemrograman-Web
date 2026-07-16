-- Fix: Buat bucket baru untuk media soal dengan policy longgar
-- Jalankan ini di Supabase SQL Editor

-- 1. Buat bucket question-media
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Hapus semua policy lama di bucket ini
DROP POLICY IF EXISTS "question_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "question_media_select" ON storage.objects;
DROP POLICY IF EXISTS "question_media_delete" ON storage.objects;
DROP POLICY IF EXISTS "question_media_update" ON storage.objects;

-- 3. Policy: Allow ALL authenticated users to upload
CREATE POLICY "question_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-media');

-- 4. Policy: Allow EVERYONE to read (public)
CREATE POLICY "question_media_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-media');

-- 5. Policy: Allow authenticated users to delete
CREATE POLICY "question_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-media');
