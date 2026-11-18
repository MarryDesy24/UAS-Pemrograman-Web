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
