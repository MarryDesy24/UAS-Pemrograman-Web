'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

type Status = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setStatus('ready');
      } else {
        setStatus('invalid');
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    if (password !== confirm) {
      toast.error('Konfirmasi password tidak sama');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('success');
      toast.success('Password berhasil diperbarui');
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login'), 1500);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-900 bg-mesh px-4 relative overflow-hidden">
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-4">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-dark-400 mt-2">Buat Password Baru</p>
          </div>

          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-dark-400">Memverifikasi link reset...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-5 text-center">
              <p className="text-dark-300">
                Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.
              </p>
              <Link href="/forgot-password" className="btn-primary w-full inline-block">
                Minta Link Baru
              </Link>
              <Link href="/login" className="block text-sm text-blue-400 hover:text-blue-300">
                Kembali ke login
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-dark-300">Password berhasil diperbarui. Mengalihkan ke halaman login...</p>
              <Link href="/login" className="block text-sm text-blue-400 hover:text-blue-300">
                Masuk sekarang
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
                  Password Baru
                </label>
                <input
                  id="password"
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
                <label htmlFor="confirm" className="block text-sm font-medium text-dark-300 mb-2">
                  Konfirmasi Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="glass-input"
                  placeholder="Ulangi password baru"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
