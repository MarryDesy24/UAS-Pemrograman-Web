'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';
import toast from 'react-hot-toast';

export default function MataPelajaranPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    deskripsi: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('nama');

    if (error) {
      toast.error('Gagal memuat data mata pelajaran');
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update({ nama: formData.nama, kode: formData.kode, deskripsi: formData.deskripsi })
        .eq('id', editingSubject.id);

      if (error) {
        toast.error('Gagal mengupdate mata pelajaran');
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
      });

      if (error) {
        toast.error('Gagal menambah mata pelajaran');
      } else {
        toast.success('Mata pelajaran berhasil ditambahkan');
        setShowModal(false);
        fetchSubjects();
      }
    }

    setFormData({ nama: '', kode: '', deskripsi: '' });
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      nama: subject.nama,
      kode: subject.kode,
      deskripsi: subject.deskripsi || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) return;

    const { error } = await supabase.from('subjects').delete().eq('id', id);

    if (error) {
      toast.error('Gagal menghapus mata pelajaran');
    } else {
      toast.success('Mata pelajaran berhasil dihapus');
      fetchSubjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mata Pelajaran</h1>
        <button
          onClick={() => {
            setEditingSubject(null);
            setFormData({ nama: '', kode: '', deskripsi: '' });
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
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjects.map((subject, index) => (
                <tr key={subject.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{subject.kode}</td>
                  <td className="px-6 py-4 text-sm text-white">{subject.nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400 max-w-xs truncate">{subject.deskripsi}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(subject)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Hapus
                    </button>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kode</label>
                <input
                  type="text"
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Matematika"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                />
              </div>
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
