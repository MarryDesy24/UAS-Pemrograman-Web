'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { SCHOOL_CONFIG } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState<'student.smk.id' | 'guru.smk.id'>('student.smk.id');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'guru' | 'siswa'>('siswa');
  const [loading, setLoading] = useState(false);

  const email = emailLocal ? `${emailLocal}@${emailDomain}` : '';

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
    <main className="min-h-screen flex items-center justify-center bg-dark-900 bg-mesh px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-4">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-dark-400 mt-2">{SCHOOL_CONFIG.schoolName}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="glass-input"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email Sekolah</label>
              <div className="flex">
                <input
                  type="text"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  className="flex-1 glass-input rounded-r-none border-r-0"
                  placeholder="nama"
                  required
                />
                <select
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value as 'student.smk.id' | 'guru.smk.id')}
                  className="px-3 py-3 glass-input rounded-l-none text-sm font-medium cursor-pointer"
                >
                  <option value="student.smk.id">@student.smk.id</option>
                  <option value="guru.smk.id">@guru.smk.id</option>
                </select>
              </div>
              <p className="text-xs text-dark-500 mt-2">
                Pilih domain sesuai peran Anda
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !emailLocal.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-dark-400">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Masuk
              </Link>
            </p>
            <Link href="/" className="text-sm text-dark-500 hover:text-dark-300 transition-colors inline-block">
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
