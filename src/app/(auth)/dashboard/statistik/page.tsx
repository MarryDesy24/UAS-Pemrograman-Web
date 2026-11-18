'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Assessment, User } from '@/lib/types';

interface Stats {
  label: string;
  value: string | number;
  hint?: string;
}

export default function StatistikPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats[]>([]);
  const [classStats, setClassStats] = useState<{ nama: string; siswa: number; avg: number; submitted: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (current.role === 'admin') {
      const [guruRes, siswaRes, kelasRes, mapelRes, subRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'guru'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'siswa'),
        supabase.from('classrooms').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('score'),
      ]);

      const scores = (subRes.data || []).filter((s) => s.score !== null).map((s) => s.score as number);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setStats([
        { label: 'Total Guru', value: guruRes.count || 0 },
        { label: 'Total Siswa', value: siswaRes.count || 0 },
        { label: 'Total Kelas', value: kelasRes.count || 0 },
        { label: 'Mata Pelajaran', value: mapelRes.count || 0 },
        { label: 'Submission Masuk', value: subRes.data?.length || 0 },
        { label: 'Rata-rata Nilai', value: `${avg}%` },
      ]);
    } else {
      let classroomIds: string[] = [];

      if (current.role === 'guru') {
        const { data } = await supabase.from('classrooms').select('id').eq('guru_id', current.id);
        classroomIds = (data || []).map((c) => c.id);
      } else {
        const { data } = await supabase
          .from('classroom_members')
          .select('classroom_id')
          .eq('student_id', current.id);
        classroomIds = (data || []).map((c) => c.classroom_id);
      }

      if (classroomIds.length === 0) {
        setStats([
          { label: 'Kelas', value: 0 },
          { label: 'Materi', value: 0 },
          { label: 'Assessment', value: 0 },
          { label: 'Rata-rata Nilai', value: '-' },
        ]);
        setLoading(false);
        return;
      }

      const [materialsRes, assessmentsRes, membersRes] = await Promise.all([
        supabase.from('materials').select('*').in('classroom_id', classroomIds),
        supabase.from('assessments').select('*').in('classroom_id', classroomIds),
        supabase.from('classroom_members').select('*').in('classroom_id', classroomIds),
      ]);

      const assessments: Assessment[] = assessmentsRes.data || [];
      const assessmentIds = assessments.map((a) => a.id);

      let subQuery = assessmentIds.length
        ? supabase.from('submissions').select('*').in('assessment_id', assessmentIds)
        : Promise.resolve({ data: [] as any[] });

      const subRes = await subQuery;
      const subs = (subRes.data || []).filter(
        (s: any) => current.role !== 'siswa' || s.student_id === current.id
      );
      const graded = subs.filter((s: any) => s.score !== null && s.score !== undefined);
      const avg = graded.length > 0
        ? Math.round(
            graded.reduce((acc: number, s: any) => {
              const a = assessments.find((x) => x.id === s.assessment_id);
              return acc + ((s.score || 0) / (a?.max_score || 100)) * 100;
            }, 0) / graded.length
          )
        : 0;

      const materialIds = (materialsRes.data || []).map((m) => m.id);
      const progressRes = materialIds.length
        ? await supabase.from('materials_progress').select('*').in('material_id', materialIds)
        : { data: [] as any[] };
      const progressData = (progressRes.data || []).filter(
        (p: any) => current.role !== 'siswa' || p.student_id === current.id
      );

      if (current.role === 'guru') {
        setStats([
          { label: 'Kelas Diampu', value: classroomIds.length },
          { label: 'Total Siswa', value: new Set((membersRes.data || []).map((m) => m.student_id)).size },
          { label: 'Total Materi', value: materialIds.length },
          { label: 'Total Assessment', value: assessmentIds.length },
          { label: 'Submission Masuk', value: subs.length },
          { label: 'Rata-rata Nilai', value: graded.length > 0 ? `${avg}%` : '-' },
        ]);
      } else {
        setStats([
          { label: 'Kelas Diikuti', value: classroomIds.length },
          { label: 'Materi Selesai', value: progressData.length },
          { label: 'Tugas Terkumpul', value: subs.length },
          { label: 'Tugas Dinilai', value: graded.length },
          { label: 'Rata-rata Nilai', value: graded.length > 0 ? `${avg}%` : '-' },
        ]);
      }

      const perClass = classroomIds.map((id) => {
        const classAssessments = assessments.filter((a) => a.classroom_id === id);
        const classIds = new Set(classAssessments.map((a) => a.id));
        const classSubs = subs.filter((s: any) => classIds.has(s.assessment_id));
        const classGraded = classSubs.filter((s: any) => s.score !== null && s.score !== undefined);
        const classAvg = classGraded.length > 0
          ? Math.round(
              classGraded.reduce((acc: number, s: any) => {
                const a = classAssessments.find((x) => x.id === s.assessment_id);
                return acc + ((s.score || 0) / (a?.max_score || 100)) * 100;
              }, 0) / classGraded.length
            )
          : 0;

        return {
          nama: '-',
          siswa: new Set((membersRes.data || []).filter((m) => m.classroom_id === id).map((m) => m.student_id)).size,
          avg: classAvg,
          submitted: classSubs.length,
          total: classAssessments.length * (current.role === 'siswa' ? 1 : new Set((membersRes.data || []).filter((m) => m.classroom_id === id).map((m) => m.student_id)).size),
        };
      });

      const { data: classroomData } = await supabase.from('classrooms').select('id, nama').in('id', classroomIds);
      setClassStats(
        perClass.map((row, index) => ({
          ...row,
          nama: classroomData?.find((c) => c.id === classroomIds[index])?.nama || '-',
        }))
      );
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Statistik</h1>
        <p className="text-sm text-dark-400 mt-1">
          {user?.role === 'admin'
            ? 'Statistik sekolah secara keseluruhan.'
            : user?.role === 'guru'
              ? 'Statistik kelas yang Anda ampu.'
              : 'Statistik belajar pribadi Anda.'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card">
            <p className="text-sm text-dark-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
            {s.hint && <p className="text-xs text-dark-500 mt-1">{s.hint}</p>}
          </div>
        ))}
      </div>

      {classStats.length > 0 && (
        <div className="glass-card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Kelas', 'Siswa', 'Rata-rata Nilai', 'Terkumpul', 'Total'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {classStats.map((c) => (
                <tr key={c.nama} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm text-white font-medium">{c.nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{c.siswa}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{c.avg > 0 ? `${c.avg}%` : '-'}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{c.submitted}</td>
                  <td className="px-6 py-4 text-sm text-dark-300">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
