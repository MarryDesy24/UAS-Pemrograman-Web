-- ============================================
-- FUSION LMS - Database Schema
-- PostgreSQL (Supabase)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'siswa' CHECK (role IN ('admin', 'guru', 'siswa')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CLASSROOMS TABLE
-- ============================================
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50) UNIQUE NOT NULL,
    guru_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester VARCHAR(20) NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran VARCHAR(20) NOT NULL DEFAULT '2024/2025',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CLASSROOM_MEMBERS TABLE
-- ============================================
CREATE TABLE classroom_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

-- ============================================
-- 5. MODULES TABLE
-- ============================================
CREATE TABLE modules (
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

-- ============================================
-- 6. MATERIALS TABLE
-- ============================================
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(20) CHECK (file_type IN ('pdf', 'docx', 'ppt', 'youtube')),
    file_url TEXT,
    youtube_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. ASSESSMENTS TABLE
-- ============================================
CREATE TABLE assessments (
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

-- ============================================
-- 8. SUBMISSIONS TABLE
-- ============================================
CREATE TABLE submissions (
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

-- ============================================
-- 9. ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTION: Auto-create user profile on signup
-- ============================================
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

-- Trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can update users" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can delete users" ON users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Subjects
CREATE POLICY "Anyone can view subjects" ON subjects
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage subjects" ON subjects
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Classrooms
CREATE POLICY "Guru can manage their classrooms" ON classrooms
    FOR ALL USING (guru_id = auth.uid());

CREATE POLICY "Admin can manage all classrooms" ON classrooms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Siswa can view joined classrooms" ON classrooms
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = id AND student_id = auth.uid())
    );

-- Classroom Members
CREATE POLICY "Guru can manage classroom members" ON classroom_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
    );

CREATE POLICY "Siswa can view own membership" ON classroom_members
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Siswa can join classroom" ON classroom_members
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Modules
CREATE POLICY "Guru can manage their modules" ON modules
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Siswa can view modules in joined classrooms" ON modules
    FOR SELECT USING (
        classroom_id IS NULL OR
        EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = modules.classroom_id AND student_id = auth.uid())
    );

-- Materials
CREATE POLICY "Guru can manage materials" ON materials
    FOR ALL USING (
        EXISTS (SELECT 1 FROM modules WHERE id = module_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Siswa can view materials" ON materials
    FOR SELECT USING (true);

-- Assessments
CREATE POLICY "Guru can manage assessments" ON assessments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM modules WHERE id = module_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Siswa can view assessments in joined classrooms" ON assessments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = assessments.classroom_id AND student_id = auth.uid())
    );

-- Submissions
CREATE POLICY "Siswa can view own submissions" ON submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Siswa can insert own submissions" ON submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Guru can view submissions for their assessments" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN modules m ON a.module_id = m.id
            WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Guru can update submissions for grading" ON submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN modules m ON a.module_id = m.id
            WHERE a.id = assessment_id AND m.teacher_id = auth.uid()
        )
    );

-- Announcements
CREATE POLICY "Guru can manage their announcements" ON announcements
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Siswa can view announcements in joined classes" ON announcements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = announcements.classroom_id AND student_id = auth.uid())
    );

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Anyone can view materials" ON storage.objects
    FOR SELECT USING (bucket_id = 'materials');

CREATE POLICY "Authenticated can upload materials" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Students can upload submissions" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "Guru can view submissions files" ON storage.objects
    FOR SELECT USING (bucket_id = 'submissions');
