'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { resetPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Link reset password telah dikirim!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengirim email reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-900 bg-mesh px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-glow mb-4">
              <span className="text-white font-heading font-bold text-2xl">F</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-white">FUSION</h1>
            <p className="text-dark-400 mt-2">Reset Password</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-dark-300">
                Link reset password telah dikirim ke <strong className="text-white">{email}</strong>
              </p>
              <p className="text-sm text-dark-400">
                Silakan cek email Anda dan ikuti instruksi yang diberikan.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
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
                  placeholder="email@sekolah.sch.id"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Kembali ke login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
