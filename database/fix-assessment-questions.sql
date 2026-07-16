-- Tabel soal assessment manual (seperti Google Forms)
-- Jalankan ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- RLS
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- Guru bisa manage soal di assessment mereka
CREATE POLICY "Guru can manage assessment questions" ON assessment_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN modules m ON m.id = a.module_id
      WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
    )
  );

-- Siswa bisa lihat soal assessment yang diikuti
CREATE POLICY "Siswa can view assessment questions" ON assessment_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN classroom_members cm ON cm.classroom_id = a.classroom_id
      WHERE a.id = assessment_id AND cm.student_id = auth.uid()
    )
  );
