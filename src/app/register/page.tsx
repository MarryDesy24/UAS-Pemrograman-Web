'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { SCHOOL_CONFIG, isValidSchoolEmail, detectRoleFromEmail } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'guru' | 'siswa'>('siswa');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [detectedRole, setDetectedRole] = useState<'guru' | 'siswa' | null>(null);

  // Auto-detect role saat email berubah
  useEffect(() => {
    if (email && isValidSchoolEmail(email)) {
      const detected = detectRoleFromEmail(email);
      setRole(detected);
      setDetectedRole(detected);
      setEmailError('');
    } else if (email && !email.includes('@')) {
      setEmailError('');
      setDetectedRole(null);
    } else if (email && !isValidSchoolEmail(email)) {
      setEmailError(`Hanya email ${SCHOOL_CONFIG.allowedDomain} yang diperbolehkan`);
      setDetectedRole(null);
    } else {
      setEmailError('');
      setDetectedRole(null);
    }
  }, [email]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi email sekolah
    if (!isValidSchoolEmail(email)) {
      toast.error(`Hanya email ${SCHOOL_CONFIG.allowedDomain} yang diperbolehkan`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nama, role },
        },
      });

      if (error) throw error;

      // Insert profile ke tabel users (fallback jika trigger belum jalan)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          nama,
          email,
          role,
        });
      }

      toast.success(`Akun ${role} berhasil dibuat! Silakan cek email untuk verifikasi.`);
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-900">FUSION</h1>
            <p className="text-gray-500 mt-2">Daftar Akun {SCHOOL_CONFIG.schoolName}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Sekolah</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={`contoh: nama${SCHOOL_CONFIG.allowedDomain}`}
                required
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {emailError}
                </p>
              )}
              {detectedRole && !emailError && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Terdeteksi sebagai: <strong className="capitalize">{detectedRole}</strong>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Hanya email <strong>{SCHOOL_CONFIG.allowedDomain}</strong> yang diperbolehkan
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daftar Sebagai</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('guru')}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    role === 'guru'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">👨‍🏫</div>
                  <div className="font-medium text-sm">Guru</div>
                  <div className="text-xs text-gray-400 mt-1">guru.email@sekolah.sch.id</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('siswa')}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    role === 'siswa'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🎓</div>
                  <div className="font-medium text-sm">Siswa</div>
                  <div className="text-xs text-gray-400 mt-1">siswa.email@sekolah.sch.id</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!emailError}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Masuk
              </Link>
            </p>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
