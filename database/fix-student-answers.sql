-- Tabel jawaban siswa
CREATE TABLE IF NOT EXISTS student_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id, question_id)
);

ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Allow all (simple policy)
CREATE POLICY "allow_all_student_answers" ON student_answers
  FOR ALL USING (true) WITH CHECK (true);
