'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

type MonitoringType = 'assessment' | 'submission' | 'nilai' | 'materi';

interface Props {
  type: MonitoringType;
}

const TITLES: Record<MonitoringType, string> = {
  assessment: 'Monitoring Assessment',
  submission: 'Monitoring Submission',
  nilai: 'Monitoring Nilai',
  materi: 'Monitoring Materi',
};

export default function AdminMonitoring({ type }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const { data: classroomsData } = await supabase
      .from('classrooms')
      .select('id, nama, guru_id');

    const classroomMap = new Map((classroomsData || []).map((c) => [c.id, c]));

    if (type === 'assessment') {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: users } = await supabase.from('users').select('id, nama');
      const userMap = new Map((users || []).map((u) => [u.id, u.nama]));

      setRows((assessments || []).map((a) => ({
        ...a,
        classroom_nama: classroomMap.get(a.classroom_id)?.nama || '-',
        guru_nama: userMap.get(classroomMap.get(a.classroom_id)?.guru_id) || '-',
      })));
    } else if (type === 'materi') {
      const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: users } = await supabase.from('users').select('id, nama');
      const userMap = new Map((users || []).map((u) => [u.id, u.nama]));

      setRows((materials || []).map((m) => ({
        ...m,
        classroom_nama: m.classroom_id ? classroomMap.get(m.classroom_id)?.nama || '-' : 'Global',
        guru_nama: m.classroom_id ? userMap.get(classroomMap.get(m.classroom_id)?.guru_id) || '-' : '-',
      })));
    } else {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      const assessmentIds = Array.from(new Set((submissions || []).map((s) => s.assessment_id)));
      const studentIds = Array.from(new Set((submissions || []).map((s) => s.student_id)));

      const { data: assessments } = assessmentIds.length
        ? await supabase.from('assessments').select('*').in('id', assessmentIds)
        : { data: [] as any[] };
      const { data: students } = studentIds.length
        ? await supabase.from('users').select('id, nama').in('id', studentIds)
        : { data: [] as any[] };

      const assessmentMap = new Map((assessments || []).map((a) => [a.id, a]));
      const studentMap = new Map((students || []).map((s) => [s.id, s.nama]));

      setRows((submissions || []).map((s) => {
        const assessment = assessmentMap.get(s.assessment_id);
        return {
          ...s,
          student_nama: studentMap.get(s.student_id) || '-',
          assessment_title: assessment?.title || '-',
          max_score: assessment?.max_score || 100,
          classroom_nama: assessment ? classroomMap.get(assessment.classroom_id)?.nama || '-' : '-',
        };
      }));
    }

    setLoading(false);
  };

  if (!authorized) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-red-400 font-medium">Akses ditolak. Halaman ini hanya untuk admin.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{TITLES[type]}</h1>
        <p className="text-sm text-dark-400 mt-1">Mode read-only — pantau seluruh data sekolah.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden overflow-x-auto">
          {type === 'assessment' && (
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>{['Judul', 'Tipe', 'Kelas', 'Guru', 'Deadline', 'Max'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm text-white font-medium">{r.title}</td>
                    <td className="px-6 py-4 text-sm text-dark-300 capitalize">{r.type}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.classroom_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.guru_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.deadline ? new Date(r.deadline).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.max_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(type === 'submission' || type === 'nilai') && (
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>{['Siswa', 'Assessment', 'Kelas', 'Tanggal', 'File', 'Nilai', 'Feedback'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm text-white font-medium">{r.student_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.assessment_title}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.classroom_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{new Date(r.submitted_at).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-sm">
                      {r.file_url ? (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          Lihat
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {r.score !== null && r.score !== undefined ? (
                        <span className="font-semibold text-white">{r.score}/{r.max_score}</span>
                      ) : (
                        <span className="text-dark-400">Belum dinilai</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-400 max-w-xs truncate">{r.feedback || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'materi' && (
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>{['Judul', 'Kelas', 'Guru', 'Tipe', 'Tautan', 'Tanggal'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm text-white font-medium">{r.title}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.classroom_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300">{r.guru_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-300 uppercase">{r.file_type || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {r.youtube_url || r.file_url ? (
                        <a href={r.youtube_url || r.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          Buka
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-300">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {rows.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada data</div>
          )}
        </div>
      )}
    </div>
  );
}
