'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

interface Stats {
  totalGuru: number;
  totalSiswa: number;
  totalKelas: number;
  totalMataPelajaran: number;
  totalAssessment: number;
  assessmentBelumDinilai: number;
}

interface DeadlineItem {
  id: string;
  title: string;
  type: string;
  deadline: string;
  classroom_nama?: string;
  submission?: { id: string } | null;
}

interface NilaiItem {
  id: string;
  score: number | null;
  max_score: number;
  assessment_title: string;
  submitted_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalGuru: 0, totalSiswa: 0, totalKelas: 0, totalMataPelajaran: 0,
    totalAssessment: 0, assessmentBelumDinilai: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [recentNilai, setRecentNilai] = useState<NilaiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser?.role === 'admin') {
          const [guru, siswa, kelas, mp] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'guru'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'siswa'),
            supabase.from('classrooms').select('*', { count: 'exact', head: true }),
            supabase.from('subjects').select('*', { count: 'exact', head: true }),
          ]);
          setStats({
            totalGuru: guru.count || 0,
            totalSiswa: siswa.count || 0,
            totalKelas: kelas.count || 0,
            totalMataPelajaran: mp.count || 0,
            totalAssessment: 0,
            assessmentBelumDinilai: 0,
          });
        }

        if (currentUser?.role === 'guru') {
          const [kelasRes, assessmentsRes, submissionsRes] = await Promise.all([
            supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('guru_id', currentUser.id),
            supabase.from('assessments').select('id').order('created_at', { ascending: false }),
            supabase.from('submissions').select('id, score, assessment_id'),
          ]);

          const assessmentIds = assessmentsRes.data?.map(a => a.id) || [];
          let belumDinilai = 0;
          if (assessmentIds.length > 0) {
            belumDinilai = submissionsRes.data?.filter(s => s.score === null && assessmentIds.includes(s.assessment_id)).length || 0;
          }

          setStats({
            totalGuru: kelasRes.count || 0,
            totalSiswa: assessmentIds.length,
            totalKelas: 0,
            totalMataPelajaran: 0,
            totalAssessment: assessmentIds.length,
            assessmentBelumDinilai: belumDinilai,
          });
        }

        if (currentUser?.role === 'siswa') {
          const { data: memberData } = await supabase
            .from('classroom_members')
            .select('classroom_id')
            .eq('student_id', currentUser.id);

          const classroomIds = memberData?.map(m => m.classroom_id) || [];

          if (classroomIds.length > 0) {
            const { data: announcements } = await supabase
              .from('announcements')
              .select('*')
              .in('classroom_id', classroomIds)
              .order('created_at', { ascending: false })
              .limit(3);
            setRecentAnnouncements(announcements || []);

            const { data: classrooms } = await supabase
              .from('classrooms')
              .select('id, nama')
              .in('id', classroomIds);

            const { data: assessments } = await supabase
              .from('assessments')
              .select('*')
              .in('classroom_id', classroomIds)
              .order('deadline', { ascending: true });

            const { data: submissions } = await supabase
              .from('submissions')
              .select('assessment_id')
              .eq('student_id', currentUser.id);

            const submittedIds = new Set(submissions?.map(s => s.assessment_id) || []);

            if (assessments) {
              const upcoming = assessments
                .filter(a => a.deadline && new Date(a.deadline) > new Date() && !submittedIds.has(a.id))
                .slice(0, 5)
                .map(a => ({
                  ...a,
                  classroom_nama: classrooms?.find(c => c.id === a.classroom_id)?.nama,
                  submission: null,
                }));
              setDeadlines(upcoming);
            }

            const { data: recentSubs } = await supabase
              .from('submissions')
              .select('*')
              .eq('student_id', currentUser.id)
              .order('submitted_at', { ascending: false })
              .limit(5);

            if (recentSubs && recentSubs.length > 0) {
              const assessmentIdsForNilai = recentSubs.map(s => s.assessment_id);
              const { data: assessForNilai } = await supabase
                .from('assessments')
                .select('id, title, max_score')
                .in('id', assessmentIdsForNilai);

              const enriched = recentSubs.map(s => ({
                id: s.id,
                score: s.score,
                max_score: assessForNilai?.find(a => a.id === s.assessment_id)?.max_score || 100,
                assessment_title: assessForNilai?.find(a => a.id === s.assessment_id)?.title || '-',
                submitted_at: s.submitted_at,
              }));
              setRecentNilai(enriched);
            }
          }
        }
      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  if (user?.role === 'admin') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Dashboard Admin</h1>
            <p className="text-sm text-dark-400">Kelola seluruh data sekolah</p>
          </div>
        </div>

        {/* Statistik Utama */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/guru" className="glass-card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Guru</p>
                <p className="text-2xl font-bold text-white">{stats.totalGuru}</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/siswa" className="glass-card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Siswa</p>
                <p className="text-2xl font-bold text-white">{stats.totalSiswa}</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/kelas" className="glass-card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Kelas</p>
                <p className="text-2xl font-bold text-white">{stats.totalKelas}</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/mata-pelajaran" className="glass-card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Mata Pelajaran</p>
                <p className="text-2xl font-bold text-white">{stats.totalMataPelajaran}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="glass-card">
          <h2 className="font-heading font-semibold text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/guru" className="flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium text-dark-300 group-hover:text-white transition-colors">Tambah Guru</span>
            </Link>
            <Link href="/dashboard/siswa" className="flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium text-dark-300 group-hover:text-white transition-colors">Tambah Siswa</span>
            </Link>
            <Link href="/dashboard/kelas" className="flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium text-dark-300 group-hover:text-white transition-colors">Buat Kelas</span>
            </Link>
            <Link href="/dashboard/mata-pelajaran" className="flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium text-dark-300 group-hover:text-white transition-colors">Tambah Mata Pelajaran</span>
            </Link>
          </div>
        </div>

        {/* Info Ringkas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card">
            <h2 className="font-heading font-semibold text-white mb-4">Ringkasan Sistem</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-sm text-dark-400">Total Pengguna</span>
                <span className="font-medium text-white">{stats.totalGuru + stats.totalSiswa + 1}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-sm text-dark-400">Rasio Guru : Siswa</span>
                <span className="font-medium text-white">
                  {stats.totalSiswa > 0 ? `1 : ${Math.round(stats.totalSiswa / Math.max(stats.totalGuru, 1))}` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-dark-400">Rata-rata Siswa per Kelas</span>
                <span className="font-medium text-white">
                  {stats.totalKelas > 0 ? Math.round(stats.totalSiswa / stats.totalKelas) : 0}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="font-heading font-semibold text-white mb-4">Yang Perlu Diperhatikan</h2>
            <div className="space-y-3">
              {stats.totalGuru === 0 && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-300">Belum ada guru terdaftar</span>
                </div>
              )}
              {stats.totalSiswa === 0 && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-300">Belum ada siswa terdaftar</span>
                </div>
              )}
              {stats.totalKelas === 0 && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-300">Belum ada kelas dibuat</span>
                </div>
              )}
              {stats.totalMataPelajaran === 0 && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-300">Belum ada mata pelajaran</span>
                </div>
              )}
              {stats.totalGuru > 0 && stats.totalSiswa > 0 && stats.totalKelas > 0 && stats.totalMataPelajaran > 0 && (
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-300">Semua data sudah terisi dengan baik</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // GURU DASHBOARD
  // ============================================
  if (user?.role === 'guru') {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-heading font-bold text-white">Dashboard Guru</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Kelas Diampu</p>
                <p className="text-2xl font-bold text-white">{stats.totalGuru}</p>
              </div>
            </div>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Modul Ajar</p>
                <p className="text-2xl font-bold text-white">{stats.totalSiswa}</p>
              </div>
            </div>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Assessment</p>
                <p className="text-2xl font-bold text-white">{stats.totalAssessment}</p>
              </div>
            </div>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-400">Belum Dinilai</p>
                <p className={`text-2xl font-bold ${stats.assessmentBelumDinilai > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {stats.assessmentBelumDinilai}
                </p>
              </div>
            </div>
          </div>
        </div>

        {stats.assessmentBelumDinilai > 0 && (
          <Link href="/dashboard/penilaian" className="block glass-card border-amber-500/30 hover:bg-amber-500/10 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-300">Ada {stats.assessmentBelumDinilai} submission yang belum dinilai</p>
                <p className="text-sm text-amber-400/70">Klik untuk menuju halaman penilaian</p>
              </div>
            </div>
          </Link>
        )}
      </div>
    );
  }

  // ============================================
  // SISWA DASHBOARD
  // ============================================
  if (user?.role === 'siswa') {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-heading font-bold text-white">Dashboard Siswa</h1>

        {/* Deadline Tugas */}
        {deadlines.length > 0 && (
          <div className="glass-card">
            <h2 className="font-heading font-semibold text-white mb-4">Deadline Mendatang</h2>
            <div className="space-y-3">
              {deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 glass rounded-xl">
                  <div>
                    <h3 className="font-medium text-white">{d.title}</h3>
                    <p className="text-xs text-dark-400">{d.classroom_nama} - {d.type}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-400">
                    {new Date(d.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nilai Terbaru */}
        {recentNilai.length > 0 && (
          <div className="glass-card">
            <h2 className="font-heading font-semibold text-white mb-4">Nilai Terbaru</h2>
            <div className="space-y-3">
              {recentNilai.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-4 glass rounded-xl">
                  <div>
                    <h3 className="font-medium text-white">{n.assessment_title}</h3>
                    <p className="text-xs text-dark-400">
                      {new Date(n.submitted_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  {n.score !== null ? (
                    <span className={`text-lg font-bold ${((n.score / n.max_score) * 100) >= 80 ? 'text-green-400' : ((n.score / n.max_score) * 100) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {n.score}<span className="text-sm font-normal text-dark-400">/{n.max_score}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-dark-500">Belum dinilai</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pengumuman */}
        {recentAnnouncements.length > 0 && (
          <div className="glass-card">
            <h2 className="font-heading font-semibold text-white mb-4">Pengumuman Terbaru</h2>
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="p-4 glass rounded-xl">
                  <h3 className="font-medium text-white">{a.title}</h3>
                  <p className="text-sm text-dark-300 mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {deadlines.length === 0 && recentNilai.length === 0 && recentAnnouncements.length === 0 && (
          <div className="text-center py-16 glass-card">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white mb-1">Selamat belajar!</p>
            <p className="text-sm text-dark-400">Belum ada data yang ditampilkan</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
