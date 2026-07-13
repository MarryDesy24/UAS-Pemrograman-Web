'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Assessment, Module, Classroom, AssessmentType } from '@/lib/types';
import toast from 'react-hot-toast';

export default function AssessmentPage() {
  const [assessments, setAssessments] = useState<(Assessment & { module_title?: string; classroom_nama?: string })[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    module_id: '',
    classroom_id: '',
    type: 'tugas' as AssessmentType,
    title: '',
    description: '',
    deadline: '',
    max_score: 100,
    attachment_url: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const [assessmentsRes, modulesRes, classroomsRes] = await Promise.all([
      supabase.from('assessments').select('*').order('created_at', { ascending: false }),
      supabase.from('modules').select('*').eq('teacher_id', user.user?.id || '').order('title'),
      supabase.from('classrooms').select('*').eq('guru_id', user.user?.id || '').order('nama'),
    ]);

    if (assessmentsRes.data) {
      const enriched = assessmentsRes.data.map((a) => ({
        ...a,
        module_title: modulesRes.data?.find((m) => m.id === a.module_id)?.title,
        classroom_nama: classroomsRes.data?.find((c) => c.id === a.classroom_id)?.nama,
      }));
      setAssessments(enriched);
    }

    setModules(modulesRes.data || []);
    setClassrooms(classroomsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      module_id: formData.module_id,
      classroom_id: formData.classroom_id,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline || null,
      max_score: formData.max_score,
      attachment_url: formData.attachment_url || null,
    };

    if (editingAssessment) {
      const { error } = await supabase.from('assessments').update(payload).eq('id', editingAssessment.id);
      if (error) {
        toast.error('Gagal mengupdate assessment');
      } else {
        toast.success('Assessment berhasil diupdate');
        setShowModal(false);
        setEditingAssessment(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('assessments').insert(payload);
      if (error) {
        toast.error('Gagal menambah assessment');
      } else {
        toast.success('Assessment berhasil ditambahkan');
        setShowModal(false);
        fetchData();
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ module_id: '', classroom_id: '', type: 'tugas', title: '', description: '', deadline: '', max_score: 100, attachment_url: '' });
  };

  const handleEdit = (a: Assessment) => {
    setEditingAssessment(a);
    setFormData({
      module_id: a.module_id,
      classroom_id: a.classroom_id,
      type: a.type,
      title: a.title,
      description: a.description || '',
      deadline: a.deadline ? new Date(a.deadline).toISOString().slice(0, 16) : '',
      max_score: a.max_score,
      attachment_url: a.attachment_url || '',
    });
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `assessments/${fileName}`;

    const { error } = await supabase.storage.from('materials').upload(filePath, file);

    if (error) {
      toast.error('Gagal upload lampiran');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
    setFormData({ ...formData, attachment_url: data.publicUrl });
    setUploading(false);
    toast.success('Lampiran berhasil diupload');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus assessment ini?')) return;
    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus assessment');
    } else {
      toast.success('Assessment berhasil dihapus');
      fetchData();
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'pretest': 'bg-blue-100 text-blue-700',
      'post-test': 'bg-purple-100 text-purple-700',
      'quiz': 'bg-green-100 text-green-700',
      'lkpd': 'bg-yellow-100 text-yellow-700',
      'tugas': 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-dark-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Assessment</h1>
        <button
          onClick={() => { setEditingAssessment(null); resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Buat Assessment
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
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Judul</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Jenis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kelas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Deadline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Max Nilai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Lampiran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{a.title}</div>
                    <div className="text-xs text-dark-400">{a.module_title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(a.type)}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-400">{a.classroom_nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">
                    {a.deadline ? new Date(a.deadline).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-400">{a.max_score}</td>
                  <td className="px-6 py-4 text-sm">
                    {a.attachment_url ? (
                      <a href={a.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Lihat</a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(a)} className="text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assessments.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada assessment</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="glass-card w-full max-w-lg my-8">
            <h2 className="text-lg font-semibold mb-4">{editingAssessment ? 'Edit Assessment' : 'Buat Assessment'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Jenis</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as AssessmentType })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="pretest">Pretest</option>
                    <option value="post-test">Post-test</option>
                    <option value="quiz">Quiz</option>
                    <option value="lkpd">LKPD</option>
                    <option value="tugas">Tugas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Max Nilai</label>
                  <input type="number" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min={0} max={100} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Modul Ajar</label>
                  <select value={formData.module_id} onChange={(e) => setFormData({ ...formData, module_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <option value="">Pilih Modul</option>
                    {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Kelas</label>
                  <select value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <option value="">Pilih Kelas</option>
                    {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deadline</label>
                <input type="datetime-local" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Lampiran (Opsional)</label>
                <input type="file" onChange={handleFileUpload} className="w-full px-4 py-2 border border-gray-300 rounded-lg" accept=".pdf,.docx,.ppt,.xlsx,.zip" />
                {uploading && <p className="text-sm text-dark-400 mt-1">Mengupload...</p>}
                {formData.attachment_url && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lampiran terupload
                    <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Lihat</a>
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">{editingAssessment ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
