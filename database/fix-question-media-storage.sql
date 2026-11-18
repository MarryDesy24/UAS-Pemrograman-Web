-- ============================================================
-- FIX: Upload media soal (bucket question-media)
-- Bucket `question-media` belum ada / belum punya policy,
-- sehingga upload gambar/video soal gagal karena RLS.
-- Jalankan di Supabase SQL Editor. Aman diulang (idempoten).
-- ============================================================

-- Pastikan bucket ada dan public
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bersihkan policy lama
DROP POLICY IF EXISTS "question_media_select" ON storage.objects;
DROP POLICY IF EXISTS "question_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "question_media_update" ON storage.objects;
DROP POLICY IF EXISTS "question_media_delete" ON storage.objects;

-- Semua orang boleh melihat media soal (bucket public)
CREATE POLICY "question_media_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-media');

-- Guru/admin (authenticated) boleh upload media soal
CREATE POLICY "question_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-media');

CREATE POLICY "question_media_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'question-media')
  WITH CHECK (bucket_id = 'question-media');

CREATE POLICY "question_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-media');
