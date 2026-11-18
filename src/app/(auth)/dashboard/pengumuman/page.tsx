'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Announcement, Classroom, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function PengumumanPage() {
  const [announcements, setAnnouncements] = useState<(Announcement & { classroom_nama?: string; teacher_nama?: string })[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    classroom_id: '',
    title: '',
    content: '',
  });

  const isAdmin = currentUser?.role === 'admin';
  const isGuru = currentUser?.role === 'guru';
  const canCreate = isAdmin || isGuru;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);

    if (!user) {
      setLoading(false);
      return;
    }

    let classroomsData: Classroom[] = [];

    if (user.role === 'admin') {
      const { data } = await supabase.from('classrooms').select('*').order('nama');
      classroomsData = data || [];
    } else if (user.role === 'guru') {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('guru_id', user.id)
        .order('nama');
      classroomsData = data || [];
    } else {
      const { data: memberData } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('student_id', user.id);

      const classroomIds = memberData?.map((m) => m.classroom_id) || [];

      if (classroomIds.length > 0) {
        const { data } = await supabase
          .from('classrooms')
          .select('*')
          .in('id', classroomIds)
          .order('nama');
        classroomsData = data || [];
      }
    }

    setClassrooms(classroomsData);

    let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });

    if (user.role === 'guru') {
      query = query.or(`teacher_id.eq.${user.id},classroom_id.is.null`);
    } else if (user.role === 'siswa') {
      const ids = classroomsData.map((c) => c.id);
      if (ids.length > 0) {
        query = query.or(`classroom_id.is.null,classroom_id.in.(${ids.join(',')})`);
      } else {
        query = query.is('classroom_id', null);
      }
    }

    const { data: announcementsData, error } = await query;

    if (error) {
      console.error('Announcements error:', error);
      toast.error('Gagal memuat pengumuman');
      setLoading(false);
      return;
    }

    const teacherIds = Array.from(new Set((announcementsData || []).map((a) => a.teacher_id)));
    let teachers: { id: string; nama: string }[] = [];
    if (teacherIds.length > 0) {
      const { data } = await supabase.from('users').select('id, nama').in('id', teacherIds);
      teachers = data || [];
    }

    setAnnouncements(
      (announcementsData || []).map((a) => ({
        ...a,
        teacher_nama: teachers.find((t) => t.id === a.teacher_id)?.nama,
        classroom_nama: classroomsData.find((c) => c.id === a.classroom_id)?.nama,
      }))
    );

    setLoading(false);
  };

  const canModify = (a: Announcement) =>
    isAdmin || (isGuru && a.teacher_id === currentUser?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await getCurrentUser();

    if (!user) return;

    const payload = {
      classroom_id: formData.classroom_id || null,
      teacher_id: user.id,
      title: formData.title,
      content: formData.content,
    };

    if (editingAnnouncement) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingAnnouncement.id);
      if (error) {
        toast.error(error.message || 'Gagal mengupdate pengumuman');
      } else {
        toast.success('Pengumuman berhasil diupdate');
        setShowModal(false);
        setEditingAnnouncement(null);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        toast.error(error.message || 'Gagal membuat pengumuman');
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
    setFormData({ classroom_id: a.classroom_id || '', title: a.title, content: a.content });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error(error.message || 'Gagal menghapus pengumuman');
    } else {
      toast.success('Pengumuman berhasil dihapus');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pengumuman</h1>
          {isAdmin && (
            <p className="text-sm text-dark-400 mt-1">Kelola pengumuman sekolah dan kelas.</p>
          )}
        </div>
        {canCreate && (
          <button
            onClick={() => { setEditingAnnouncement(null); setFormData({ classroom_id: '', title: '', content: '' }); setShowModal(true); }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Buat Pengumuman
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="glass-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      a.classroom_id
                        ? 'text-blue-400 bg-blue-500/20'
                        : 'text-purple-400 bg-purple-500/20'
                    }`}>
                      {a.classroom_id ? a.classroom_nama : 'Sekolah'}
                    </span>
                    {a.teacher_nama && (
                      <span className="text-xs text-dark-400">oleh {a.teacher_nama}</span>
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold text-white">{a.title}</h3>
                  <p className="text-sm text-dark-300 mt-2 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-dark-400 mt-3">
                    {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {canModify(a) && (
                  <div className="ml-4 flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(a)} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-sm text-red-400 hover:text-red-300">Hapus</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-12 text-dark-400 glass-card">Belum ada pengumuman</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-white">{editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kelas</label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  className="glass-input"
                  required={!isAdmin}
                >
                  <option value="">{isAdmin ? 'Pengumuman Sekolah (semua kelas)' : 'Pilih Kelas'}</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="glass-input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Isi Pengumuman</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="glass-input resize-none" rows={4} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">{editingAnnouncement ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
