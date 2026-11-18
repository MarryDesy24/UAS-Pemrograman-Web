# Sprint 0 — Product Planning & Project Setup ✅ SELESAI

**Status:** SELESAI

---

# Sprint 1 — Setup Proyek & Autentikasi ✅ SELESAI

**Status:** SELESAI

---

# Sprint 2 — Manajemen Data Master ✅ SELESAI

**Status:** SELESAI

---

# Sprint 3 — Modul Ajar & Materi ✅ SELESAI

**Status:** SELESAI

---

# Sprint 4 — Assessment & Submission ✅ SELESAI

**Status:** SELESAI

---

# Sprint 5 — Penilaian & Dashboard ✅ SELESAI

**Status:** SELESAI

---

# Sprint 6 — Pengumuman & Finalisasi ✅ SELESAI

**Status:** SELESAI

---

# Sprint 7 — Fix & Pelengkapan MVP ✅ SELESAI

**Status:** SELESAI

### Fitur yang Ditambah/Diperbaiki:

1. **Join Kelas via Kode** — Siswa bisa join kelas dengan memasukkan kode kelas
2. **Dashboard Guru (lengkap)** — Tambah jumlah assessment & assessment belum dinilai
3. **Dashboard Siswa (lengkap)** — Tambah deadline tugas & nilai terbaru
4. **Ganti Password** — Halaman ganti password dari dropdown Header
5. **Logout Button** — Dropdown menu di Header (sudah ada, ditambahkan ke dropdown)
6. **Lampiran Assessment** — Guru bisa upload lampiran saat buat assessment
7. **Role-aware Kelas Page** — Halaman kelas menyesuaikan role (Admin CRUD, Guru view, Siswa join)

---

# Sprint 8 — Revisi UI/UX Design ✅ SELESAI

**Status:** SELESAI

**Referensi Desain:** https://itfest.ub.ac.id/home

### Perubahan yang Dilakukan:

1. **Dark Theme** — Seluruh halaman diubah ke background gelap (`bg-dark-900`)
2. **Glassmorphism** — Cards, input, sidebar, header menggunakan efek kaca transparan dengan backdrop-blur
3. **Typography** — Tambah font League Spartan untuk headings, Inter untuk body text
4. **Gradient Mesh Background** — Background dengan radial gradient multi-warna
5. **3D Animations** — Logo FUSION 3D rotating, floating particles, text glow effect
6. **Component Updates:**
   - **Sidebar** — Glass panel dengan gradient avatar dan active indicator
   - **Header** — Glass header dengan dropdown transparan
   - **Login/Register** — Glassmorphism card dengan floating decorations
   - **Dashboard** — Semua stat cards menggunakan glass-card style
   - **Modal** — Backdrop blur overlay dengan glass modal
7. **Custom Utilities:**
   - `.glass`, `.glass-strong`, `.glass-card`, `.glass-card-hover`
   - `.glass-input` untuk form inputs
   - `.btn-primary`, `.btn-secondary`, `.btn-danger` dengan gradient
   - `.text-gradient` untuk teks gradient
   - Animations: `logoFloat`, `logoRotate`, `textGlow`

### File yang Diupdate:

| File | Perubahan |
|------|-----------|
| `tailwind.config.ts` | Dark colors, font family, animations, shadows |
| `globals.css` | Glassmorphism utilities, 3D animations, custom scrollbar |
| `layout.tsx` | Dark background, toast styling |
| `page.tsx` | Landing page dengan animasi 3D |
| `Sidebar.tsx` | Dark glass sidebar |
| `Header.tsx` | Dark glass header |
| `login/page.tsx` | Glassmorphism login |
| `register/page.tsx` | Glassmorphism register |
| `forgot-password/page.tsx` | Glassmorphism reset |
| `admin/register/page.tsx` | Glassmorphism admin register |
| `dashboard/page.tsx` | Dark dashboard dengan glass cards |
| `dashboard/ganti-password/page.tsx` | Glassmorphism form |
| Semua halaman dashboard lainnya | Dark theme + glassmorphism |

---

# Sprint 9 — Finalisasi Fitur & Keamanan ✅ SELESAI

**Status:** SELESAI

### Fitur yang Ditambah/Diperbaiki:

1. **Materi per Kelas** — Guru memilih kelas saat upload materi; siswa hanya melihat materi kelas yang diikuti (business rule PRD)
2. **Tandai Materi Selesai** — Siswa bisa menandai materi selesai dipelajari + penghitung progress (tabel `materials_progress`)
3. **Jadwal Hari Ini** — Dashboard siswa menampilkan event kalender hari ini (kelas diikuti + global)
4. **Rubrik Penilaian** — Guru menyusun rubrik per assessment (kriteria + skor maks), menilai per kriteria dengan total otomatis, siswa melihat breakdown rubrik (tabel `rubric_criteria`, kolom `submissions.rubric_scores`)
5. **Restore RLS Aman** — RLS diaktifkan kembali (balik dari mode debug/allow-all) dengan policy per role berbasis `classrooms.guru_id`, termasuk policy guru melihat siswa & siswa melihat guru yang sebelumnya hilang
6. **Fix Dashboard Guru** — Kartu "Modul Ajar" (angka salah) diganti "Jumlah Materi"
7. **PRD v1.1** — Dokumen disinkronkan: Modul Ajar dihapus dari scope, tabel baru terdokumentasi, Kalender & kuis online masuk MVP

### SQL Migration (jalankan di Supabase SQL Editor sesuai urutan):

1. `database/migration-materials-classroom.sql`
2. `database/migration-materials-progress.sql`
3. `database/migration-rubric.sql`
4. `database/restore-rls.sql` (TERAKHIR — mengaktifkan kembali RLS yang aman)

---

# Ringkasan Project FUSION

## Tech Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth, Database, Storage)
- **Database:** PostgreSQL
- **Deployment:** Vercel

## Fitur yang Sudah Dibangun

### 1. Autentikasi
- Login dengan email & password
- Forgot password
- Ganti password (dari Header dropdown)
- Role-based access (Admin, Guru, Siswa)
- Middleware untuk route protection
- Logout (Header dropdown)

### 2. Dashboard
- Dashboard Admin (statistik guru, siswa, kelas, mata pelajaran)
- Dashboard Guru (kelas diampu, modul ajar, total assessment, assessment belum dinilai + link ke penilaian)
- Dashboard Siswa (deadline tugas mendatang, nilai terbaru, pengumuman terbaru)

### 3. Manajemen Data Master (Admin)
- CRUD Guru
- CRUD Siswa
- CRUD Mata Pelajaran
- CRUD Kelas

### 4. Materi (Guru)
- Upload Materi per Kelas (PDF, DOCX, PPT, YouTube)
- Lihat Materi
- Siswa: tandai materi selesai dipelajari + progress pribadi

### 5. Assessment & Submission
- Guru: Buat Assessment (Pretest, Post-test, Quiz, LKPD, Tugas) + Upload Lampiran + Soal Kuis (pilihan ganda & isian)
- Siswa: Lihat Tugas, Upload Jawaban (PDF, DOCX, PPT, ZIP) / Kerjakan Kuis Online (auto-score)
- Siswa: Join Kelas via kode kelas

### 6. Penilaian
- Guru: Lihat Submission, Beri Nilai & Feedback, Rubrik per Kriteria (total otomatis)
- Siswa: Lihat Nilai, Feedback, & Breakdown Rubrik

### 7. Pengumuman
- Guru: Buat/Edit/Hapus Pengumuman per Kelas
- Siswa: Lihat Pengumuman

### 8. Manajemen Kelas (Role-aware)
- Admin: CRUD Kelas lengkap
- Guru: Lihat kelas diampu + kelola anggota + QR code
- Siswa: Lihat kelas diikuti + Join Kelas pakai kode

### 9. Kalender Akademik
- Admin/Guru: CRUD Event (akademik, ujian, libur, tugas, lainnya) per kelas / global
- Siswa: Lihat event kelas diikuti + global (termasuk "Jadwal Hari Ini" di dashboard)

## Struktur Database

| Tabel | Deskripsi |
|-------|-----------|
| users | Data pengguna (admin, guru, siswa) |
| subjects | Mata pelajaran |
| classrooms | Kelas |
| classroom_members | Relasi siswa-kelas |
| materials | Materi pembelajaran (per kelas) |
| materials_progress | Tandai selesai materi (siswa) |
| assessments | Assessment/tugas |
| assessment_questions | Soal kuis online |
| student_answers | Jawaban kuis siswa |
| rubric_criteria | Kriteria rubrik penilaian |
| submissions | Pengumpulan tugas + nilai + rubric_scores |
| announcements | Pengumuman kelas / sekolah |
| calendar_events | Event kalender akademik |
| schedules | Jadwal pelajaran |
| notifications | Notifikasi pengguna |
| activity_logs | Riwayat aktivitas |

## Cara Menjalankan

1. Clone repository
2. Install dependencies: `npm install`
3. Setup Supabase project
4. Jalankan SQL schema dari `database/schema.sql`
5. Jalankan migration tambahan sesuai urutan:
   - `database/migration-calendar.sql`
   - `database/fix-assessment-questions.sql`
   - `database/fix-student-answers.sql`
   - `database/fix-assessment-module-id.sql`
   - `database/fix-users-join.sql`
   - `database/migration-materials-classroom.sql`
   - `database/migration-materials-progress.sql`
   - `database/migration-rubric.sql`
   - `database/migration-server-rules.sql`
   - `database/migration-v2.sql`
   - `database/restore-rls.sql` (TERAKHIR)
6. Isi `.env.local` dengan Supabase URL & Anon Key
7. Jalankan: `npm run dev`

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di Vercel
3. Tambahkan environment variables
4. Deploy

---

# Sprint 10 — Perbaikan Alur Kritis & Business Rules ✅ SELESAI

**Status:** SELESAI

### Fitur yang Ditambah/Diperbaiki:

1. **Halaman `/reset-password`** — Menyelesaikan alur lupa password (verifikasi sesi recovery, form password baru, redirect login).
2. **Secret Admin Server-side** — Registrasi admin lewat `POST /api/admin/register`; secret dibaca dari `ADMIN_REGISTER_SECRET` dan pembuatan user memakai `SUPABASE_SERVICE_ROLE_KEY` (tidak terekspos ke client).
3. **Business Rule di Database** — Migration `migration-server-rules.sql`:
   - Trigger deadline submission + batas nilai (0..max_score/100)
   - Siswa tidak bisa mengubah nilai/feedback assessment manual
   - `subjects.owner_id` + RLS mapel per guru
   - Pengumuman sekolah (`announcements.classroom_id` nullable) + RLS admin
   - Proteksi eskalasi role user
4. **Scope Mapel Guru** — Halaman mata pelajaran menampilkan guru pengampu, guru hanya dapat CRUD mapel miliknya.
5. **Pengumuman Sekolah** — Admin dapat CRUD pengumuman sekolah (semua kelas); siswa melihat pengumuman sekolah + kelas yang diikuti.
6. **Profil Pengguna** — Halaman `/dashboard/profil` untuk lihat/ubah nama + foto profil, semua role.

---

# Sprint 11 — Monitoring Admin & Fitur Versi 2 ✅ SELESAI

**Status:** SELESAI

### Fitur yang Ditambah:

1. **Monitoring Admin (read-only)** — `/dashboard/monitoring/{assessment,submission,nilai,materi}`.
2. **Jadwal Pelajaran** — `/dashboard/jadwal`, CRUD admin/guru, siswa melihat jadwal kelas + global.
3. **Progress Belajar** — `/dashboard/progress`, progress materi & pengumpulan tugas per kelas (admin/guru/siswa).
4. **Notifikasi** — `/dashboard/notifikasi`, notifikasi otomatis dari trigger pengumuman, materi, assessment, dan nilai.
5. **Statistik** — `/dashboard/statistik`, ringkasan angka per role.
6. **Riwayat Aktivitas** — `/dashboard/aktivitas`, log otomatis aktivitas pengumuman/materi/assessment/penilaian.
7. **Database** — `schema.sql` menjadi satu sumber kebenaran, `migration-v2.sql`, serta dokumentasi di `database/README.md`.
8. **Environment** — `.env.example` mencantumkan variabel server-only yang dibutuhkan.

### SQL Migration Tambahan (urutan setelah migration-rubric.sql):

1. `database/migration-server-rules.sql`
2. `database/migration-v2.sql`
3. `database/restore-rls.sql` (TERAKHIR, hanya untuk database lama)
