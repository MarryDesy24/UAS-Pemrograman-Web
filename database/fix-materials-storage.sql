-- Fix: Pastikan bucket materials dan policy-nya benar
-- Jalankan ini di Supabase SQL Editor

-- 1. Pastikan bucket materials ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Hapus semua policy lama di bucket materials
DROP POLICY IF EXISTS "Anyone can view materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "materials_select" ON storage.objects;
DROP POLICY IF EXISTS "materials_insert" ON storage.objects;
DROP POLICY IF EXISTS "materials_update" ON storage.objects;
DROP POLICY IF EXISTS "materials_delete" ON storage.objects;

-- 3. Policy: Allow EVERYONE to read (public)
CREATE POLICY "materials_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'materials');

-- 4. Policy: Allow ALL authenticated users to upload
CREATE POLICY "materials_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials');

-- 5. Policy: Allow authenticated users to update their files
CREATE POLICY "materials_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materials');

-- 6. Policy: Allow authenticated users to delete their files
CREATE POLICY "materials_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materials');
