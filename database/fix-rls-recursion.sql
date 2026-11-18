-- ============================================================
-- FIX: Infinite recursion RLS classrooms <-> classroom_members
-- Gejala: "infinite recursion detected in policy for relation classrooms"
-- Jalankan di Supabase SQL Editor. Aman diulang (idempoten).
-- ============================================================

-- Helper SECURITY DEFINER agar pengecekan akses tidak memicu RLS berulang
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(p_classroom_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND guru_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_classroom_member(p_classroom_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = p_classroom_id AND student_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID) TO anon, authenticated;

-- CLASSROOMS: siswa melihat kelas yang diikuti (tanpa query classroom_members via RLS)
DROP POLICY IF EXISTS "Siswa can view joined classrooms" ON classrooms;
CREATE POLICY "Siswa can view joined classrooms" ON classrooms
  FOR SELECT USING (public.is_classroom_member(id));

-- CLASSROOM MEMBERS: guru mengelola anggota (tanpa query classrooms via RLS)
DROP POLICY IF EXISTS "Guru can manage classroom members" ON classroom_members;
CREATE POLICY "Guru can manage classroom members" ON classroom_members
  FOR ALL USING (public.is_classroom_teacher(classroom_id))
  WITH CHECK (public.is_classroom_teacher(classroom_id));
