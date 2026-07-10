CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'siswa' CHECK (role IN ('admin', 'guru', 'siswa')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    guru_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran VARCHAR(20) NOT NULL DEFAULT '2024/2025',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    learning_objectives TEXT,
    prerequisite TEXT,
    materi_pokok TEXT,
    pertanyaan_pemantik TEXT,
    references TEXT,
    youtube_url TEXT,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'ppt', 'youtube')),
    file_url TEXT,
    youtube_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pretest', 'post-test', 'quiz', 'lkpd', 'tugas')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    max_score INTEGER DEFAULT 100 CHECK (max_score > 0),
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT,
    file_type VARCHAR(20),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES users(id),
    UNIQUE(assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, nama, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'siswa')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all users" ON users;
CREATE POLICY "Admin can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage subjects" ON subjects;
CREATE POLICY "Admin can manage subjects" ON subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Guru can manage their classrooms" ON classrooms;
CREATE POLICY "Guru can manage their classrooms" ON classrooms FOR ALL USING (guru_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage all classrooms" ON classrooms;
CREATE POLICY "Admin can manage all classrooms" ON classrooms FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Siswa can view joined classrooms" ON classrooms;
CREATE POLICY "Siswa can view joined classrooms" ON classrooms FOR SELECT USING (
    EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = id AND student_id = auth.uid())
);

DROP POLICY IF EXISTS "Guru can manage classroom members" ON classroom_members;
CREATE POLICY "Guru can manage classroom members" ON classroom_members FOR ALL USING (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
);

DROP POLICY IF EXISTS "Siswa can view own membership" ON classroom_members;
CREATE POLICY "Siswa can view own membership" ON classroom_members FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can join classroom" ON classroom_members;
CREATE POLICY "Siswa can join classroom" ON classroom_members FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Guru can manage their modules" ON modules;
CREATE POLICY "Guru can manage their modules" ON modules FOR ALL USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can view modules" ON modules;
CREATE POLICY "Siswa can view modules" ON modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guru can manage materials" ON materials;
CREATE POLICY "Guru can manage materials" ON materials FOR ALL USING (
    EXISTS (SELECT 1 FROM modules WHERE id = module_id AND teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view materials" ON materials;
CREATE POLICY "Anyone can view materials" ON materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guru can manage assessments" ON assessments;
CREATE POLICY "Guru can manage assessments" ON assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM modules WHERE id = module_id AND teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Siswa can view assessments" ON assessments;
CREATE POLICY "Siswa can view assessments" ON assessments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Siswa can view own submissions" ON submissions;
CREATE POLICY "Siswa can view own submissions" ON submissions FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can insert own submissions" ON submissions;
CREATE POLICY "Siswa can insert own submissions" ON submissions FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Guru can view submissions" ON submissions;
CREATE POLICY "Guru can view submissions" ON submissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assessments a
        JOIN modules m ON a.module_id = m.id
        WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Guru can update submissions" ON submissions;
CREATE POLICY "Guru can update submissions" ON submissions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM assessments a
        JOIN modules m ON a.module_id = m.id
        WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Guru can manage announcements" ON announcements;
CREATE POLICY "Guru can manage announcements" ON announcements FOR ALL USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Siswa can view announcements" ON announcements;
CREATE POLICY "Siswa can view announcements" ON announcements FOR SELECT USING (
    EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = announcements.classroom_id AND student_id = auth.uid())
);

INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
