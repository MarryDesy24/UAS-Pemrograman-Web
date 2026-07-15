'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Classroom, User, Subject } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

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
// GURU: View classes + manage students + QR
// ============================================
function GuruKelasView() {
  const [classrooms, setClassrooms] = useState<(Classroom & { subject_nama?: string; member_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelas, setSelectedKelas] = useState<(Classroom & { subject_nama?: string }) | null>(null);
  const [members, setMembers] = useState<(User & { joined_at?: string })[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrKode, setQrKode] = useState('');
  const [allSiswa, setAllSiswa] = useState<User[]>([]);

  useEffect(() => { fetchClassrooms(); }, []);

  const fetchClassrooms = async () => {
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

  const fetchMembers = async (classroomId: string) => {
    setMembersLoading(true);
    const { data: memberData } = await supabase
      .from('classroom_members')
      .select('*')
      .eq('classroom_id', classroomId);

    if (memberData && memberData.length > 0) {
      const studentIds = memberData.map((m) => m.student_id);
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', studentIds);

      const enriched = memberData.map((m) => ({
        ...usersData?.find((u) => u.id === m.student_id),
        joined_at: m.joined_at,
      })).filter(Boolean);
      setMembers(enriched as (User & { joined_at?: string })[]);
    } else {
      setMembers([]);
    }
    setMembersLoading(false);
  };

  const handleSelectKelas = async (kelas: Classroom & { subject_nama?: string }) => {
    setSelectedKelas(kelas);
    await fetchMembers(kelas.id);
  };

  const generateQR = async (kode: string) => {
    try {
      const joinUrl = `${window.location.origin}/dashboard/kelas?join=${encodeURIComponent(kode)}`;
      const url = await QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(url);
      setQrKode(kode);
      setShowQR(true);
    } catch {
      toast.error('Gagal generate QR code');
    }
  };

  const copyKode = (kode: string) => {
    navigator.clipboard.writeText(kode);
    toast.success('Kode kelas berhasil disalin');
  };

  const fetchAllSiswa = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'siswa').order('nama');
    setAllSiswa(data || []);
  };

  const handleOpenAddStudent = async () => {
    setShowAddStudent(true);
    setSearchQuery('');
    setSearchResults([]);
    await fetchAllSiswa();
  };

  const handleSearchStudent = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allSiswa.filter(
      (s) => !members.find((m) => m.id === s.id) &&
        (s.nama.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    );
    setSearchResults(filtered);
  };

  const handleAddStudent = async (studentId: string) => {
    if (!selectedKelas) return;

    const { error } = await supabase.from('classroom_members').insert({
      classroom_id: selectedKelas.id,
      student_id: studentId,
    });

    if (error) {
      toast.error('Gagal menambahkan siswa');
    } else {
      toast.success('Siswa berhasil ditambahkan');
      setShowAddStudent(false);
      await fetchMembers(selectedKelas.id);
      fetchClassrooms();
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedKelas) return;
    if (!confirm('Yakin ingin mengeluarkan siswa dari kelas ini?')) return;

    const { error } = await supabase
      .from('classroom_members')
      .delete()
      .eq('classroom_id', selectedKelas.id)
      .eq('student_id', studentId);

    if (error) {
      toast.error('Gagal mengeluarkan siswa');
    } else {
      toast.success('Siswa berhasil dikeluarkan');
      await fetchMembers(selectedKelas.id);
      fetchClassrooms();
    }
  };

  // Detail view
  if (selectedKelas) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedKelas(null); setMembers([]); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{selectedKelas.nama}</h1>
            <p className="text-dark-400">{selectedKelas.subject_nama} &middot; {selectedKelas.semester} {selectedKelas.tahun_ajaran}</p>
          </div>
        </div>

        {/* Kelas Info & QR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kode Kelas */}
          <div className="glass-card">
            <h2 className="font-semibold text-white mb-4">Kode Kelas</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-white/5 rounded-lg border border-white/10 font-mono text-xl text-white tracking-widest text-center">
                {selectedKelas.kode}
              </div>
              <button onClick={() => copyKode(selectedKelas.kode)} className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors" title="Salin kode">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button onClick={() => generateQR(selectedKelas.kode)} className="p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors" title="Tampilkan QR Code">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-dark-400 mt-3">Bagikan kode ini kepada siswa untuk bergabung ke kelas</p>
          </div>

          {/* Statistik Kelas */}
          <div className="glass-card">
            <h2 className="font-semibold text-white mb-4">Statistik Kelas</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-dark-400">Total Siswa</span>
                <span className="text-lg font-bold text-white">{members.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-dark-400">Kode Kelas</span>
                <span className="font-mono text-white">{selectedKelas.kode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Siswa */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Daftar Siswa ({members.length})</h2>
            <button onClick={handleOpenAddStudent} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Siswa
            </button>
          </div>

          {membersLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" /></div>
          ) : members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Bergabung</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((siswa, idx) => (
                    <tr key={siswa.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{siswa.nama}</td>
                      <td className="px-4 py-3 text-sm text-dark-400">{siswa.email}</td>
                      <td className="px-4 py-3 text-sm text-dark-400">
                        {siswa.joined_at ? new Date(siswa.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemoveStudent(siswa.id)} className="text-red-400 hover:text-red-300 text-sm">
                          Keluarkan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-dark-400">
              <p>Belum ada siswa di kelas ini</p>
              <p className="text-sm mt-1">Klik "Tambah Siswa" untuk menambahkan siswa ke kelas</p>
            </div>
          )}
        </div>

        {/* Modal Tambah Siswa */}
        {showAddStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Tambah Siswa ke Kelas</h2>
                <button onClick={() => setShowAddStudent(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative mb-4">
                <svg className="w-5 h-5 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari nama atau email siswa..."
                  value={searchQuery}
                  onChange={(e) => handleSearchStudent(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-dark-400 outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto flex-1 space-y-2">
                {searchQuery && searchResults.length > 0 ? (
                  searchResults.map((siswa) => (
                    <div key={siswa.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-medium text-blue-400">
                          {siswa.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{siswa.nama}</p>
                          <p className="text-xs text-dark-400">{siswa.email}</p>
                        </div>
                      </div>
                      <button onClick={() => handleAddStudent(siswa.id)} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors">
                        Tambah
                      </button>
                    </div>
                  ))
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-8 text-dark-400">
                    <p>Tidak ditemukan siswa yang cocok</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-dark-400">
                    <p>Ketik nama atau email untuk mencari siswa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal QR Code */}
        {showQR && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
            <div className="glass-card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-2">QR Code Kelas</h2>
                <p className="text-sm text-dark-400 mb-4">Scan QR ini untuk join kelas {selectedKelas.nama}</p>
                <div className="bg-white p-4 rounded-xl inline-block">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />}
                </div>
                <p className="text-xs text-dark-400 mt-4 font-mono">{selectedKelas.kode}</p>
                <button onClick={() => setShowQR(false)} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Kelas Saya</h1>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((kelas) => (
            <div key={kelas.id} className="glass-card-hover cursor-pointer" onClick={() => handleSelectKelas(kelas)}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">{kelas.kode}</span>
                  <h3 className="mt-2 font-semibold text-white">{kelas.nama}</h3>
                  <p className="text-sm text-dark-400 mt-1">{kelas.subject_nama}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); generateQR(kelas.kode); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="QR Code">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>
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

      {/* Modal QR Code */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="glass-card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white mb-2">QR Code Kelas</h2>
              <p className="text-sm text-dark-400 mb-4">Scan QR ini untuk join kelas</p>
              <div className="bg-white p-4 rounded-xl inline-block">
                {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />}
              </div>
              <p className="text-xs text-dark-400 mt-4 font-mono">{qrKode}</p>
              <button onClick={() => setShowQR(false)} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SISWA: View joined classes + Join by code/QR + Class Detail
// ============================================
function SiswaKelasView() {
  const [classrooms, setClassrooms] = useState<(Classroom & { guru_nama?: string; subject_nama?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [selectedKelas, setSelectedKelas] = useState<(Classroom & { guru_nama?: string; subject_nama?: string }) | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Ambil parameter ?join dari URL saat mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      setPendingJoinCode(joinParam);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch data siswa
  useEffect(() => { fetchData(); }, []);

  // Auto-join setelah user authenticated dan data loaded
  useEffect(() => {
    if (!loading && pendingJoinCode) {
      const code = pendingJoinCode;
      setPendingJoinCode(null);
      handleJoin(code);
    }
  }, [loading, pendingJoinCode]);

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

  const fetchClassDetail = async (classroomId: string) => {
    setDetailLoading(true);
    const [modulesRes, announcementsRes] = await Promise.all([
      supabase.from('modules').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
    ]);
    setModules(modulesRes.data || []);
    setAnnouncements(announcementsRes.data || []);
    setDetailLoading(false);
  };

  const handleSelectKelas = async (kelas: Classroom & { guru_nama?: string; subject_nama?: string }) => {
    setSelectedKelas(kelas);
    await fetchClassDetail(kelas.id);
  };

  const handleJoin = async (code: string) => {
    if (!code.trim()) return;

    setJoining(true);
    const { data: user } = await supabase.auth.getUser();
    const cleanCode = code.trim().toUpperCase();

    console.log('[QR DEBUG] join with code:', cleanCode, 'from raw:', code);

    const { data: classroom, error: findError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('kode', cleanCode)
      .single();

    if (findError || !classroom) {
      console.error('[QR DEBUG] not found:', cleanCode, findError);
      toast.error(`Kode kelas "${cleanCode}" tidak ditemukan`);
      setJoining(false);
      return;
    }

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

    const { error: joinError } = await supabase.from('classroom_members').insert({
      classroom_id: classroom.id,
      student_id: user.user?.id || '',
    });

    if (joinError) {
      toast.error('Gagal bergabung ke kelas');
    } else {
      toast.success(`Berhasil bergabung ke kelas ${classroom.nama}!`);
      setShowJoinModal(false);
      setShowQRScanner(false);
      setJoinCode('');
      await fetchData();
      // Auto-open the class detail after successful join
      const enrichedKelas = {
        ...classroom,
        guru_nama: classrooms.find((c) => c.guru_id === classroom.guru_id)?.guru_nama,
        subject_nama: classrooms.find((c) => c.subject_id === classroom.subject_id)?.subject_nama,
      };
      await handleSelectKelas(enrichedKelas);
    }
    setJoining(false);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoin(joinCode);
  };

  const extractJoinCode = (text: string): string => {
    const trimmed = text.trim();

    // Method 1: URL with search params  e.g. https://...?join=KLS-123
    try {
      if (trimmed.includes('join=')) {
        const url = new URL(trimmed);
        const joinParam = url.searchParams.get('join');
        if (joinParam) return joinParam.trim();
      }
    } catch {}

    // Method 2: regex fallback  e.g. ...?join=KLS-123&... or ...?join=KLS-123
    const match = trimmed.match(/[?&]join=([^&\s]+)/i);
    if (match) return decodeURIComponent(match[1]).trim();

    // Method 3: if it looks like a plain code (alphanumeric + dash), use as-is
    if (/^[A-Z0-9\-]+$/i.test(trimmed) && trimmed.length <= 30) {
      return trimmed;
    }

    // Method 4: fallback — return raw text
    return trimmed;
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      try {
        const el = document.getElementById('qr-reader');
        if (el && el.innerHTML) {
          el.innerHTML = '';
        }
      } catch {}
    };
  }, []);

  // Start scanner when showQRScanner becomes true
  useEffect(() => {
    if (!showQRScanner) return;

    let scanner: any = null;
    let stopped = false;

    const startScanner = async () => {
      // Wait for DOM to render
      await new Promise((r) => setTimeout(r, 300));

      const el = document.getElementById('qr-reader');
      if (!el || stopped) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;

        scanner = new Html5Qrcode('qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 5, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (stopped) return;
            stopped = true;
            try {
              await scanner.stop();
              scanner.clear();
            } catch {}
            setShowQRScanner(false);
            const code = extractJoinCode(decodedText);
            handleJoin(code);
          },
          () => {}
        );
      } catch (err) {
        if (stopped) return;
        console.error('QR Scanner error:', err);
        toast.error('Tidak dapat mengakses kamera. Silakan gunakan kode manual.');
        setShowQRScanner(false);
        setShowJoinModal(true);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (scanner) {
        try { scanner.stop(); } catch {}
        try { scanner.clear(); } catch {}
      }
    };
  }, [showQRScanner]);

  const stopQRScanner = () => {
    setShowQRScanner(false);
    setShowJoinModal(true);
  };

  // Detail view for selected class
  if (selectedKelas) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedKelas(null); setModules([]); setAnnouncements([]); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{selectedKelas.nama}</h1>
            <p className="text-dark-400">{selectedKelas.subject_nama} &middot; Oleh: {selectedKelas.guru_nama}</p>
          </div>
        </div>

        {/* Class Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card">
            <p className="text-sm text-dark-400">Kode Kelas</p>
            <p className="text-lg font-mono font-bold text-white mt-1">{selectedKelas.kode}</p>
          </div>
          <div className="glass-card">
            <p className="text-sm text-dark-400">Semester</p>
            <p className="text-lg font-bold text-white mt-1">{selectedKelas.semester}</p>
          </div>
          <div className="glass-card">
            <p className="text-sm text-dark-400">Tahun Ajaran</p>
            <p className="text-lg font-bold text-white mt-1">{selectedKelas.tahun_ajaran}</p>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Modules */}
            <div className="glass-card">
              <h2 className="font-semibold text-white mb-4">Modul Ajar ({modules.length})</h2>
              {modules.length > 0 ? (
                <div className="space-y-3">
                  {modules.map((mod) => (
                    <div key={mod.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <h3 className="font-medium text-white text-sm">{mod.title}</h3>
                      {mod.description && <p className="text-xs text-dark-400 mt-1 line-clamp-2">{mod.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-400 text-center py-4">Belum ada modul ajar</p>
              )}
            </div>

            {/* Announcements */}
            <div className="glass-card">
              <h2 className="font-semibold text-white mb-4">Pengumuman ({announcements.length})</h2>
              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <h3 className="font-medium text-white text-sm">{a.title}</h3>
                      <p className="text-xs text-dark-400 mt-1 line-clamp-2">{a.content}</p>
                      <p className="text-xs text-dark-500 mt-2">{new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-400 text-center py-4">Belum ada pengumuman</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
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
            <div key={kelas.id} className="glass-card-hover cursor-pointer" onClick={() => handleSelectKelas(kelas)}>
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
            <p className="text-sm text-dark-400 mb-4">Masukkan kode kelas dari guru atau scan QR code</p>

            {/* Tab Manual / QR */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setShowJoinModal(false); setShowQRScanner(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan QR Code
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-dark-800 px-2 text-dark-400">atau masukkan kode manual</span>
              </div>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
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

      {/* QR Scanner */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-white">Scan QR Code</h2>
              <p className="text-sm text-dark-400">Arahkan kamera ke QR code dari guru</p>
            </div>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black" />
            <div className="flex justify-center mt-4">
              <button onClick={stopQRScanner} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Batal
              </button>
            </div>
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
