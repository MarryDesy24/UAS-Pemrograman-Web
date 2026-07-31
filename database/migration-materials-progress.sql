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
