-- ============================================
-- MIGRATION: Calendar Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(30) NOT NULL DEFAULT 'other' CHECK (event_type IN ('academic', 'exam', 'holiday', 'assignment', 'other')),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Admin can manage all events
CREATE POLICY "Admin can manage calendar events" ON calendar_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Guru can manage events they created
CREATE POLICY "Guru can manage own calendar events" ON calendar_events
    FOR ALL USING (created_by = auth.uid());

-- Guru can view events for their classrooms
CREATE POLICY "Guru can view classroom events" ON calendar_events
    FOR SELECT USING (
        classroom_id IS NULL OR
        EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND guru_id = auth.uid())
    );

-- Siswa can view events for their classrooms + global events
CREATE POLICY "Siswa can view calendar events" ON calendar_events
    FOR SELECT USING (
        classroom_id IS NULL OR
        EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = calendar_events.classroom_id AND student_id = auth.uid())
    );
