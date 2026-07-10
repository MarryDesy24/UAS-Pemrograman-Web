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
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState<'student.smk.id' | 'guru.smk.id'>('student.smk.id');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'guru' | 'siswa'>('siswa');
  const [loading, setLoading] = useState(false);

  // Gabungkan local + domain jadi email lengkap
  const email = emailLocal ? `${emailLocal}@${emailDomain}` : '';

  // Auto-detect role saat domain berubah
  useEffect(() => {
    if (emailDomain === 'guru.smk.id') {
      setRole('guru');
    } else {
      setRole('siswa');
    }
  }, [emailDomain]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailLocal.trim()) {
      toast.error('Masukkan email Anda');
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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          nama,
          email,
          role,
        });
      }

      toast.success(`Akun ${role} berhasil dibuat!`);
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
            <p className="text-gray-500 mt-2">{SCHOOL_CONFIG.schoolName}</p>
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
              <div className="flex">
                <input
                  type="text"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  className="flex-1 px-4 py-3 border border-r-0 border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="nama"
                  required
                />
                <select
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value as 'student.smk.id' | 'guru.smk.id')}
                  className="px-3 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <option value="student.smk.id">@student.smk.id</option>
                  <option value="guru.smk.id">@guru.smk.id</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Pilih domain sesuai peran Anda
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

            <button
              type="submit"
              disabled={loading || !emailLocal.trim()}
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
