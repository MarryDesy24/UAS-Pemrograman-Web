'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Material, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function MateriPage() {
  const [user, setUser] = useState<User | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_type: 'pdf' as 'pdf' | 'docx' | 'ppt' | 'youtube',
    file_url: '',
    youtube_url: '',
  });
  const [uploading, setUploading] = useState(false);

  const isGuru = user?.role === 'guru';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);

    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    setMaterials(data || []);
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
      toast.error('Gagal upload file');
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
    setFormData({ title: '', description: '', file_type: 'pdf', file_url: '', youtube_url: '' });
  };

  const handleEdit = (mat: Material) => {
    setEditingMaterial(mat);
    setFormData({
      title: mat.title,
      description: mat.description || '',
      file_type: mat.file_type || 'pdf',
      file_url: mat.file_url || '',
      youtube_url: mat.youtube_url || '',
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

  const getFileTypeIcon = (type: string | null) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'ppt': return '📊';
      case 'youtube': return '🎬';
      default: return '📁';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Materi</h1>
        {isGuru && (
          <button
            onClick={() => { setEditingMaterial(null); resetForm(); setShowModal(true); }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Tambah Materi
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <div key={mat.id} className="glass-card-hover">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getFileTypeIcon(mat.file_type || null)}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{mat.title}</h3>
                  <p className="text-sm text-dark-400 mt-1 line-clamp-2">{mat.description}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
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
              </div>
            </div>
          ))}
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
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Jenis File</label>
                <select value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value as any })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="ppt">PPT</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              {formData.file_type !== 'youtube' ? (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Upload File</label>
                  <input type="file" onChange={handleFileUpload} className="w-full px-4 py-2 border border-gray-300 rounded-lg" accept=".pdf,.docx,.ppt" />
                  {uploading && <p className="text-sm text-dark-400 mt-1">Mengupload...</p>}
                  {formData.file_url && <p className="text-sm text-green-600 mt-1">File berhasil diupload</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">URL YouTube</label>
                  <input type="url" value={formData.youtube_url} onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://youtube.com/watch?v=..." />
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
