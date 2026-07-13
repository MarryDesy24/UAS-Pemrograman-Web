'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { updatePassword } from '@/lib/auth';

export default function GantiPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      toast.success('Password berhasil diubah!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="glass-card">
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Ganti Password</h1>
        <p className="text-sm text-dark-400 mb-6">Masukkan password baru Anda</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="glass-input"
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="glass-input"
              placeholder="Ulangi password baru"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
