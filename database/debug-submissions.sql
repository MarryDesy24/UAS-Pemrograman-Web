-- Debug: Cek apakah ada data di submissions
SELECT COUNT(*) as total_submissions FROM submissions;

-- Debug: Cek apakah ada data di student_answers
SELECT COUNT(*) as total_answers FROM student_answers;

-- Debug: Lihat semua submissions
SELECT s.id, s.assessment_id, s.student_id, s.score, s.submitted_at
FROM submissions s
LIMIT 10;

-- Disable RLS暂时 untuk testing
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions DISABLE ROW LEVEL SECURITY;
