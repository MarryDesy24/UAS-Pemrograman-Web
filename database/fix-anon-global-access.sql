-- ============================================================
-- FIX: Akses anon ke data global
-- Policy lama memakai `classroom_id IS NULL OR ...` sehingga pengguna
-- yang tidak login (anon) tetap bisa membaca materi/pengumuman/
-- kalender/jadwal yang bersifat global. Tambahkan syarat login.
-- Jalankan di Supabase SQL Editor. Aman diulang (idempoten).
-- ============================================================

-- MATERIALS
DROP POLICY IF EXISTS "Siswa can view materials" ON materials;
CREATE POLICY "Siswa can view materials" ON materials
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "Siswa can view announcements" ON announcements;
CREATE POLICY "Siswa can view announcements" ON announcements
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- CALENDAR EVENTS
DROP POLICY IF EXISTS "Guru can view classroom events" ON calendar_events;
CREATE POLICY "Guru can view classroom events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_teacher(classroom_id)
    )
  );

DROP POLICY IF EXISTS "Siswa can view calendar events" ON calendar_events;
CREATE POLICY "Siswa can view calendar events" ON calendar_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );

-- SCHEDULES
DROP POLICY IF EXISTS "Siswa can view schedules" ON schedules;
CREATE POLICY "Siswa can view schedules" ON schedules
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      classroom_id IS NULL
      OR public.is_classroom_member(classroom_id)
    )
  );
