# Struktur PRD yang Saya Rekomendasikan

```
PRODUCT REQUIREMENT DOCUMENT

FUSION
Platform Manajemen Pembelajaran Sekolah Terintegrasi

Versi 1.0
```

---

# BAB 1 Pendahuluan

## 1.1 Latar Belakang

Perkembangan teknologi digital telah mengubah berbagai aspek kehidupan, termasuk sektor pendidikan. Namun, masih banyak sekolah yang menggunakan proses pembelajaran yang terpisah antara penyampaian materi, pengumpulan tugas, penilaian, serta penyusunan modul ajar. Guru sering kali harus menggunakan beberapa platform berbeda sehingga proses pembelajaran menjadi kurang efisien.

Selain itu, pembelajaran berbasis industri pada jenjang SMK memerlukan media digital yang mampu mengintegrasikan materi pembelajaran, asesmen, serta pemantauan perkembangan belajar peserta didik secara terstruktur.

Oleh karena itu dikembangkan **FUSION (Future Unified School Integrated Online Network)** sebagai Platform Manajemen Pembelajaran Sekolah Terintegrasi yang menggabungkan proses pembelajaran, asesmen digital, dan monitoring pembelajaran dalam satu aplikasi berbasis web.

---

## 1.2 Tujuan

Membangun aplikasi pembelajaran berbasis web yang mampu:

* memudahkan guru mengelola pembelajaran
* memudahkan siswa mengikuti pembelajaran
* menyediakan asesmen digital
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

✅ Modul Ajar

✅ Materi

✅ Assessment

✅ Submission

✅ Penilaian

✅ Pengumuman

---

## Future

* Kalender
* Jadwal
* Progress
* Notifikasi

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

* Membuat Modul Ajar
* Upload Materi
* Membuat Assessment
* Memberi Nilai
* Membuat Pengumuman

---

## Siswa

* Join Kelas
* Belajar
* Upload Tugas
* Melihat Nilai

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

* Jumlah kelas
* Jumlah materi
* Jumlah assessment
* Assessment belum dinilai

---

### Dashboard Siswa

* Jadwal hari ini
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

---

## Modul Modul Ajar

Ini menjadi fitur utama FUSION.

Guru membuat

```
Judul

Deskripsi

Tujuan Pembelajaran

Kompetensi Awal

Materi Pokok

Pertanyaan Pemantik

Referensi

Video Youtube

Dokumen

```

---

## Modul Materi

Jenis

PDF

DOCX

PPT

Video Youtube

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
```

---

## Modul Submission

Siswa

Upload

* PDF
* DOCX
* PPT
* ZIP

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
```

Siswa melihat

```
Nilai

Feedback
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

# BAB 7 Database

## users

```
id

nama

email

role

created_at
```

---

## classrooms

```
id

nama

kode

guru_id

semester

tahun_ajaran
```

---

## subjects

```
id

nama

kode
```

---

## modules

```
id

subject_id

teacher_id

title

description

learning_objectives

prerequisite

references

youtube_url

created_at
```

---

## materials

```
id

module_id

title

file_url

youtube_url
```

---

## assessments

```
id

module_id

type

title

deadline

max_score
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
```

---

## announcements

```
id

classroom_id

title

content
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

Assessment tidak bisa dikumpulkan setelah deadline.

Nilai maksimal 100.

Kode kelas unik.

Satu guru dapat memiliki banyak kelas.

Satu kelas memiliki banyak siswa.

Satu modul ajar dapat memiliki banyak materi.

Satu modul ajar dapat memiliki banyak assessment.

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

## Versi 1

* Login
* Dashboard
* Kelas
* Modul Ajar
* Materi
* Assessment
* Penilaian

---

## Versi 2

* Kalender Akademik
* Jadwal Pelajaran
* Progress Belajar
* Notifikasi
* Riwayat Aktivitas
* Dashboard Analitik

---

# Rekomendasi Pengembangan

Melihat keseluruhan kebutuhan proyek Anda (UAS sekaligus LIDM), saya menyarankan agar implementasi dilakukan secara bertahap dengan urutan berikut:

1. **Autentikasi & Hak Akses** (Admin, Guru, Siswa).
2. **Manajemen Data Master** (Kelas, Mata Pelajaran, Pengguna).
3. **Modul Ajar & Materi** (inti dari FUSION).
4. **Assessment & Submission** (pretest, post-test, kuis, LKPD, tugas).
5. **Penilaian & Dashboard**.
6. **Pengumuman**.
7. **Fitur unggulan** seperti kalender, progress belajar, dan dashboard analitik.
