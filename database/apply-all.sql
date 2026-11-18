-- FUSION LMS - gabungan semua migrasi database
-- Cara pakai: copy seluruh isi file ini ke Supabase SQL Editor, lalu Run.
-- Urutan sudah benar; aman dijalankan berurutan.


-- ============================================
-- FILE: migration-materials-classroom.sql
-- ============================================

-- ============================================
-- MIGRATION: Materials per Classroom
-- Fitur: materi dihubungkan ke kelas (business rule:
-- "Siswa hanya boleh melihat materi kelas yang diikuti")
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tambah kolom classroom_id (nullable = materi lama/global)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;

-- 2. Policy RLS materi (ganti policy lama yang join modules - rusak karena module_id nullable)
DROP POLICY IF EXISTS "Guru can manage materials" ON materials;
DROP POLICY IF EXISTS "Siswa can view materials" ON materials;

-- Guru hanya kelola materi di kelas yang diampu
CREATE POLICY "Guru can manage materials" ON materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid()
        )
    );

-- Siswa hanya melihat materi kelas yang diikuti + materi global (classroom_id NULL)
CREATE POLICY "Siswa can view materials" ON materials
    FOR SELECT USING (
        classroom_id IS NULL OR
        EXISTS (
            SELECT 1 FROM classroom_members WHERE classroom_id = materials.classroom_id AND student_id = auth.uid()
        )
    );

-- Admin kelola semua materi
CREATE POLICY "Admin can manage all materials" ON materials
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FILE: migration-materials-progress.sql
-- ============================================

-- ============================================
-- MIGRATION: Materials Progress (Tandai Selesai)
-- Fitur: siswa menandai materi selesai dipelajari
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tabel progress belajar materi
CREATE TABLE IF NOT EXISTS materials_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, student_id)
);

-- 2. RLS
ALTER TABLE materials_progress ENABLE ROW LEVEL SECURITY;

-- Siswa: kelola progress sendiri (tandai/batal selesai)
CREATE POLICY "Siswa can manage own progress" ON materials_progress
    FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Guru: lihat progress materi di kelas yang diampu (monitoring)
CREATE POLICY "Guru can view progress" ON materials_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM materials m
            JOIN classrooms c ON c.id = m.classroom_id
            WHERE m.id = material_id AND c.guru_id = auth.uid()
        )
    );

-- Admin: lihat semua progress
CREATE POLICY "Admin can view all progress" ON materials_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FILE: migration-rubric.sql
-- ============================================

-- ============================================
-- MIGRATION: Rubrik Penilaian
-- Fitur: guru menyusun rubrik per assessment, menilai
-- per kriteria, breakdown disimpan di submissions
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tabel kriteria rubrik
CREATE TABLE IF NOT EXISTS rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 10 CHECK (max_score > 0),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Kolom breakdown skor rubrik di submissions (JSONB: [{criterion, score, max_score}])
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rubric_scores JSONB;

-- 3. RLS
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;

-- Guru: kelola rubrik assessment di kelas yang diampu
CREATE POLICY "Guru can manage rubric criteria" ON rubric_criteria
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = assessment_id AND c.guru_id = auth.uid()
        )
    );

-- Siswa: lihat rubrik assessment kelas yang diikuti
CREATE POLICY "Siswa can view rubric criteria" ON rubric_criteria
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
            WHERE a.id = assessment_id AND cm.student_id = auth.uid()
        )
    );

-- Admin: kelola semua rubrik
CREATE POLICY "Admin can manage all rubric criteria" ON rubric_criteria
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FILE: fix-users-join.sql
-- ============================================

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

-- ============================================
-- FILE: migration-server-rules.sql
-- ============================================

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

-- ============================================
-- FILE: migration-v2.sql
-- ============================================

-- ============================================
-- FUSION LMS — Fitur Versi 2
-- Jadwal Pelajaran, Notifikasi, Riwayat Aktivitas
-- Jalankan setelah migration-server-rules.sql
-- ============================================

-- ============================================
-- 1. JADWAL PELAJARAN
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_classroom ON schedules(classroom_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day_of_week);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage schedules" ON schedules
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own class schedules" ON schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_id AND c.guru_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_id AND c.guru_id = auth.uid())
  );

CREATE POLICY "Siswa can view schedules" ON schedules
  FOR SELECT USING (
    classroom_id IS NULL
    OR EXISTS (
      SELECT 1 FROM classroom_members cm
      WHERE cm.classroom_id = schedules.classroom_id AND cm.student_id = auth.uid()
    )
  );

-- ============================================
-- 2. NOTIFIKASI
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'info'
    CHECK (type IN ('announcement', 'material', 'assessment', 'grade', 'info')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage notifications" ON notifications
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ============================================
-- 3. RIWAYAT AKTIVITAS
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and guru can view activity logs" ON activity_logs
  FOR SELECT USING (public.current_user_role() IN ('admin', 'guru'));

CREATE POLICY "Siswa can view own activity logs" ON activity_logs
  FOR SELECT USING (actor_id = auth.uid());

-- ============================================
-- 4. TRIGGER NOTIFIKASI & LOG AKTIVITAS
-- ============================================

-- Pengumuman baru
CREATE OR REPLACE FUNCTION public.on_announcement_created()
RETURNS TRIGGER AS $$
DECLARE
  target_url TEXT := '/dashboard/pengumuman';
BEGIN
  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (NEW.teacher_id, 'create', 'announcement', NEW.id, 'Membuat pengumuman: ' || NEW.title);

  IF NEW.classroom_id IS NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT u.id, 'Pengumuman Sekolah', NEW.title, 'announcement', target_url
    FROM users u
    WHERE u.id <> NEW.teacher_id AND u.role IN ('guru', 'siswa');
  ELSE
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT cm.student_id, 'Pengumuman Kelas', NEW.title, 'announcement', target_url
    FROM classroom_members cm
    WHERE cm.classroom_id = NEW.classroom_id AND cm.student_id <> NEW.teacher_id;

    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT c.guru_id, 'Pengumuman Kelas', NEW.title, 'announcement', target_url
    FROM classrooms c
    WHERE c.id = NEW.classroom_id AND c.guru_id <> NEW.teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_announcement_created ON announcements;
CREATE TRIGGER trg_on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.on_announcement_created();

-- Materi baru
CREATE OR REPLACE FUNCTION public.on_material_created()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
  target_url TEXT := '/dashboard/materi';
BEGIN
  IF NEW.classroom_id IS NOT NULL THEN
    SELECT guru_id INTO actor FROM classrooms WHERE id = NEW.classroom_id;

    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT cm.student_id, 'Materi Baru', NEW.title, 'material', target_url
    FROM classroom_members cm
    WHERE cm.classroom_id = NEW.classroom_id
      AND (actor IS NULL OR cm.student_id <> actor);
  END IF;

  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (actor, 'create', 'material', NEW.id, 'Menambahkan materi: ' || NEW.title);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_material_created ON materials;
CREATE TRIGGER trg_on_material_created
  AFTER INSERT ON materials
  FOR EACH ROW EXECUTE FUNCTION public.on_material_created();

-- Assessment baru
CREATE OR REPLACE FUNCTION public.on_assessment_created()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
  target_url TEXT := '/dashboard/tugas';
BEGIN
  SELECT guru_id INTO actor FROM classrooms WHERE id = NEW.classroom_id;

  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT cm.student_id, 'Assessment Baru', NEW.title, 'assessment', target_url
  FROM classroom_members cm
  WHERE cm.classroom_id = NEW.classroom_id;

  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (actor, 'create', 'assessment', NEW.id, 'Membuat assessment: ' || NEW.title);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_assessment_created ON assessments;
CREATE TRIGGER trg_on_assessment_created
  AFTER INSERT ON assessments
  FOR EACH ROW EXECUTE FUNCTION public.on_assessment_created();

-- Nilai baru / berubah
CREATE OR REPLACE FUNCTION public.on_submission_graded()
RETURNS TRIGGER AS $$
DECLARE
  a RECORD;
BEGIN
  IF NEW.score IS NULL OR NEW.score IS NOT DISTINCT FROM OLD.score THEN
    RETURN NEW;
  END IF;

  SELECT id, title, max_score INTO a FROM assessments WHERE id = NEW.assessment_id;

  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    NEW.student_id,
    'Nilai Diberikan',
    COALESCE(a.title, 'Assessment') || ': ' || NEW.score || '/' || COALESCE(a.max_score, 100),
    'grade',
    '/dashboard/nilai'
  );

  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (
    NEW.graded_by,
    'grade',
    'submission',
    NEW.id,
    'Memberi nilai ' || NEW.score || ' untuk ' || COALESCE(a.title, 'assessment')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_submission_graded ON submissions;
CREATE TRIGGER trg_on_submission_graded
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_submission_graded();

-- Pengumuman dihapus -> bersihkan notifikasi terkait (opsional, berbasis judul)
CREATE OR REPLACE FUNCTION public.on_announcement_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE type = 'announcement' AND title IN ('Pengumuman Sekolah', 'Pengumuman Kelas')
    AND message = OLD.title;

  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (OLD.teacher_id, 'delete', 'announcement', OLD.id, 'Menghapus pengumuman: ' || OLD.title);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_announcement_deleted ON announcements;
CREATE TRIGGER trg_on_announcement_deleted
  AFTER DELETE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.on_announcement_deleted();

-- ============================================
-- FILE: restore-rls.sql
-- ============================================

-- ============================================
-- RESTORE RLS: Aktifkan kembali RLS yang aman
-- Balik dari debug-submissions.sql (disable RLS)
-- dan fix-all-rls-policies.sql (allow all)
-- PENTING: Jalankan TERAKHIR setelah semua migration lain
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Aktifkan kembali RLS (balik dari debug-submissions.sql)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- 2. Drop semua policy allow_all
DROP POLICY IF EXISTS "allow_all_submissions" ON submissions;
DROP POLICY IF EXISTS "allow_all_student_answers" ON student_answers;
DROP POLICY IF EXISTS "allow_all_assessment_questions" ON assessment_questions;
DROP POLICY IF EXISTS "allow_all_assessments" ON assessments;

-- 3. USERS: tambah policy yang hilang (guru perlu lihat siswa, siswa perlu lihat guru)
DROP POLICY IF EXISTS "Guru can view students" ON users;
CREATE POLICY "Guru can view students" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classroom_members cm
            JOIN classrooms c ON c.id = cm.classroom_id
            WHERE cm.student_id = users.id AND c.guru_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Siswa can view teachers" ON users;
CREATE POLICY "Siswa can view teachers" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classrooms c
            JOIN classroom_members cm ON cm.classroom_id = c.id
            WHERE c.guru_id = users.id AND cm.student_id = auth.uid()
        )
    );

-- 4. ASSESSMENTS: policy guru berbasis classrooms (bukan modules yang rusak)
DROP POLICY IF EXISTS "Guru can manage assessments" ON assessments;
CREATE POLICY "Guru can manage assessments" ON assessments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
    );

-- 5. SUBMISSIONS: policy aman per role
DROP POLICY IF EXISTS "Siswa can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Siswa can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Guru can view submissions for their assessments" ON submissions;
DROP POLICY IF EXISTS "Guru can update submissions for grading" ON submissions;

-- Siswa: lihat & kumpulkan submission sendiri
CREATE POLICY "Siswa can view own submissions" ON submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Siswa can insert own submissions" ON submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Siswa: update submission sendiri (dibutuhkan auto-score kuis)
CREATE POLICY "Siswa can update own submissions" ON submissions
    FOR UPDATE USING (student_id = auth.uid());

-- Guru: lihat & nilai submission assessment di kelas yang diampu
CREATE POLICY "Guru can view submissions for grading" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = assessment_id AND c.guru_id = auth.uid()
        )
    );

CREATE POLICY "Guru can update submissions for grading" ON submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = assessment_id AND c.guru_id = auth.uid()
        )
    );

-- Admin: kelola semua submission
CREATE POLICY "Admin can manage all submissions" ON submissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. STUDENT_ANSWERS: siswa kelola jawaban sendiri, guru lihat
DROP POLICY IF EXISTS "Siswa can manage own answers" ON student_answers;

CREATE POLICY "Siswa can manage own answers" ON student_answers
    FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Guru can view student answers" ON student_answers;
CREATE POLICY "Guru can view student answers" ON student_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = assessment_id AND c.guru_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin can view all student answers" ON student_answers;
CREATE POLICY "Admin can view all student answers" ON student_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 7. ASSESSMENT_QUESTIONS: ganti policy yang join modules (rusak)
DROP POLICY IF EXISTS "Guru can manage assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Siswa can view assessment questions" ON assessment_questions;

CREATE POLICY "Guru can manage assessment questions" ON assessment_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = assessment_id AND c.guru_id = auth.uid()
        )
    );

CREATE POLICY "Siswa can view assessment questions" ON assessment_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
            WHERE a.id = assessment_id AND cm.student_id = auth.uid()
        )
    );

CREATE POLICY "Admin can manage all assessment questions" ON assessment_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FILE: migration-rls-hardening.sql
-- ============================================

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

-- ============================================
-- FILE: fix-rls-recursion.sql
-- ============================================

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

DROP POLICY IF EXISTS "Siswa can view joined classrooms" ON classrooms;
CREATE POLICY "Siswa can view joined classrooms" ON classrooms
  FOR SELECT USING (public.is_classroom_member(id));

DROP POLICY IF EXISTS "Guru can manage classroom members" ON classroom_members;
CREATE POLICY "Guru can manage classroom members" ON classroom_members
  FOR ALL USING (public.is_classroom_teacher(classroom_id))
  WITH CHECK (public.is_classroom_teacher(classroom_id));

-- ============================================
-- FILE: fix-anon-global-access.sql
-- ============================================

DROP POLICY IF EXISTS "Siswa can view materials" ON materials;
CREATE POLICY "Siswa can view materials" ON materials
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (classroom_id IS NULL OR public.is_classroom_member(classroom_id))
  );

DROP POLICY IF EXISTS "Siswa can view announcements" ON announcements;
CREATE POLICY "Siswa can view announcements" ON announcements
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (classroom_id IS NULL OR public.is_classroom_member(classroom_id))
  );

DROP POLICY IF EXISTS "Guru can view classroom events" ON calendar_events;
CREATE POLICY "Guru can view classroom events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (classroom_id IS NULL OR public.is_classroom_teacher(classroom_id))
  );

DROP POLICY IF EXISTS "Siswa can view calendar events" ON calendar_events;
CREATE POLICY "Siswa can view calendar events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (classroom_id IS NULL OR public.is_classroom_member(classroom_id))
  );

DROP POLICY IF EXISTS "Siswa can view schedules" ON schedules;
CREATE POLICY "Siswa can view schedules" ON schedules
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (classroom_id IS NULL OR public.is_classroom_member(classroom_id))
  );

-- ============================================
-- FILE: fix-avatars-storage.sql
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- FILE: fix-question-media-storage.sql
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "question_media_select" ON storage.objects;
DROP POLICY IF EXISTS "question_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "question_media_update" ON storage.objects;
DROP POLICY IF EXISTS "question_media_delete" ON storage.objects;

CREATE POLICY "question_media_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-media');

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
