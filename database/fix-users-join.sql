-- Fix:允许 user insert profil sendiri ke tabel users (untuk join kelas)
-- Jalankan ini di Supabase SQL Editor

-- 1. Tambah INSERT policy untuk user insert profil sendiri
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Tambah UPDATE policy untuk user update profil sendiri
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. Backfill: insert user dari auth.users yang belum ada di public.users
INSERT INTO public.users (id, nama, email, role)
SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'nama', split_part(au.email, '@', 1)),
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'siswa')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
