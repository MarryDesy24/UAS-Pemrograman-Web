'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import toast from 'react-hot-toast';

export default function SiswaPage() {
  const [siswa, setSiswa] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<User | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'siswa')
      .order('nama');

    if (error) {
      toast.error('Gagal memuat data siswa');
    } else {
      setSiswa(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSiswa) {
      const { error } = await supabase
        .from('users')
        .update({ nama: formData.nama, email: formData.email })
        .eq('id', editingSiswa.id);

      if (error) {
        toast.error('Gagal mengupdate siswa');
      } else {
        toast.success('Siswa berhasil diupdate');
        setShowModal(false);
        setEditingSiswa(null);
        fetchSiswa();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { nama: formData.nama, role: 'siswa' },
        },
      });

      if (error) {
        toast.error(error.message || 'Gagal menambah siswa');
      } else {
        toast.success('Siswa berhasil ditambahkan');
        setShowModal(false);
        fetchSiswa();
      }
    }

    setFormData({ nama: '', email: '', password: '' });
  };

  const handleEdit = (s: User) => {
    setEditingSiswa(s);
    setFormData({ nama: s.nama, email: s.email, password: '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      toast.error('Gagal menghapus siswa');
    } else {
      toast.success('Siswa berhasil dihapus');
      fetchSiswa();
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Kirim link reset password ke ${user.email}?`)) return;

    setResettingId(user.id);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast.success(`Link reset password sudah dikirim ke ${user.email}`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengirim reset password');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manajemen Siswa</h1>
        <button
          onClick={() => {
            setEditingSiswa(null);
            setFormData({ nama: '', email: '', password: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Tambah Siswa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {siswa.map((s, index) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-white">{s.nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{s.email}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetPassword(s)}
                      disabled={resettingId === s.id}
                      className="text-amber-600 hover:text-amber-800 disabled:opacity-50"
                    >
                      {resettingId === s.id ? 'Mengirim...' : 'Reset Password'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {siswa.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada data siswa</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingSiswa ? 'Edit Siswa' : 'Tambah Siswa'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {!editingSiswa && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingSiswa ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
