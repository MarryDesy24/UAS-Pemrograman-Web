'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/lib/types';
import { useSidebar } from '@/app/(auth)/layout';
import toast from 'react-hot-toast';

export default function ProfilPage() {
  const { refreshUser } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const current = await getCurrentUser();
      setUser(current);
      setNama(current?.nama || '');
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!nama.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ nama: nama.trim() })
      .eq('id', user.id);

    if (error) {
      toast.error(error.message || 'Gagal menyimpan profil');
    } else {
      toast.success('Profil berhasil diperbarui');
      setUser({ ...user, nama: nama.trim() });
      await refreshUser();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: data.publicUrl });
      await refreshUser();
      toast.success('Foto profil berhasil diperbarui');
    } catch (error: any) {
      toast.error(error.message || 'Gagal upload foto profil');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
        <p className="text-sm text-dark-400 mt-1">Kelola informasi akun Anda.</p>
      </div>

      <div className="glass-card space-y-6">
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.nama} className="w-20 h-20 rounded-full object-cover border border-white/20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-heading font-bold text-2xl">
                {user.nama.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-white font-semibold">{user.nama}</p>
            <p className="text-sm text-dark-400 capitalize">{user.role}</p>
            <label className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
              {uploading ? 'Mengupload...' : 'Ganti foto profil'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
            <input type="email" value={user.email} className="glass-input opacity-60" disabled />
            <p className="text-xs text-dark-500 mt-1">Email hanya dapat diubah oleh admin.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Role</label>
            <input type="text" value={user.role} className="glass-input opacity-60 capitalize" disabled />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link href="/dashboard/ganti-password" className="btn-secondary">
              Ganti Password
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
