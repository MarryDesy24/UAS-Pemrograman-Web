-- ============================================
-- FUSION LMS — RLS Hardening untuk database lama
-- Menghapus policy "allow_all_*" yang tersisa dan
-- menerapkan policy per role.
-- Jalankan setelah restore-rls.sql.
-- ============================================

-- USERS: hapus allow-all; policy aman sudah dibuat oleh migration-server-rules.sql
DROP POLICY IF EXISTS "allow_all_users" ON users;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CLASSROOMS
DROP POLICY IF EXISTS "allow_all_classrooms" ON classrooms;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all classrooms" ON classrooms;
CREATE POLICY "Admin can manage all classrooms" ON classrooms
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Guru can manage own classrooms" ON classrooms;
CREATE POLICY "Guru can manage own classrooms" ON classrooms
  FOR ALL USING (guru_id = auth.uid())
  WITH CHECK (guru_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can view joined classrooms" ON classrooms;
CREATE POLICY "Siswa can view joined classrooms" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = classrooms.id AND student_id = auth.uid()
    )
  );

-- CLASSROOM MEMBERS
DROP POLICY IF EXISTS "allow_all_classroom_members" ON classroom_members;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage classroom members" ON classroom_members;
CREATE POLICY "Admin can manage classroom members" ON classroom_members
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Guru can manage classroom members" ON classroom_members;
CREATE POLICY "Guru can manage classroom members" ON classroom_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
  );

DROP POLICY IF EXISTS "Siswa can view own memberships" ON classroom_members;
CREATE POLICY "Siswa can view own memberships" ON classroom_members
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can join classroom" ON classroom_members;
CREATE POLICY "Siswa can join classroom" ON classroom_members
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can leave classroom" ON classroom_members;
CREATE POLICY "Siswa can leave classroom" ON classroom_members
  FOR DELETE USING (student_id = auth.uid());

-- ASSESSMENTS: restore-rls.sql hanya membuat policy guru;
-- tambahkan policy admin & siswa agar monitoring dan halaman tugas tetap jalan.
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all assessments" ON assessments;
CREATE POLICY "Admin can manage all assessments" ON assessments
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Siswa can view assessments" ON assessments;
CREATE POLICY "Siswa can view assessments" ON assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = assessments.classroom_id AND student_id = auth.uid()
    )
  );

-- MATERIALS: policy aman sudah dibuat migration-materials-classroom.sql
DROP POLICY IF EXISTS "allow_all_materials" ON materials;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- MODULES (legacy)
DROP POLICY IF EXISTS "allow_all_modules" ON modules;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage modules" ON modules;
CREATE POLICY "Admin can manage modules" ON modules
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Guru can manage own modules" ON modules;
CREATE POLICY "Guru can manage own modules" ON modules
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can view published modules" ON modules;
CREATE POLICY "Siswa can view published modules" ON modules
  FOR SELECT USING (
    classroom_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = modules.classroom_id AND student_id = auth.uid()
    )
  );
