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
