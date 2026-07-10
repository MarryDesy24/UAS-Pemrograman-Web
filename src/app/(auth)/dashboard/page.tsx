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
          const [kelasRes, modulesRes, assessmentsRes] = await Promise.all([
            supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('guru_id', currentUser.id),
            supabase.from('modules').select('*', { count: 'exact', head: true }).eq('teacher_id', currentUser.id),
            supabase.from('assessments').select('id, module_id').order('created_at', { ascending: false }),
          ]);

          const moduleIds = modulesRes.data?.map(m => m.id) || [];
          const assessmentIds = assessmentsRes.data
            ?.filter(a => moduleIds.includes(a.module_id))
            .map(a => a.id) || [];

          let belumDinilai = 0;
          if (assessmentIds.length > 0) {
            const { data: subs } = await supabase
              .from('submissions')
              .select('id, score')
              .in('assessment_id', assessmentIds);
            belumDinilai = subs?.filter(s => s.score === null).length || 0;
          }

          setStats({
            totalGuru: kelasRes.count || 0,
            totalSiswa: modulesRes.count || 0,
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
            // Pengumuman
            const { data: announcements } = await supabase
              .from('announcements')
              .select('*')
              .in('classroom_id', classroomIds)
              .order('created_at', { ascending: false })
              .limit(3);
            setRecentAnnouncements(announcements || []);

            // Deadline tugas mendatang
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

            // Nilai terbaru
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  if (user?.role === 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Guru</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGuru}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Siswa</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSiswa}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Kelas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalKelas}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mata Pelajaran</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMataPelajaran}</p>
              </div>
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Guru</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kelas Diampu</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGuru}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Modul Ajar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSiswa}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Assessment</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssessment}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Belum Dinilai</p>
                <p className={`text-2xl font-bold ${stats.assessmentBelumDinilai > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {stats.assessmentBelumDinilai}
                </p>
              </div>
            </div>
          </div>
        </div>

        {stats.assessmentBelumDinilai > 0 && (
          <Link href="/dashboard/penilaian" className="block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-800">Ada {stats.assessmentBelumDinilai} submission yang belum dinilai</p>
                <p className="text-sm text-amber-600">Klik untuk menuju halaman penilaian</p>
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Siswa</h1>

        {/* Deadline Tugas */}
        {deadlines.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Deadline Mendatang</h2>
            <div className="space-y-3">
              {deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{d.title}</h3>
                    <p className="text-xs text-gray-500">{d.classroom_nama} - {d.type}</p>
                  </div>
                  <span className="text-sm font-medium text-amber-600">
                    {new Date(d.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nilai Terbaru */}
        {recentNilai.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Nilai Terbaru</h2>
            <div className="space-y-3">
              {recentNilai.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{n.assessment_title}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(n.submitted_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  {n.score !== null ? (
                    <span className={`text-lg font-bold ${((n.score / n.max_score) * 100) >= 80 ? 'text-green-600' : ((n.score / n.max_score) * 100) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {n.score}<span className="text-sm font-normal text-gray-500">/{n.max_score}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Belum dinilai</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pengumuman */}
        {recentAnnouncements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Pengumuman Terbaru</h2>
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {deadlines.length === 0 && recentNilai.length === 0 && recentAnnouncements.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
            <p className="text-lg font-medium text-gray-600 mb-1">Selamat belajar!</p>
            <p className="text-sm text-gray-400">Belum ada data yang ditampilkan</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
