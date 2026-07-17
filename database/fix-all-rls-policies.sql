-- Reset SEMUA RLS policies ke allow all
-- Jalankan ini di Supabase SQL Editor

-- submissions
DROP POLICY IF EXISTS "Siswa can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Siswa can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Guru can view submissions" ON submissions;
DROP POLICY IF EXISTS "Guru can update submissions" ON submissions;
DROP POLICY IF EXISTS "Guru can view submissions for their assessments" ON submissions;
DROP POLICY IF EXISTS "Guru can update submissions for grading" ON submissions;
DROP POLICY IF EXISTS "allow_all_submissions" ON submissions;
CREATE POLICY "allow_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- student_answers
DROP POLICY IF EXISTS "allow_all_student_answers" ON student_answers;
DROP POLICY IF EXISTS "Siswa can manage own answers" ON student_answers;
DROP POLICY IF EXISTS "Guru can view student answers" ON student_answers;
CREATE POLICY "allow_all_student_answers" ON student_answers FOR ALL USING (true) WITH CHECK (true);

-- assessment_questions
DROP POLICY IF EXISTS "allow_all_assessment_questions" ON assessment_questions;
DROP POLICY IF EXISTS "Guru can manage assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Siswa can view assessment questions" ON assessment_questions;
CREATE POLICY "allow_all_assessment_questions" ON assessment_questions FOR ALL USING (true) WITH CHECK (true);

-- assessments
DROP POLICY IF EXISTS "allow_all_assessments" ON assessments;
DROP POLICY IF EXISTS "Guru can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Siswa can view assessments" ON assessments;
CREATE POLICY "allow_all_assessments" ON assessments FOR ALL USING (true) WITH CHECK (true);
