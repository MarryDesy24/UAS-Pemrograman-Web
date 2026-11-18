-- ============================================
-- FUSION LMS — Server-side business rules
-- Jalankan setelah migration-rubric.sql
-- ============================================

-- Helper: ambil role user tanpa memicu rekursi RLS pada tabel users
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- Hardening: role dari metadata hanya boleh guru/siswa, admin hanya via service role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nama, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('guru', 'siswa')
        THEN NEW.raw_user_meta_data->>'role'
      ELSE 'siswa'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 0. USERS — izin update profil & admin
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Cegah eskalasi role oleh pengguna non-admin
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
    AND COALESCE(public.current_user_role(), '') <> 'admin'
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_user_role ON users;
CREATE TRIGGER trg_protect_user_role
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_role();


-- ============================================
-- 1. SUBJECTS — owner (guru pengampu)
-- ============================================
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE subjects s
SET owner_id = c.guru_id
FROM (
  SELECT DISTINCT ON (subject_id) subject_id, guru_id
  FROM classrooms
  ORDER BY subject_id, created_at
) c
WHERE c.subject_id = s.id AND s.owner_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_subject_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_subject_owner ON subjects;
CREATE TRIGGER trg_set_subject_owner
  BEFORE INSERT ON subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_subject_owner();

-- RLS subjects: admin semua, guru miliknya, siswa mapel dari kelas yang diikuti
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subjects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subjects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admin can manage subjects" ON subjects
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own subjects" ON subjects
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Siswa can view joined subjects" ON subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN classroom_members cm ON cm.classroom_id = c.id
      WHERE c.subject_id = subjects.id AND cm.student_id = auth.uid()
    )
  );

-- ============================================
-- 2. ANNOUNCEMENTS — pengumuman sekolah (admin)
-- ============================================
ALTER TABLE announcements ALTER COLUMN classroom_id DROP NOT NULL;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.announcements', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admin can manage all announcements" ON announcements
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own announcements" ON announcements
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Siswa can view announcements" ON announcements
  FOR SELECT USING (
    classroom_id IS NULL
    OR EXISTS (
      SELECT 1 FROM classroom_members cm
      WHERE cm.classroom_id = announcements.classroom_id AND cm.student_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON announcements(teacher_id);

-- ============================================
-- 3. SUBMISSIONS — deadline & batas nilai di server
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_submission_rules()
RETURNS TRIGGER AS $$
DECLARE
  a RECORD;
  has_questions BOOLEAN;
BEGIN
  SELECT id, deadline, max_score INTO a FROM assessments WHERE id = NEW.assessment_id;

  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Assessment tidak ditemukan';
  END IF;

  -- Nilai tidak boleh negatif dan tidak boleh melebihi max_score / 100
  IF NEW.score IS NOT NULL THEN
    IF NEW.score < 0 THEN
      RAISE EXCEPTION 'Nilai tidak boleh negatif';
    END IF;
    IF NEW.score > 100 OR NEW.score > COALESCE(a.max_score, 100) THEN
      RAISE EXCEPTION 'Nilai melebihi batas maksimum (% / 100)', COALESCE(a.max_score, 100);
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND NEW.student_id = auth.uid() THEN
    SELECT EXISTS (
      SELECT 1 FROM assessment_questions WHERE assessment_id = NEW.assessment_id
    ) INTO has_questions;

    -- Siswa hanya boleh mengisi skor pada kuis yang punya soal (auto-score),
    -- dan tidak boleh mengubah feedback / penilai.
    IF NEW.score IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.score ELSE NULL END)
      AND NOT has_questions THEN
      RAISE EXCEPTION 'Siswa tidak boleh mengubah nilai assessment ini';
    END IF;

    IF TG_OP = 'UPDATE' AND NOT has_questions AND (
      NEW.feedback IS DISTINCT FROM OLD.feedback
      OR NEW.graded_by IS DISTINCT FROM OLD.graded_by
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
    ) THEN
      RAISE EXCEPTION 'Siswa tidak boleh mengubah data penilaian';
    END IF;

    -- Siswa tidak bisa mengumpulkan / mengubah jawaban setelah deadline
    IF TG_OP = 'INSERT' AND a.deadline IS NOT NULL AND now() > a.deadline THEN
      RAISE EXCEPTION 'Deadline assessment sudah lewat';
    ELSIF TG_OP = 'UPDATE'
      AND (NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.score IS DISTINCT FROM OLD.score)
      AND a.deadline IS NOT NULL AND now() > a.deadline THEN
      RAISE EXCEPTION 'Deadline assessment sudah lewat';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_submission_rules ON submissions;
CREATE TRIGGER trg_enforce_submission_rules
  BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_rules();

-- max_score assessment maksimal 100 (berlaku untuk data baru/perubahan)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_max_score_limit'
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_max_score_limit
      CHECK (max_score > 0 AND max_score <= 100) NOT VALID;
  END IF;
END $$;
