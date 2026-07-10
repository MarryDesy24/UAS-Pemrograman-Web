'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Announcement, Classroom } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function PengumumanPage() {
  const [announcements, setAnnouncements] = useState<(Announcement & { classroom_nama?: string; teacher_nama?: string })[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    classroom_id: '',
    title: '',
    content: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = await getCurrentUser();
    setUserRole(user?.role || '');

    if (user?.role === 'guru') {
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('guru_id', user.id)
        .order('nama');
      setClassrooms(classroomsData || []);

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (announcementsData) {
        const enriched = announcementsData.map((a) => ({
          ...a,
          classroom_nama: classroomsData?.find((c) => c.id === a.classroom_id)?.nama,
        }));
        setAnnouncements(enriched);
      }
    } else if (user?.role === 'siswa') {
      const { data: memberData } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('student_id', user.id);

      const classroomIds = memberData?.map((m) => m.classroom_id) || [];

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['none'])
        .order('created_at', { ascending: false });

      if (announcementsData) {
        const teacherIds = announcementsData.map((a) => a.teacher_id);
        const { data: teachersData } = await supabase
          .from('users')
          .select('id, nama')
          .in('id', teacherIds.length > 0 ? teacherIds : ['none']);

        const { data: classroomsData } = await supabase
          .from('classrooms')
          .select('*')
          .in('id', classroomIds);

        const enriched = announcementsData.map((a) => ({
          ...a,
          teacher_nama: teachersData?.find((t) => t.id === a.teacher_id)?.nama,
          classroom_nama: classroomsData?.find((c) => c.id === a.classroom_id)?.nama,
        }));
        setAnnouncements(enriched);
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await getCurrentUser();

    const payload = {
      classroom_id: formData.classroom_id,
      teacher_id: user?.id || '',
      title: formData.title,
      content: formData.content,
    };

    if (editingAnnouncement) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingAnnouncement.id);
      if (error) {
        toast.error('Gagal mengupdate pengumuman');
      } else {
        toast.success('Pengumuman berhasil diupdate');
        setShowModal(false);
        setEditingAnnouncement(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        toast.error('Gagal membuat pengumuman');
      } else {
        toast.success('Pengumuman berhasil dibuat');
        setShowModal(false);
        fetchData();
      }
    }

    setFormData({ classroom_id: '', title: '', content: '' });
  };

  const handleEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormData({ classroom_id: a.classroom_id, title: a.title, content: a.content });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus pengumuman');
    } else {
      toast.success('Pengumuman berhasil dihapus');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pengumuman</h1>
        {userRole === 'guru' && (
          <button
            onClick={() => { setEditingAnnouncement(null); setFormData({ classroom_id: '', title: '', content: '' }); setShowModal(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Buat Pengumuman
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{a.classroom_nama}</span>
                    {a.teacher_nama && (
                      <span className="text-xs text-gray-500">oleh {a.teacher_nama}</span>
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {userRole === 'guru' && (
                  <div className="ml-4 flex gap-2">
                    <button onClick={() => handleEdit(a)} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-sm text-red-600 hover:text-red-800">Hapus</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">Belum ada pengumuman</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">{editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                <select value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  <option value="">Pilih Kelas</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={4} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingAnnouncement ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
