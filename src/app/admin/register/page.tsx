'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  const VALID_SECRET_KEY = 'FUSION-ADMIN-2024';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (secretKey !== VALID_SECRET_KEY) {
      toast.error('Kode rahasia salah');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nama, role: 'admin' },
        },
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          nama,
          email,
          role: 'admin',
        });
      }

      toast.success('Akun admin berhasil dibuat!');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-900 bg-mesh px-4 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-4">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-dark-400 mt-2">Admin Registration</p>
            <p className="text-xs text-dark-500 mt-1">Halaman ini tidak dipublikasikan</p>
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
              <label className="block text-sm font-medium text-dark-300 mb-2">Email Admin</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="admin@sekolah.sch.id"
                required
              />
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

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Kode Rahasia</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="glass-input"
                placeholder="Masukkan kode rahasia admin"
                required
              />
              <p className="text-xs text-dark-500 mt-2">Hubungi developer untuk mendapatkan kode</p>
            </div>

            <button
              type="submit"
              disabled={loading || !secretKey}
              className="btn-primary w-full"
            >
              {loading ? 'Mendaftar...' : 'Daftar sebagai Admin'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="/login" className="text-sm text-dark-400 hover:text-dark-300 transition-colors">
              Kembali ke login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
