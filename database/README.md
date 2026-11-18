# FUSION LMS — Database

`database/schema.sql` adalah **satu sumber kebenaran** untuk struktur database.
File migrasi di folder ini hanya diperlukan jika database sudah berjalan dan
belum memiliki perubahan terbaru.

## Setup database baru

1. Buat project Supabase.
2. Buka SQL Editor, jalankan `schema.sql`.
3. Konfigurasi environment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# server-only
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_REGISTER_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` dan `ADMIN_REGISTER_SECRET` **jangan** memakai
prefix `NEXT_PUBLIC_` dan jangan di-commit ke repository.

## Urutan migrasi (database yang sudah ada)

Jalankan sesuai urutan. Semua file idempoten (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`)
sebisa mungkin, tetapi tetap backup database sebelum eksekusi.

1. `schema-minimal.sql` / struktur awal (hanya jika belum ada tabel)
2. `trigger.sql`
3. `migration-calendar.sql`
4. `fix-assessment-questions.sql`
5. `fix-student-answers.sql`
6. `fix-assessment-module-id.sql`
7. `fix-users-join.sql`
8. `migration-materials-classroom.sql`
9. `migration-materials-progress.sql`
10. `migration-rubric.sql`
11. `migration-server-rules.sql` — owner mapel, deadline & batas nilai, RLS subjects/announcements
12. `migration-v2.sql` — jadwal, notifikasi, riwayat aktivitas
13. `restore-rls.sql` — mengaktifkan kembali RLS aman untuk assessment/submission
14. `migration-rls-hardening.sql` — **terakhir**, menghapus policy `allow_all_*` dan menutup RLS users/classrooms/members/materials/modules/assessments

> Shortcut: `apply-all.sql` berisi gabungan langkah 8–14 dengan urutan yang benar.
> Jika memakai `schema.sql` terbaru pada database baru, langkah 1–14 tidak perlu.

## Trigger `auth.users`

Saat pengguna mendaftar lewat Supabase Auth, trigger `on_auth_user_created`
menjalankan fungsi `public.handle_new_user()`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Fungsi tersebut menyalin `id`, `nama` (dari `raw_user_meta_data->>'nama'`),
`email`, dan `role` (default `siswa`) ke `public.users`. Jika aplikasi juga
melakukan `upsert` ke `public.users`, operasi tersebut aman karena
`handle_new_user()` memakai `ON CONFLICT (id) DO UPDATE`.

## Catatan desain

- `announcements.classroom_id = NULL` berarti pengumuman sekolah (admin).
- `materials.classroom_id` dan `assessments.classroom_id` menentukan akses kelas.
- `modules` dipertahankan sebagai tabel legacy modul ajar; fitur ini tidak dipakai UI.
- `subjects.owner_id` diisi otomatis dari `auth.uid()` saat guru membuat mapel.
- `submissions` memiliki trigger `enforce_submission_rules` untuk deadline dan batas nilai.
- Notifikasi dan activity log dibuat otomatis lewat trigger pada `announcements`,
  `materials`, `assessments`, dan `submissions`.
- RLS memakai helper `public.current_user_role()` (SECURITY DEFINER) agar tidak
  terjadi rekursi policy pada tabel `users`.
