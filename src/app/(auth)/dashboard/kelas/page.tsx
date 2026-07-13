'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Classroom, User, Subject } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

// ============================================
// ADMIN: Full CRUD
// ============================================
function AdminKelasView() {
  const [classrooms, setClassrooms] = useState<(Classroom & { guru_nama?: string; subject_nama?: string })[]>([]);
  const [guruList, setGuruList] = useState<User[]>([]);
  const [subjectList, setSubjectList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    guru_id: '',
    subject_id: '',
    semester: 'Ganjil',
    tahun_ajaran: '2024/2025',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [classroomsRes, guruRes, subjectRes] = await Promise.all([
      supabase.from('classrooms').select('*').order('nama'),
      supabase.from('users').select('*').eq('role', 'guru').order('nama'),
      supabase.from('subjects').select('*').order('nama'),
    ]);

    if (classroomsRes.data) {
      const enriched = classroomsRes.data.map((c) => ({
        ...c,
        guru_nama: guruRes.data?.find((g) => g.id === c.guru_id)?.nama,
        subject_nama: subjectRes.data?.find((s) => s.id === c.subject_id)?.nama,
      }));
      setClassrooms(enriched);
    }
    setGuruList(guruRes.data || []);
    setSubjectList(subjectRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKelas) {
      const { error } = await supabase.from('classrooms').update({
        nama: formData.nama, kode: formData.kode, guru_id: formData.guru_id,
        subject_id: formData.subject_id, semester: formData.semester, tahun_ajaran: formData.tahun_ajaran,
      }).eq('id', editingKelas.id);
      if (error) toast.error('Gagal mengupdate kelas');
      else { toast.success('Kelas berhasil diupdate'); setShowModal(false); setEditingKelas(null); fetchData(); }
    } else {
      const { error } = await supabase.from('classrooms').insert({
        nama: formData.nama, kode: formData.kode, guru_id: formData.guru_id,
        subject_id: formData.subject_id, semester: formData.semester, tahun_ajaran: formData.tahun_ajaran,
      });
      if (error) toast.error('Gagal menambah kelas');
      else { toast.success('Kelas berhasil ditambahkan'); setShowModal(false); fetchData(); }
    }
    setFormData({ nama: '', kode: '', guru_id: '', subject_id: '', semester: 'Ganjil', tahun_ajaran: '2024/2025' });
  };

  const handleEdit = (kelas: Classroom) => {
    setEditingKelas(kelas);
    setFormData({ nama: kelas.nama, kode: kelas.kode, guru_id: kelas.guru_id, subject_id: kelas.subject_id, semester: kelas.semester, tahun_ajaran: kelas.tahun_ajaran });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return;
    const { error } = await supabase.from('classrooms').delete().eq('id', id);
    if (error) toast.error('Gagal menghapus kelas');
    else { toast.success('Kelas berhasil dihapus'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manajemen Kelas</h1>
        <button onClick={() => { setEditingKelas(null); setFormData({ nama: '', kode: '', guru_id: '', subject_id: '', semester: 'Ganjil', tahun_ajaran: '2024/2025' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">+ Tambah Kelas</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Guru</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Mata Pelajaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classrooms.map((kelas, index) => (
                <tr key={kelas.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{kelas.kode}</td>
                  <td className="px-6 py-4 text-sm text-white">{kelas.nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{kelas.guru_nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{kelas.subject_nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{kelas.semester} {kelas.tahun_ajaran}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(kelas)} className="text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDelete(kelas.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classrooms.length === 0 && <div className="text-center py-12 text-dark-400">Belum ada data kelas</div>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{editingKelas ? 'Edit Kelas' : 'Tambah Kelas'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kode Kelas</label>
                <input type="text" value={formData.kode} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="KLS-001" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Nama Kelas</label>
                <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Kelas X RPL 1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Guru</label>
                <select value={formData.guru_id} onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                  <option value="">Pilih Guru</option>
                  {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Mata Pelajaran</label>
                <select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                  <option value="">Pilih Mata Pelajaran</option>
                  {subjectList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Semester</label>
                  <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Tahun Ajaran</label>
                  <input type="text" value={formData.tahun_ajaran} onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="2024/2025" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">{editingKelas ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// GURU: View only their classes
// ============================================
function GuruKelasView() {
  const [classrooms, setClassrooms] = useState<(Classroom & { subject_nama?: string; member_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();
    const { data: classroomsRes } = await supabase.from('classrooms').select('*').eq('guru_id', user.user?.id || '').order('nama');
    const { data: subjectRes } = await supabase.from('subjects').select('*');

    if (classroomsRes) {
      const enriched = await Promise.all(classroomsRes.map(async (c) => {
        const { count } = await supabase.from('classroom_members').select('*', { count: 'exact', head: true }).eq('classroom_id', c.id);
        return {
          ...c,
          subject_nama: subjectRes?.find((s) => s.id === c.subject_id)?.nama,
          member_count: count || 0,
        };
      }));
      setClassrooms(enriched);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Kelas Saya</h1>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((kelas) => (
            <div key={kelas.id} className="glass-card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">{kelas.kode}</span>
                  <h3 className="mt-2 font-semibold text-white">{kelas.nama}</h3>
                  <p className="text-sm text-dark-400 mt-1">{kelas.subject_nama}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-dark-400">
                <span>{kelas.semester} {kelas.tahun_ajaran}</span>
                <span className="font-medium text-blue-400">{kelas.member_count} siswa</span>
              </div>
            </div>
          ))}
          {classrooms.length === 0 && <div className="col-span-full text-center py-12 text-dark-400">Belum ada kelas</div>}
        </div>
      )}
    </div>
  );
}

// ============================================
// SISWA: View joined classes + Join by code
// ============================================
function SiswaKelasView() {
  const [classrooms, setClassrooms] = useState<(Classroom & { guru_nama?: string; subject_nama?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const { data: memberData } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('student_id', user.user?.id || '');

    const classroomIds = memberData?.map((m) => m.classroom_id) || [];

    if (classroomIds.length > 0) {
      const { data: classroomsRes } = await supabase
        .from('classrooms')
        .select('*')
        .in('id', classroomIds)
        .order('nama');

      const { data: guruRes } = await supabase.from('users').select('id, nama').eq('role', 'guru');
      const { data: subjectRes } = await supabase.from('subjects').select('*');

      if (classroomsRes) {
        const enriched = classroomsRes.map((c) => ({
          ...c,
          guru_nama: guruRes?.find((g) => g.id === c.guru_id)?.nama,
          subject_nama: subjectRes?.find((s) => s.id === c.subject_id)?.nama,
        }));
        setClassrooms(enriched);
      }
    } else {
      setClassrooms([]);
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    const { data: user } = await supabase.auth.getUser();
    const code = joinCode.trim().toUpperCase();

    // Cari kelas berdasarkan kode
    const { data: classroom, error: findError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('kode', code)
      .single();

    if (findError || !classroom) {
      toast.error('Kode kelas tidak ditemukan');
      setJoining(false);
      return;
    }

    // Cek apakah sudah bergabung
    const { data: existing } = await supabase
      .from('classroom_members')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', user.user?.id || '')
      .single();

    if (existing) {
      toast.error('Anda sudah bergabung di kelas ini');
      setJoining(false);
      return;
    }

    // Gabung kelas
    const { error: joinError } = await supabase.from('classroom_members').insert({
      classroom_id: classroom.id,
      student_id: user.user?.id || '',
    });

    if (joinError) {
      toast.error('Gagal bergabung ke kelas');
    } else {
      toast.success(`Berhasil bergabung ke kelas ${classroom.nama}!`);
      setShowJoinModal(false);
      setJoinCode('');
      fetchData();
    }
    setJoining(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kelas Saya</h1>
        <button onClick={() => { setJoinCode(''); setShowJoinModal(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          + Join Kelas
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((kelas) => (
            <div key={kelas.id} className="glass-card-hover">
              <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">{kelas.kode}</span>
              <h3 className="mt-2 font-semibold text-white">{kelas.nama}</h3>
              <p className="text-sm text-dark-400 mt-1">{kelas.subject_nama}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-dark-400">
                <span>Oleh: {kelas.guru_nama}</span>
                <span>{kelas.semester} {kelas.tahun_ajaran}</span>
              </div>
            </div>
          ))}
          {classrooms.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-dark-400 mb-2">Belum ada kelas yang diikuti</p>
              <p className="text-sm text-gray-400">Klik "Join Kelas" dan masukkan kode kelas dari guru Anda</p>
            </div>
          )}
        </div>
      )}

      {/* Join Kelas Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Join Kelas</h2>
            <p className="text-sm text-dark-400 mb-4">Masukkan kode kelas yang diberikan oleh guru</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kode Kelas</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg font-mono tracking-widest uppercase"
                  placeholder="Contoh: KLS-001"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowJoinModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" disabled={joining} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {joining ? 'Bergabung...' : 'Gabung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE: Route by role
// ============================================
export default function KelasPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const user = await getCurrentUser();
      setRole(user?.role || null);
      setLoading(false);
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (role === 'admin') return <AdminKelasView />;
  if (role === 'guru') return <GuruKelasView />;
  if (role === 'siswa') return <SiswaKelasView />;

  return null;
}
