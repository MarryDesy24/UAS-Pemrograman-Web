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
    <main className="min-h-screen flex bg-dark-900 bg-mesh relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />

      {/* Left branding panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
        <div className="relative z-10 text-center px-12 space-y-8">
          <img
            src="/logo.png"
            alt="FUSION Logo"
            className="w-64 h-64 mx-auto object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]"
          />
          <div className="space-y-3">
            <h1 className="text-5xl font-heading font-bold text-white" style={{ textShadow: '0 0 40px rgba(59,130,246,0.4)' }}>
              FUSION
            </h1>
            <p className="text-lg text-blue-300/80 tracking-wide">
              Future Oriented Industrial Simulation and Interdisciplinary Learning
            </p>
          </div>
          <p className="text-dark-400 max-w-md mx-auto leading-relaxed">
            Platform Manajemen Pembelajaran Sekolah Terintegrasi untuk Guru, Siswa, dan Administrator
          </p>

          {/* Floating decorative elements */}
          <div className="absolute top-10 left-10 w-3 h-3 bg-blue-400/40 rounded-full animate-float" />
          <div className="absolute bottom-20 right-16 w-2 h-2 bg-purple-400/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-8 w-4 h-4 bg-blue-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="FUSION" className="w-24 h-24 mx-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
          </div>

          <div className="glass-card animate-slide-up">
            <div className="mb-8">
              <h2 className="text-2xl font-heading font-bold text-white">Selamat Datang</h2>
              <p className="text-dark-400 mt-1">Masuk ke akun FUSION Anda</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
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
                <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">Password</label>
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
                  <input type="checkbox" className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0" />
                  <span className="text-sm text-dark-400">Ingat saya</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Lupa password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Masuk...
                  </span>
                ) : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-dark-400">
                Belum punya akun?{' '}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-dark-500 mt-6">
            &copy; 2025 FUSION LMS. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
