// Konfigurasi Email Sekolah FUSION
// Siswa: xxx@student.smk.id
// Guru: xxx@guru.smk.id

export const SCHOOL_CONFIG = {
  // Domain email yang diizinkan
  allowedDomains: {
    guru: '@guru.smk.id',
    siswa: '@student.smk.id',
  },

  // Nama sekolah
  schoolName: 'Learning Management System',
};

// Fungsi untuk validasi email sekolah
export function isValidSchoolEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.endsWith(SCHOOL_CONFIG.allowedDomains.guru) ||
    lower.endsWith(SCHOOL_CONFIG.allowedDomains.siswa)
  );
}

// Fungsi untuk auto-detect role dari email
export function detectRoleFromEmail(email: string): 'guru' | 'siswa' | null {
  const lower = email.toLowerCase();

  if (lower.endsWith(SCHOOL_CONFIG.allowedDomains.guru)) {
    return 'guru';
  }

  if (lower.endsWith(SCHOOL_CONFIG.allowedDomains.siswa)) {
    return 'siswa';
  }

  return null;
}

// Fungsi untuk mendapatkan domain dari role
export function getDomainByRole(role: 'guru' | 'siswa'): string {
  return SCHOOL_CONFIG.allowedDomains[role];
}
