'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Material, User, Classroom } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function MateriPage() {
  const [user, setUser] = useState<User | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_type: 'pdf' as 'pdf' | 'docx' | 'ppt' | 'youtube',
    file_url: '',
    youtube_url: '',
    classroom_id: '',
  });
  const [uploading, setUploading] = useState(false);

  const isGuru = user?.role === 'guru';
  const isSiswa = user?.role === 'siswa';
  const completedCount = Object.values(progress).filter(Boolean).length;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);

    const [materialsRes, classroomsRes] = await Promise.all([
      supabase.from('materials').select('*').order('created_at', { ascending: false }),
      currentUser?.role === 'guru'
        ? supabase.from('classrooms').select('*').eq('guru_id', currentUser.id).order('nama')
        : Promise.resolve({ data: null as Classroom[] | null }),
    ]);
    setMaterials(materialsRes.data || []);
    setClassrooms(classroomsRes.data || []);

    if (currentUser?.role === 'siswa') {
      const { data: progressData } = await supabase
        .from('materials_progress')
        .select('material_id')
        .eq('student_id', currentUser.id);
      const progressMap: Record<string, boolean> = {};
      (progressData || []).forEach((p) => { progressMap[p.material_id] = true; });
      setProgress(progressMap);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `materials/${fileName}`;

    const { error } = await supabase.storage.from('materials').upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal upload file: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
    setFormData({ ...formData, file_url: data.publicUrl });
    setUploading(false);
    toast.success('File berhasil diupload');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: userData } = await supabase.auth.getUser();

    const payload = {
      title: formData.title,
      description: formData.description,
      file_type: formData.file_type,
      file_url: formData.file_url || null,
      youtube_url: formData.youtube_url || null,
      classroom_id: formData.classroom_id || null,
    };

    if (editingMaterial) {
      const { error } = await supabase.from('materials').update(payload).eq('id', editingMaterial.id);
      if (error) {
        toast.error('Gagal mengupdate materi');
      } else {
        toast.success('Materi berhasil diupdate');
        setShowModal(false);
        setEditingMaterial(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('materials').insert(payload);
      if (error) {
        toast.error('Gagal menambah materi');
      } else {
        toast.success('Materi berhasil ditambahkan');
        setShowModal(false);
        fetchData();
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', file_type: 'pdf', file_url: '', youtube_url: '', classroom_id: '' });
  };

  const handleEdit = (mat: Material) => {
    setEditingMaterial(mat);
    setFormData({
      title: mat.title,
      description: mat.description || '',
      file_type: mat.file_type || 'pdf',
      file_url: mat.file_url || '',
      youtube_url: mat.youtube_url || '',
      classroom_id: mat.classroom_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus materi ini?')) return;
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus materi');
    } else {
      toast.success('Materi berhasil dihapus');
      fetchData();
    }
  };

  const handleToggleProgress = async (materialId: string) => {
    if (!user) return;
    const isCompleted = progress[materialId];

    if (isCompleted) {
      const { error } = await supabase
        .from('materials_progress')
        .delete()
        .eq('material_id', materialId)
        .eq('student_id', user.id);
      if (error) {
        toast.error('Gagal membatalkan tandai selesai');
        return;
      }
      toast.success('Tandai selesai dibatalkan');
    } else {
      const { error } = await supabase
        .from('materials_progress')
        .insert({ material_id: materialId, student_id: user.id });
      if (error) {
        toast.error('Gagal menandai selesai');
        return;
      }
      toast.success('Materi ditandai selesai!');
    }
    setProgress({ ...progress, [materialId]: !isCompleted });
  };

  const getFileTypeIcon = (type: string | null) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'ppt': return '📊';
      case 'youtube': return '🎬';
      default: return '📁';
    }
  };

  const getClassroomName = (classroomId?: string) => {
    return classrooms.find((c) => c.id === classroomId)?.nama;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Materi</h1>
        <div className="flex items-center gap-3">
          {isSiswa && materials.length > 0 && (
            <span className="text-sm text-dark-400">
              {completedCount}/{materials.length} selesai dipelajari
            </span>
          )}
          {isGuru && (
            <button
              onClick={() => { setEditingMaterial(null); resetForm(); setShowModal(true); }}
              disabled={classrooms.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={classrooms.length === 0 ? 'Buat kelas terlebih dahulu' : 'Tambah Materi'}
            >
              + Tambah Materi
            </button>
          )}
        </div>
      </div>

      {isGuru && classrooms.length === 0 && (
        <div className="glass-card border border-amber-500/30 p-4 text-sm text-amber-300">
          Anda belum memiliki kelas. Buat kelas terlebih dahulu di menu Kelas Saya sebelum menambahkan materi.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => {
            const isCompleted = !!progress[mat.id];
            const className = getClassroomName(mat.classroom_id);
            return (
              <div key={mat.id} className={`glass-card-hover ${isCompleted && isSiswa ? 'border-green-500/40' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getFileTypeIcon(mat.file_type || null)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{mat.title}</h3>
                      {isCompleted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Selesai</span>
                      )}
                    </div>
                    <p className="text-sm text-dark-400 mt-1 line-clamp-2">{mat.description}</p>
                    {className && <p className="text-xs text-blue-400 mt-1">{className}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mat.file_url && (
                    <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:text-green-800">Lihat</a>
                  )}
                  {mat.youtube_url && (
                    <a href={mat.youtube_url} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 hover:text-red-800">YouTube</a>
                  )}
                  {isGuru && (
                    <>
                      <button onClick={() => handleEdit(mat)} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>
                      <button onClick={() => handleDelete(mat.id)} className="text-sm text-red-600 hover:text-red-800">Hapus</button>
                    </>
                  )}
                  {isSiswa && (
                    <button
                      onClick={() => handleToggleProgress(mat.id)}
                      className={`ml-auto text-sm px-3 py-1 rounded-lg transition-colors ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-white/5 text-dark-300 hover:bg-white/10'
                      }`}
                    >
                      {isCompleted ? '✓ Sudah Selesai' : 'Tandai Selesai'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {materials.length === 0 && (
            <div className="col-span-full text-center py-12 text-dark-400">
              {isGuru ? 'Belum ada materi' : 'Belum ada materi yang tersedia'}
            </div>
          )}
        </div>
      )}

      {/* Modal hanya untuk guru */}
      {showModal && isGuru && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="glass-card w-full max-w-lg my-8">
            <h2 className="text-lg font-semibold mb-4">{editingMaterial ? 'Edit Materi' : 'Tambah Materi'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Judul Materi</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kelas</label>
                <select value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" required>
                  <option value="">Pilih Kelas</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-white" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Jenis File</label>
                <select value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value as any })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white">
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="ppt">PPT</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              {formData.file_type !== 'youtube' ? (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Upload File</label>
                  <input type="file" onChange={handleFileUpload} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" accept=".pdf,.docx,.ppt" />
                  {uploading && <p className="text-sm text-dark-400 mt-1">Mengupload...</p>}
                  {formData.file_url && <p className="text-sm text-green-400 mt-1">File berhasil diupload</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">URL YouTube</label>
                  <input type="url" value={formData.youtube_url} onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">{editingMaterial ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
