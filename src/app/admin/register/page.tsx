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

  // Kode rahasia untuk register admin (ganti sesuai kebutuhan)
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">FUSION</h1>
            <p className="text-gray-500 mt-2">Admin Registration</p>
            <p className="text-xs text-gray-400 mt-1">Halaman ini tidak dipublikasikan</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Admin</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="admin@sekolah.sch.id"
                required
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Rahasia</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Masukkan kode rahasia admin"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Hubungi developer untuk mendapatkan kode</p>
            </div>

            <button
              type="submit"
              disabled={loading || !secretKey}
              className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mendaftar...' : 'Daftar sebagai Admin'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
              Kembali ke login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
