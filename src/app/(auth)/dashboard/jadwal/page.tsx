'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Classroom, Schedule, User } from '@/lib/types';
import toast from 'react-hot-toast';

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

export default function JadwalPage() {
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<(Schedule & { classroom_nama?: string })[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    classroom_id: '',
    title: '',
    day_of_week: 1,
    start_time: '07:00',
    end_time: '08:30',
    room: '',
  });

  const canManage = user?.role === 'admin' || user?.role === 'guru';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const current = await getCurrentUser();
    setUser(current);

    if (!current) {
      setLoading(false);
      return;
    }

    let classroomList: Classroom[] = [];

    if (current.role === 'admin') {
      const { data } = await supabase.from('classrooms').select('*').order('nama');
      classroomList = data || [];
    } else if (current.role === 'guru') {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('guru_id', current.id)
        .order('nama');
      classroomList = data || [];
    } else {
      const { data: member } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('student_id', current.id);

      const ids = (member || []).map((m) => m.classroom_id);
      if (ids.length > 0) {
        const { data } = await supabase.from('classrooms').select('*').in('id', ids).order('nama');
        classroomList = data || [];
      }
    }

    setClassrooms(classroomList);

    const { data: scheduleData, error } = await supabase
      .from('schedules')
      .select('*')
      .order('day_of_week')
      .order('start_time');

    if (error) {
      toast.error('Gagal memuat jadwal');
    } else {
      setSchedules(
        (scheduleData || []).map((s) => ({
          ...s,
          classroom_nama: s.classroom_id
            ? classroomList.find((c) => c.id === s.classroom_id)?.nama || '-'
            : 'Semua Kelas',
        }))
      );
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      classroom_id: '',
      title: '',
      day_of_week: 1,
      start_time: '07:00',
      end_time: '08:30',
      room: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.classroom_id && user.role === 'guru') {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }

    const payload = {
      classroom_id: formData.classroom_id || null,
      title: formData.title,
      day_of_week: Number(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      room: formData.room || null,
      teacher_id: user.id,
      created_by: user.id,
    };

    if (editing) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', editing.id);
      if (error) {
        toast.error(error.message || 'Gagal mengupdate jadwal');
        return;
      }
      toast.success('Jadwal berhasil diupdate');
    } else {
      const { error } = await supabase.from('schedules').insert(payload);
      if (error) {
        toast.error(error.message || 'Gagal menambah jadwal');
        return;
      }
      toast.success('Jadwal berhasil ditambahkan');
    }

    setShowModal(false);
    resetForm();
    fetchData();
  };

  const handleEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setFormData({
      classroom_id: schedule.classroom_id || '',
      title: schedule.title,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      room: schedule.room || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) {
      toast.error(error.message || 'Gagal menghapus jadwal');
    } else {
      toast.success('Jadwal berhasil dihapus');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Jadwal Pelajaran</h1>
          <p className="text-sm text-dark-400 mt-1">
            {canManage ? 'Kelola jadwal pelajaran kelas.' : 'Jadwal belajar Anda.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Tambah Jadwal
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Hari', 'Jam', 'Pelajaran', 'Kelas', 'Ruang', ...(canManage ? ['Aksi'] : [])].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    {DAYS.find((d) => d.value === s.day_of_week)?.label || s.day_of_week}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-300">
                    {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{s.title}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{s.classroom_nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{s.room || '-'}</td>
                  {canManage && (
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button onClick={() => handleEdit(s)} className="text-blue-400 hover:text-blue-300">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">Hapus</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {schedules.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada jadwal</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-white">
              {editing ? 'Edit Jadwal' : 'Tambah Jadwal'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Hari</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                    className="glass-input"
                  >
                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Kelas</label>
                  <select
                    value={formData.classroom_id}
                    onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                    className="glass-input"
                    required={user?.role === 'guru'}
                  >
                    <option value="">{user?.role === 'admin' ? 'Semua Kelas' : 'Pilih Kelas'}</option>
                    {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Mata Pelajaran / Agenda</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="glass-input"
                  placeholder="Matematika"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Ruang</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="glass-input"
                  placeholder="Ruang 12A"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  {editing ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
