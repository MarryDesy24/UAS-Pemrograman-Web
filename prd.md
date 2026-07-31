# PRODUCT REQUIREMENT DOCUMENT

FUSION
Platform Manajemen Pembelajaran Sekolah Terintegrasi

Versi 1.1 (31 Juli 2026)

## Changelog v1.1

* Modul Ajar dihapus dari scope (digantikan Modul Materi)
* Kalender Akademik pindah dari "Future" ke MVP
* Kuis online (soal pilihan ganda & isian) dengan auto-score ditambahkan
* Materi dihubungkan ke kelas (siswa hanya melihat materi kelas yang diikuti)
* Fitur "Tandai materi selesai dipelajari" ditambahkan
* Rubrik penilaian ditambahkan
* Dashboard siswa menampilkan jadwal hari ini

---

# BAB 1 Pendahuluan

## 1.1 Latar Belakang

Perkembangan teknologi digital telah mengubah berbagai aspek kehidupan, termasuk sektor pendidikan. Namun, masih banyak sekolah yang menggunakan proses pembelajaran yang terpisah antara penyampaian materi, pengumpulan tugas, penilaian, serta penyusunan modul ajar. Guru sering kali harus menggunakan beberapa platform berbeda sehingga proses pembelajaran menjadi kurang efisien.

Selain itu, pembelajaran berbasis industri pada jenjang SMK memerlukan media digital yang mampu mengintegrasikan materi pembelajaran, asesmen, serta pemantauan perkembangan belajar peserta didik secara terstruktur.

Oleh karena itu dikembangkan **FUSION (Future Oriented Industrial Simulation and Interdisciplinary Learning)** sebagai Platform Manajemen Pembelajaran Sekolah Terintegrasi yang menggabungkan proses pembelajaran, asesmen digital, dan monitoring pembelajaran dalam satu aplikasi berbasis web.

---

## 1.2 Tujuan

Membangun aplikasi pembelajaran berbasis web yang mampu:

* memudahkan guru mengelola pembelajaran
* memudahkan siswa mengikuti pembelajaran
* menyediakan asesmen digital (tugas, kuis, pretest/post-test, LKPD)
* mendukung pembelajaran berbasis industri
* meningkatkan efisiensi administrasi pembelajaran

---

## 1.3 Ruang Lingkup

Platform Web

Tidak mendukung Mobile Native

Menggunakan:

* NextJS
* github
* Supabase
* PostgreSQL
* Tailwind
* Vercel

---

# BAB 2 Product Vision

## Vision

Menjadi platform pembelajaran sekolah yang sederhana, modern, dan mudah digunakan untuk mendukung pembelajaran digital berbasis industri.

---

## Target User

Admin

Guru

Siswa

---

## Value Proposition

Satu platform untuk

* pembelajaran
* materi
* tugas
* asesmen
* nilai
* dashboard

---

# BAB 3 User Persona

## Admin

### Goal

Mengelola seluruh data sekolah.

---

## Guru

### Goal

Mengelola proses pembelajaran.

---

## Siswa

### Goal

Mengikuti pembelajaran secara online.

---

# BAB 4 Product Scope

## MVP

✅ Login

✅ Dashboard

✅ Manajemen Kelas

✅ Mata Pelajaran

✅ Materi

✅ Assessment (tugas, kuis, pretest/post-test, LKPD)

✅ Kuis Online (soal pilihan ganda & isian + auto-score)

✅ Submission

✅ Penilaian (termasuk rubrik)

✅ Pengumuman

✅ Kalender Akademik

✅ Tandai Materi Selesai

---

## Future

* Jadwal Pelajaran
* Progress Belajar (analitik)
* Notifikasi
* Riwayat Aktivitas
* Dashboard Analitik

---

# BAB 5 Hak Akses

## Admin

* CRUD Guru
* CRUD Siswa
* CRUD Mata Pelajaran
* CRUD Kelas
* Melihat seluruh data

---

## Guru

* Upload Materi (per kelas)
* Membuat Assessment (pretest, post-test, kuis, LKPD, tugas)
* Membuat Soal Kuis
* Membuat Rubrik Penilaian
* Memberi Nilai & Feedback
* Membuat Pengumuman
* Mengelola Anggota Kelas
* Membuat Event Kalender

---

## Siswa

* Join Kelas (kode kelas)
* Belajar & menandai materi selesai
* Mengerjakan Assessment (upload jawaban / kuis online)
* Melihat Nilai & Feedback (termasuk breakdown rubrik)

---

# BAB 6 Functional Requirements

Ini adalah inti PRD.

---

## Modul Login

### Deskripsi

Pengguna dapat masuk ke sistem menggunakan email dan password.

Role

* Admin
* Guru
* Siswa

---

### Fitur

* Login
* Logout
* Lupa Password
* Ganti Password

---

## Modul Dashboard

### Dashboard Admin

Menampilkan

* Total Guru
* Total Siswa
* Total Kelas
* Total Mata Pelajaran

---

### Dashboard Guru

* Jumlah kelas diampu
* Jumlah materi
* Jumlah assessment
* Assessment belum dinilai

---

### Dashboard Siswa

* Jadwal hari ini (event kalender)
* Deadline tugas
* Nilai terbaru
* Pengumuman

---

## Modul Mata Pelajaran

Guru dapat

* membuat
* edit
* hapus

Field

```
Nama

Kode

Semester

Deskripsi
```

---

## Modul Kelas

Field

```
Nama kelas

Kode kelas

Guru

Semester

Tahun ajaran
```

Siswa bergabung menggunakan kode kelas.

Guru dapat mengelola anggota kelas (tambah/keluarkan siswa) dan menampilkan QR code kelas.

---

## Modul Materi

Materi diunggah oleh guru dan dihubungkan ke kelas tertentu. Siswa hanya dapat melihat materi kelas yang diikuti.

Jenis

* PDF
* DOCX
* PPT
* Video Youtube

Field

```
Judul

Deskripsi

Jenis file

File / URL Youtube

Kelas
```

Siswa dapat menandai materi sebagai "selesai dipelajari" (tracking progress pribadi).

---

## Modul Assessment

Jenis Assessment

* Pretest
* Post-test
* Quiz
* LKPD
* Tugas

Field

```
Judul

Deskripsi

Deadline

Nilai Maksimum

Lampiran

Kelas
```

Kuis online mendukung soal pilihan ganda (dengan kunci jawaban, auto-score) dan soal isian (dinilai guru).

Guru dapat menyusun rubrik penilaian per assessment (kriteria + skor maksimum per kriteria).

---

## Modul Submission

Siswa

Upload

* PDF
* DOCX
* PPT
* ZIP

atau mengerjakan kuis online langsung di aplikasi.

Guru

Download

Review

Nilai

Feedback

---

## Modul Penilaian

Guru memberikan

```
Nilai

Feedback

Skor per kriteria rubrik (total otomatis)
```

Siswa melihat

```
Nilai

Feedback

Breakdown rubrik per kriteria
```

---

## Modul Pengumuman

Guru membuat

```
Judul

Isi

Tanggal
```

---

## Modul Kalender Akademik

Admin dan Guru dapat membuat event:

* Akademik
* Ujian
* Libur
* Tugas
* Lainnya

Event dapat dikaitkan ke kelas tertentu atau berlaku global (semua kelas). Siswa melihat event kelas yang diikuti + event global.

---

# BAB 7 Database

## users

```
id

nama

email

role

avatar_url

created_at
```

---

## subjects

```
id

nama

kode

deskripsi
```

---

## classrooms

```
id

nama

kode

guru_id

subject_id

semester

tahun_ajaran
```

---

## classroom_members

```
id

classroom_id

student_id

joined_at
```

---

## materials

```
id

classroom_id

title

description

file_type

file_url

youtube_url

created_at
```

---

## materials_progress

```
id

material_id

student_id

completed_at
```

---

## assessments

```
id

classroom_id

type

title

description

deadline

max_score

attachment_url
```

---

## assessment_questions

```
id

assessment_id

question_text

question_type

options

correct_answer

media_url

media_type

order_index
```

---

## rubric_criteria

```
id

assessment_id

criterion

max_score

order_index
```

---

## submissions

```
id

assessment_id

student_id

file_url

submitted_at

score

feedback

graded_at

graded_by

rubric_scores
```

---

## student_answers

```
id

assessment_id

student_id

question_id

answer
```

---

## announcements

```
id

classroom_id

teacher_id

title

content
```

---

## calendar_events

```
id

title

description

event_date

event_type

classroom_id

created_by
```

---

# BAB 8 Non Functional Requirement

Performance

Halaman terbuka <3 detik

---

Availability

99%

---

Security

Supabase Auth

RLS

HTTPS

---

Responsive

Desktop

Tablet

Mobile Browser

---

# BAB 9 Business Rules

Guru hanya dapat melihat kelas yang diajar.

Siswa hanya boleh melihat kelas yang diikuti.

Siswa hanya dapat melihat materi dan assessment kelas yang diikuti (materi global tanpa kelas tetap dapat dilihat semua siswa).

Assessment tidak bisa dikumpulkan setelah deadline.

Nilai maksimal 100.

Kode kelas unik.

Satu guru dapat memiliki banyak kelas.

Satu kelas memiliki banyak siswa.

Satu assessment dapat memiliki banyak soal.

Satu assessment dapat memiliki banyak kriteria rubrik.

Siswa hanya dapat menandai/menghapus tandai selesai untuk progress miliknya sendiri.

---

# BAB 10 Teknologi

Frontend

NextJS

Backend

Supabase

Database

PostgreSQL

Storage

Supabase Storage

Deployment

Vercel

Video

Youtube Embed

Repository

GitHub

---

# BAB 11 Roadmap

## Versi 1 (Selesai)

* Login
* Dashboard per role
* Kelas (join kode + kelola anggota)
* Mata Pelajaran
* Materi per kelas + tandai selesai
* Assessment (tugas, kuis online, pretest/post-test, LKPD)
* Penilaian (rubrik + auto-score)
* Pengumuman
* Kalender Akademik

---

## Versi 2

* Jadwal Pelajaran
* Progress Belajar (analitik per siswa)
* Notifikasi
* Riwayat Aktivitas
* Dashboard Analitik

---

# Hak Akses Per Halaman

| **Halaman**           | **Admin**                                                      | **Guru**                                                                          | **Siswa**                                                              |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Dashboard**         | Statistik sekolah, jumlah guru, siswa, kelas, mata pelajaran   | Ringkasan kelas, jumlah materi, assessment belum dinilai                          | Jadwal hari ini, deadline, nilai terbaru, pengumuman                    |
| **Guru**              | CRUD Guru                                                      | Lihat & ubah profil sendiri                                                       | -                                                                      |
| **Siswa**             | CRUD Siswa                                                     | Lihat daftar siswa di kelas yang diampu                                           | Lihat & ubah profil sendiri                                            |
| **Kelas**             | CRUD Kelas                                                     | Lihat kelas yang diampu, kelola anggota kelas, QR code                            | Lihat kelas yang diikuti, Join menggunakan kode kelas                  |
| **Mata Pelajaran**    | CRUD seluruh mata pelajaran                                    | CRUD mata pelajaran yang diampu                                                   | Lihat mata pelajaran yang diikuti                                      |
| **Materi**            | Monitoring materi                                              | CRUD materi (PDF, PPT, DOC, YouTube) per kelas                                    | Lihat, unduh, tonton video, tandai selesai dipelajari                  |
| **Assessment**        | Monitoring assessment                                          | CRUD Assessment (Pretest, Post-test, Kuis, LKPD, Tugas), soal kuis, rubrik        | Mengerjakan assessment (upload / kuis online)                          |
| **Submission**        | Monitoring pengumpulan                                         | Lihat seluruh submission, download jawaban, beri komentar                         | Upload jawaban, kerjakan kuis, lihat status pengumpulan                |
| **Penilaian**         | Monitoring nilai                                               | Beri nilai, feedback, skor rubrik per kriteria                                    | Lihat nilai, feedback, dan breakdown rubrik                            |
| **Kalender Akademik** | CRUD Kalender Akademik                                         | Tambah event kelas / global                                                       | Lihat jadwal dan event kelas yang diikuti                              |
| **Pengumuman**        | Monitoring pengumuman                                          | CRUD Pengumuman Kelas                                                             | Lihat pengumuman                                                       |

---

# Rekomendasi Pengembangan (sudah diimplementasikan)

Implementasi dilakukan secara bertahap dengan urutan:

1. **Autentikasi & Hak Akses** (Admin, Guru, Siswa) — selesai.
2. **Manajemen Data Master** (Kelas, Mata Pelajaran, Pengguna) — selesai.
3. **Materi** (inti dari FUSION, per kelas) — selesai.
4. **Assessment & Submission** (pretest, post-test, kuis online, LKPD, tugas) — selesai.
5. **Penilaian** (rubrik, auto-score, feedback) & Dashboard — selesai.
6. **Pengumuman** — selesai.
7. **Kalender Akademik** — selesai.

Fitur lanjutan (Versi 2): jadwal pelajaran, progress belajar analitik, notifikasi, riwayat aktivitas, dashboard analitik.
