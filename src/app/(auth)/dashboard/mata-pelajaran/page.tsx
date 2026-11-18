'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Subject, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function MataPelajaranPage() {
  const [subjects, setSubjects] = useState<(Subject & { owner_nama?: string })[]>([]);
  const [gurus, setGurus] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    deskripsi: '',
    owner_id: '',
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('nama');

    if (error) {
      toast.error('Gagal memuat data mata pelajaran');
    } else {
      const list = data || [];
      const ownerIds = Array.from(new Set(list.map((s) => s.owner_id).filter(Boolean))) as string[];

      let owners: { id: string; nama: string }[] = [];
      if (ownerIds.length > 0) {
        const { data: ownerData } = await supabase
          .from('users')
          .select('id, nama')
          .in('id', ownerIds);
        owners = ownerData || [];
      }

      setSubjects(
        list.map((s) => ({
          ...s,
          owner_nama: owners.find((o) => o.id === s.owner_id)?.nama,
        }))
      );
    }

    if (user?.role === 'admin') {
      const { data: guruData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'guru')
        .order('nama');
      setGurus(guruData || []);
    }

    setLoading(false);
  };

  const canModify = (subject: Subject) =>
    isAdmin || (currentUser?.role === 'guru' && subject.owner_id === currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubject) {
      const payload: Record<string, unknown> = {
        nama: formData.nama,
        kode: formData.kode,
        deskripsi: formData.deskripsi,
      };
      if (isAdmin) payload.owner_id = formData.owner_id || null;

      const { error } = await supabase
        .from('subjects')
        .update(payload)
        .eq('id', editingSubject.id);

      if (error) {
        toast.error(error.message || 'Gagal mengupdate mata pelajaran');
      } else {
        toast.success('Mata pelajaran berhasil diupdate');
        setShowModal(false);
        setEditingSubject(null);
        fetchSubjects();
      }
    } else {
      const { error } = await supabase.from('subjects').insert({
        nama: formData.nama,
        kode: formData.kode,
        deskripsi: formData.deskripsi,
        owner_id: isAdmin ? formData.owner_id || null : currentUser?.id,
      });

      if (error) {
        toast.error(error.message || 'Gagal menambah mata pelajaran');
      } else {
        toast.success('Mata pelajaran berhasil ditambahkan');
        setShowModal(false);
        fetchSubjects();
      }
    }

    setFormData({ nama: '', kode: '', deskripsi: '', owner_id: '' });
  };

  const handleEdit = (subject: Subject) => {
    if (!canModify(subject)) {
      toast.error('Anda hanya dapat mengubah mata pelajaran yang Anda ampu');
      return;
    }
    setEditingSubject(subject);
    setFormData({
      nama: subject.nama,
      kode: subject.kode,
      deskripsi: subject.deskripsi || '',
      owner_id: subject.owner_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (subject: Subject) => {
    if (!canModify(subject)) {
      toast.error('Anda hanya dapat menghapus mata pelajaran yang Anda ampu');
      return;
    }
    if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);

    if (error) {
      toast.error(error.message || 'Gagal menghapus mata pelajaran');
    } else {
      toast.success('Mata pelajaran berhasil dihapus');
      fetchSubjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mata Pelajaran</h1>
          <p className="text-sm text-dark-400 mt-1">
            {isAdmin
              ? 'Admin dapat mengelola seluruh mata pelajaran.'
              : 'Anda dapat mengelola mata pelajaran yang Anda ampu.'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSubject(null);
            setFormData({ nama: '', kode: '', deskripsi: '', owner_id: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Tambah Mata Pelajaran
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Guru Pengampu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subjects.map((subject, index) => (
                <tr key={subject.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{subject.kode}</td>
                  <td className="px-6 py-4 text-sm text-white">{subject.nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400 max-w-xs truncate">{subject.deskripsi}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{subject.owner_nama || '-'}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {canModify(subject) ? (
                      <>
                        <button
                          onClick={() => handleEdit(subject)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <span className="text-dark-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subjects.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada data mata pelajaran</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-white">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kode</label>
                <input
                  type="text"
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                  className="glass-input"
                  placeholder="MTK-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="glass-input"
                  placeholder="Matematika"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="glass-input resize-none"
                  rows={3}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Guru Pengampu</label>
                  <select
                    value={formData.owner_id}
                    onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                    className="glass-input"
                  >
                    <option value="">Belum ditentukan</option>
                    {gurus.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama}</option>
                    ))}
                  </select>
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
                  {editingSubject ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
