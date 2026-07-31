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
