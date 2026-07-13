'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { signIn } from '@/lib/auth';
import { SCHOOL_CONFIG } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Masukkan email dan password');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Berhasil masuk!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-900 bg-mesh px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-card">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-4">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-dark-400 mt-2">{SCHOOL_CONFIG.schoolName}</p>
            <p className="text-sm text-dark-500 mt-1">Masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="email@domain.com"
                required
              />
              <p className="text-xs text-dark-500 mt-2">
                Admin: email bebas | Guru: <strong className="text-dark-400">@guru.smk.id</strong> | Siswa: <strong className="text-dark-400">@student.smk.id</strong>
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="Masukkan password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-dark-400">Ingat saya</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Masuk...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-dark-400">
              Belum punya akun?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Daftar
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
