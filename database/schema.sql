-- ============================================================
-- FUSION LMS — Database Schema (single source of truth)
-- PostgreSQL / Supabase
-- ============================================================
-- Urutan lengkap setup + catatan migrasi: lihat database/README.md
-- Jalankan file ini pada project Supabase baru, lalu migrasi
-- tambahan yang tercantum di README (jika database sudah ada).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (profil publik, terhubung ke auth.users)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'siswa' CHECK (role IN ('admin', 'guru', 'siswa')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper role tanpa rekursi RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper akses kelas tanpa rekursi RLS (classrooms <-> classroom_members)
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

-- Trigger sinkronisasi auth.users -> public.users
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

-- ============================================================
-- 2. SUBJECTS (mata pelajaran)
-- ============================================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    deskripsi TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- ============================================================
-- 3. CLASSROOMS
-- ============================================================
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    guru_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester VARCHAR(20) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. CLASSROOM MEMBERS
-- ============================================================
CREATE TABLE classroom_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

-- ============================================================
-- 5. MODULES (legacy modul ajar; dipertahankan untuk kompatibilitas)
-- ============================================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    learning_objectives TEXT,
    prerequisite TEXT,
    materi_pokok TEXT,
    pertanyaan_pemantik TEXT,
    references TEXT,
    youtube_url TEXT,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. MATERIALS
-- ============================================================
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'ppt', 'youtube')),
    file_url TEXT,
    youtube_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. ASSESSMENTS
-- ============================================================
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pretest', 'post-test', 'quiz', 'lkpd', 'tugas')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    max_score INTEGER DEFAULT 100 CHECK (max_score > 0 AND max_score <= 100),
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Soal kuis / form
CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('paragraph', 'multiple_choice')),
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'link')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jawaban siswa
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id, question_id)
);

-- Kriteria rubrik
CREATE TABLE rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 10 CHECK (max_score > 0),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT,
    file_type VARCHAR(20),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    rubric_scores JSONB,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES users(id),
    UNIQUE(assessment_id, student_id)
);

-- ============================================================
-- 9. MATERIALS PROGRESS
-- ============================================================
CREATE TABLE materials_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, student_id)
);

-- ============================================================
-- 10. ANNOUNCEMENTS (classroom_id NULL = pengumuman sekolah)
-- ============================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 11. CALENDAR EVENTS
-- ============================================================
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(30) NOT NULL DEFAULT 'other' CHECK (event_type IN ('academic', 'exam', 'holiday', 'assignment', 'other')),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 12. SCHEDULES (Jadwal Pelajaran — V2)
-- ============================================================
CREATE TABLE schedules (
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

-- ============================================================
-- 13. NOTIFICATIONS (V2)
-- ============================================================
CREATE TABLE notifications (
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

-- ============================================================
-- 14. ACTIVITY LOGS (V2)
-- ============================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_subjects_owner ON subjects(owner_id);

CREATE INDEX idx_classrooms_guru ON classrooms(guru_id);
CREATE INDEX idx_classrooms_kode ON classrooms(kode);
CREATE INDEX idx_classrooms_subject ON classrooms(subject_id);

CREATE INDEX idx_classroom_members_classroom ON classroom_members(classroom_id);
CREATE INDEX idx_classroom_members_student ON classroom_members(student_id);

CREATE INDEX idx_modules_subject ON modules(subject_id);
CREATE INDEX idx_modules_teacher ON modules(teacher_id);
CREATE INDEX idx_modules_classroom ON modules(classroom_id);

CREATE INDEX idx_materials_module ON materials(module_id);
CREATE INDEX idx_materials_classroom ON materials(classroom_id);

CREATE INDEX idx_assessments_module ON assessments(module_id);
CREATE INDEX idx_assessments_classroom ON assessments(classroom_id);
CREATE INDEX idx_assessments_type ON assessments(type);

CREATE INDEX idx_submissions_assessment ON submissions(assessment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);

CREATE INDEX idx_announcements_classroom ON announcements(classroom_id);
CREATE INDEX idx_announcements_teacher ON announcements(teacher_id);

CREATE INDEX idx_schedules_classroom ON schedules(classroom_id);
CREATE INDEX idx_schedules_day ON schedules(day_of_week);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SERVER-SIDE BUSINESS RULES
-- ============================================================

-- Submission: deadline & batas nilai
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

CREATE TRIGGER trg_enforce_submission_rules
  BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_rules();

-- ============================================================
-- NOTIFICATION & ACTIVITY TRIGGERS (V2)
-- ============================================================
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

CREATE TRIGGER trg_on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.on_announcement_created();

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

CREATE TRIGGER trg_on_material_created
  AFTER INSERT ON materials
  FOR EACH ROW EXECUTE FUNCTION public.on_material_created();

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

CREATE TRIGGER trg_on_assessment_created
  AFTER INSERT ON assessments
  FOR EACH ROW EXECUTE FUNCTION public.on_assessment_created();

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

CREATE TRIGGER trg_on_submission_graded
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_submission_graded();

CREATE OR REPLACE FUNCTION public.on_announcement_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE type = 'announcement'
    AND title IN ('Pengumuman Sekolah', 'Pengumuman Kelas')
    AND message = OLD.title;

  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, description)
  VALUES (OLD.teacher_id, 'delete', 'announcement', OLD.id, 'Menghapus pengumuman: ' || OLD.title);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_on_announcement_deleted
  AFTER DELETE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.on_announcement_deleted();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "Guru can view students" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members cm
      JOIN classrooms c ON c.id = cm.classroom_id
      WHERE cm.student_id = users.id AND c.guru_id = auth.uid()
    )
  );

CREATE POLICY "Siswa can view teachers" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN classroom_members cm ON cm.classroom_id = c.id
      WHERE c.guru_id = users.id AND cm.student_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

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


-- SUBJECTS
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

-- CLASSROOMS
CREATE POLICY "Admin can manage all classrooms" ON classrooms
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own classrooms" ON classrooms
  FOR ALL USING (guru_id = auth.uid())
  WITH CHECK (guru_id = auth.uid());

CREATE POLICY "Siswa can view joined classrooms" ON classrooms
  FOR SELECT USING (public.is_classroom_member(id));

-- CLASSROOM MEMBERS
CREATE POLICY "Admin can manage classroom members" ON classroom_members
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage classroom members" ON classroom_members
  FOR ALL USING (public.is_classroom_teacher(classroom_id))
  WITH CHECK (public.is_classroom_teacher(classroom_id));

CREATE POLICY "Siswa can view own memberships" ON classroom_members
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Siswa can join classroom" ON classroom_members
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Siswa can leave classroom" ON classroom_members
  FOR DELETE USING (student_id = auth.uid());

-- MODULES (legacy)
CREATE POLICY "Admin can manage modules" ON modules
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own modules" ON modules
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Siswa can view published modules" ON modules
  FOR SELECT USING (
    classroom_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = modules.classroom_id AND student_id = auth.uid()
    )
  );

-- MATERIALS
CREATE POLICY "Admin can manage all materials" ON materials
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage materials" ON materials
  FOR ALL USING (
    classroom_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid()
    )
  )
  WITH CHECK (
    classroom_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid()
    )
  );

CREATE POLICY "Siswa can view materials" ON materials
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- MATERIALS PROGRESS
CREATE POLICY "Admin can view all progress" ON materials_progress
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "Guru can view progress" ON materials_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materials m
      JOIN classrooms c ON c.id = m.classroom_id
      WHERE m.id = material_id AND c.guru_id = auth.uid()
    )
  );

CREATE POLICY "Siswa can manage own progress" ON materials_progress
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ASSESSMENTS
CREATE POLICY "Admin can manage all assessments" ON assessments
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage assessments" ON assessments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
  );

CREATE POLICY "Siswa can view assessments" ON assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = assessments.classroom_id AND student_id = auth.uid()
    )
  );

-- ASSESSMENT QUESTIONS
CREATE POLICY "Admin can manage assessment questions" ON assessment_questions
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage assessment questions" ON assessment_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classrooms c ON c.id = a.classroom_id
      WHERE a.id = assessment_id AND c.guru_id = auth.uid()
    )
  )
  WITH CHECK (
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

-- STUDENT ANSWERS
CREATE POLICY "Admin can view all student answers" ON student_answers
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "Guru can view student answers" ON student_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classrooms c ON c.id = a.classroom_id
      WHERE a.id = assessment_id AND c.guru_id = auth.uid()
    )
  );

CREATE POLICY "Siswa can manage own answers" ON student_answers
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- RUBRIC CRITERIA
CREATE POLICY "Admin can manage all rubric criteria" ON rubric_criteria
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage rubric criteria" ON rubric_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classrooms c ON c.id = a.classroom_id
      WHERE a.id = assessment_id AND c.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classrooms c ON c.id = a.classroom_id
      WHERE a.id = assessment_id AND c.guru_id = auth.uid()
    )
  );

CREATE POLICY "Siswa can view rubric criteria" ON rubric_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
      WHERE a.id = assessment_id AND cm.student_id = auth.uid()
    )
  );

-- SUBMISSIONS
CREATE POLICY "Admin can manage all submissions" ON submissions
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

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

CREATE POLICY "Siswa can view own submissions" ON submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Siswa can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Siswa can update own submissions" ON submissions
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ANNOUNCEMENTS
CREATE POLICY "Admin can manage all announcements" ON announcements
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own announcements" ON announcements
  FOR ALL USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Siswa can view announcements" ON announcements
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- CALENDAR EVENTS
CREATE POLICY "Admin can manage calendar events" ON calendar_events
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Guru can manage own calendar events" ON calendar_events
  FOR ALL USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Guru can view classroom events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_teacher(classroom_id)
    )
  );

CREATE POLICY "Siswa can view calendar events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- SCHEDULES
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
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage notifications" ON notifications
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ACTIVITY LOGS
CREATE POLICY "Admin and guru can view activity logs" ON activity_logs
  FOR SELECT USING (public.current_user_role() IN ('admin', 'guru'));

CREATE POLICY "Siswa can view own activity logs" ON activity_logs
  FOR SELECT USING (actor_id = auth.uid());

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('modules', 'modules', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('question-media', 'question-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload materials" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view materials" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can update materials" ON storage.objects
  FOR UPDATE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete materials" ON storage.objects
  FOR DELETE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Students can upload submissions" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view submissions" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "question_media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-media');

CREATE POLICY "question_media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'question-media' AND auth.role() = 'authenticated');

CREATE POLICY "question_media_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'question-media' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'question-media' AND auth.role() = 'authenticated');

CREATE POLICY "question_media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'question-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
