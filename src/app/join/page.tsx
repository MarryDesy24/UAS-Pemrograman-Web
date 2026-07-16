'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get('join') || '';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nama, setNama] = useState('');
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState<'student.smk.id' | 'guru.smk.id'>('student.smk.id');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [classInfo, setClassInfo] = useState<{ nama: string; kode: string } | null>(null);
  const [fetchingClass, setFetchingClass] = useState(true);

  const email = emailLocal ? `${emailLocal}@${emailDomain}` : '';

  // Fetch class info on mount
  useEffect(() => {
    if (!joinCode) {
      setFetchingClass(false);
      return;
    }

    const fetchClass = async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('nama, kode')
        .eq('kode', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Kode kelas tidak ditemukan');
      } else {
        setClassInfo(data);
      }
      setFetchingClass(false);
    };

    fetchClass();
  }, [joinCode]);

  // If user is already logged in, auto-join
  useEffect(() => {
    const autoJoin = async () => {
      if (!joinCode) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await doJoin(user.id, joinCode.trim().toUpperCase());
      }
    };

    if (!fetchingClass) {
      autoJoin();
    }
  }, [fetchingClass, joinCode]);

  const doJoin = async (userId: string, code: string) => {
    setJoining(true);

    const { data: classroom, error: findError } = await supabase
      .from('classrooms')
      .select('id, nama')
      .eq('kode', code)
      .single();

    if (findError || !classroom) {
      toast.error(`Kode kelas "${code}" tidak ditemukan`);
      setJoining(false);
      return;
    }

    const { data: existing } = await supabase
      .from('classroom_members')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', userId)
      .single();

    if (existing) {
      toast.success('Anda sudah bergabung di kelas ini!');
      router.push('/dashboard/kelas');
      return;
    }

    const { error: joinError } = await supabase.from('classroom_members').insert({
      classroom_id: classroom.id,
      student_id: userId,
    });

    if (joinError) {
      toast.error('Gagal bergabung ke kelas');
    } else {
      toast.success(`Berhasil bergabung ke kelas ${classroom.nama}!`);
      router.push('/dashboard/kelas');
    }
    setJoining(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Masukkan email dan password');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast.success('Berhasil masuk!');
      await doJoin(data.user.id, joinCode.trim().toUpperCase());
    } catch (error: any) {
      toast.error(error.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLocal.trim() || !password || !nama.trim()) {
      toast.error('Lengkapi semua field');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama, role: 'siswa' } },
      });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          nama,
          email,
          role: 'siswa',
        });
      }

      toast.success('Akun berhasil dibuat!');
      await doJoin(user!.id, joinCode.trim().toUpperCase());
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  if (!joinCode) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
        <div className="glass-card text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Join Kelas</h1>
          <p className="text-dark-400">Tidak ada kode kelas yang diberikan. Silakan scan QR code dari guru Anda.</p>
          <Link href="/login" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            Kembali ke Login
          </Link>
        </div>
      </main>
    );
  }

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
              Future Unified School Integrated Online Network
            </p>
          </div>
          <p className="text-dark-400 max-w-md mx-auto leading-relaxed">
            Platform Manajemen Pembelajaran Sekolah Terintegrasi untuk Guru, Siswa, dan Administrator
          </p>
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
            {/* Class Info Banner */}
            {fetchingClass ? (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto" />
              </div>
            ) : classInfo ? (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">Anda akan bergabung ke</p>
                <p className="text-lg font-bold text-white">{classInfo.nama}</p>
                <p className="text-sm text-dark-400 font-mono">{classInfo.kode}</p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-300">Kode kelas tidak valid</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-heading font-bold text-white">
                {mode === 'login' ? 'Masuk untuk Join' : 'Daftar & Join'}
              </h2>
              <p className="text-dark-400 mt-1">
                {mode === 'login'
                  ? 'Masukkan email dan password akun FUSION Anda'
                  : 'Buat akun baru dan langsung bergabung ke kelas'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'login'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-dark-400 hover:bg-white/10'
                }`}
              >
                Masuk
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'register'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-dark-400 hover:bg-white/10'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="join-email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input
                    id="join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmailLocal(e.target.value)}
                    className="glass-input"
                    placeholder="nama@student.smk.id"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="join-password" className="block text-sm font-medium text-dark-300 mb-2">Password</label>
                  <input
                    id="join-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input"
                    placeholder="Masukkan password"
                    required
                  />
                </div>

                <button type="submit" disabled={loading || joining || !classInfo} className="btn-primary w-full">
                  {loading || joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {loading ? 'Masuk...' : 'Bergabung...'}
                    </span>
                  ) : 'Masuk & Join Kelas'}
                </button>
              </form>
            ) : (
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
                  <p className="text-xs text-dark-500 mt-2">Pilih domain sesuai peran Anda</p>
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

                <button type="submit" disabled={loading || joining || !classInfo} className="btn-primary w-full">
                  {loading || joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {loading ? 'Mendaftar...' : 'Bergabung...'}
                    </span>
                  ) : 'Daftar & Join Kelas'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Kembali ke Login
              </Link>
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

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
