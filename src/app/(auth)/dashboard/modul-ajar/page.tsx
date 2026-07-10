'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Module, Subject, Classroom } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ModulAjarPage() {
  const [modules, setModules] = useState<(Module & { subject_nama?: string; classroom_nama?: string })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    subject_id: '',
    classroom_id: '',
    title: '',
    description: '',
    learning_objectives: '',
    prerequisite: '',
    materi_pokok: '',
    pertanyaan_pemantik: '',
    references: '',
    youtube_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const [modulesRes, subjectsRes, classroomsRes] = await Promise.all([
      supabase.from('modules').select('*').eq('teacher_id', user.user?.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('nama'),
      supabase.from('classrooms').select('*').eq('guru_id', user.user?.id || '').order('nama'),
    ]);

    if (modulesRes.data) {
      const enriched = modulesRes.data.map((m) => ({
        ...m,
        subject_nama: subjectsRes.data?.find((s) => s.id === m.subject_id)?.nama,
        classroom_nama: classroomsRes.data?.find((c) => c.id === m.classroom_id)?.nama,
      }));
      setModules(enriched);
    }

    setSubjects(subjectsRes.data || []);
    setClassrooms(classroomsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();

    const payload = {
      subject_id: formData.subject_id,
      classroom_id: formData.classroom_id || null,
      teacher_id: user.user?.id || '',
      title: formData.title,
      description: formData.description,
      learning_objectives: formData.learning_objectives,
      prerequisite: formData.prerequisite,
      materi_pokok: formData.materi_pokok,
      pertanyaan_pemantik: formData.pertanyaan_pemantik,
      references: formData.references,
      youtube_url: formData.youtube_url,
    };

    if (editingModule) {
      const { error } = await supabase.from('modules').update(payload).eq('id', editingModule.id);
      if (error) {
        toast.error('Gagal mengupdate modul');
      } else {
        toast.success('Modul berhasil diupdate');
        setShowModal(false);
        setEditingModule(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('modules').insert(payload);
      if (error) {
        toast.error('Gagal menambah modul');
      } else {
        toast.success('Modul berhasil ditambahkan');
        setShowModal(false);
        fetchData();
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      subject_id: '',
      classroom_id: '',
      title: '',
      description: '',
      learning_objectives: '',
      prerequisite: '',
      materi_pokok: '',
      pertanyaan_pemantik: '',
      references: '',
      youtube_url: '',
    });
  };

  const handleEdit = (mod: Module) => {
    setEditingModule(mod);
    setFormData({
      subject_id: mod.subject_id,
      classroom_id: mod.classroom_id || '',
      title: mod.title,
      description: mod.description || '',
      learning_objectives: mod.learning_objectives || '',
      prerequisite: mod.prerequisite || '',
      materi_pokok: mod.materi_pokok || '',
      pertanyaan_pemantik: mod.pertanyaan_pemantik || '',
      references: mod.references || '',
      youtube_url: mod.youtube_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus modul ini?')) return;
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus modul');
    } else {
      toast.success('Modul berhasil dihapus');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Modul Ajar</h1>
        <button
          onClick={() => { setEditingModule(null); resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Buat Modul Ajar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{mod.subject_nama}</span>
                  <h3 className="mt-2 font-semibold text-gray-900">{mod.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mod.description}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleEdit(mod)} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                <button onClick={() => handleDelete(mod.id)} className="text-sm text-red-600 hover:text-red-800">Hapus</button>
              </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">Belum ada modul ajar</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="text-lg font-semibold mb-4">{editingModule ? 'Edit Modul Ajar' : 'Buat Modul Ajar'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                  <select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                    <option value="">Pilih</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas (Opsional)</label>
                  <select value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Semua Kelas</option>
                    {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Modul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan Pembelajaran</label>
                <textarea value={formData.learning_objectives} onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kompetensi Awal</label>
                <textarea value={formData.prerequisite} onChange={(e) => setFormData({ ...formData, prerequisite: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Materi Pokok</label>
                <textarea value={formData.materi_pokok} onChange={(e) => setFormData({ ...formData, materi_pokok: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan Pemantik</label>
                <textarea value={formData.pertanyaan_pemantik} onChange={(e) => setFormData({ ...formData, pertanyaan_pemantik: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referensi</label>
                <textarea value={formData.references} onChange={(e) => setFormData({ ...formData, references: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL YouTube (Opsional)</label>
                <input type="url" value={formData.youtube_url} onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingModule ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
