// Konfigurasi Email Sekolah FUSION
// Hanya email dengan domain ini yang diperbolehkan register

export const SCHOOL_CONFIG = {
  // Domain email yang diizinkan (ganti dengan domain sekolah kamu)
  allowedDomain: '@smkbiak.sch.id',

  // Pola email untuk auto-detect role
  rolePatterns: {
    guru: ['guru.', 'teacher.', 'dosen.', 'admin.'],
    siswa: ['siswa.', 'student.', 'nisn.'],
  },

  // Nama sekolah
  schoolName: 'SMK Biak',
};

// Fungsi untuk validasi email sekolah
export function isValidSchoolEmail(email: string): boolean {
  return email.toLowerCase().endsWith(SCHOOL_CONFIG.allowedDomain);
}

// Fungsi untuk auto-detect role dari email
export function detectRoleFromEmail(email: string): 'guru' | 'siswa' | null {
  const lower = email.toLowerCase();
  const localPart = lower.split('@')[0]; // bagian sebelum @

  // Cek pola guru
  for (const pattern of SCHOOL_CONFIG.rolePatterns.guru) {
    if (localPart.startsWith(pattern) || localPart.includes(pattern)) {
      return 'guru';
    }
  }

  // Cek pola siswa
  for (const pattern of SCHOOL_CONFIG.rolePatterns.siswa) {
    if (localPart.startsWith(pattern) || localPart.includes(pattern)) {
      return 'siswa';
    }
  }

  // Default: siswa (karena jumlah siswa lebih banyak)
  return 'siswa';
}
