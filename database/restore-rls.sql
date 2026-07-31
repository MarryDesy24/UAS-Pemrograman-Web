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
