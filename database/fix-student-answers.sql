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

-- Siswa bisa manage jawaban sendiri
CREATE POLICY "Siswa can manage own answers" ON student_answers
  FOR ALL USING (student_id = auth.uid());

-- Guru bisa lihat jawaban siswa di assessment mereka
CREATE POLICY "Guru can view student answers" ON student_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN modules m ON m.id = a.module_id
      WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
    )
  );
