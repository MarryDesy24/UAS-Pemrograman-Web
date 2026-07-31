'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Submission, Assessment } from '@/lib/types';

export default function NilaiPage() {
  const [submissions, setSubmissions] = useState<(Submission & { assessment_title?: string; assessment_max_score?: number; classroom_nama?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const { data: submissionsData } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user.user?.id || '')
      .order('submitted_at', { ascending: false });

    if (submissionsData) {
      const assessmentIds = submissionsData.map((s) => s.assessment_id);
      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('*')
        .in('id', assessmentIds.length > 0 ? assessmentIds : ['none']);

      const classroomIds = assessmentsData?.map((a) => a.classroom_id) || [];
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('*')
        .in('id', classroomIds.length > 0 ? classroomIds : ['none']);

      const enriched = submissionsData.map((s) => ({
        ...s,
        assessment_title: assessmentsData?.find((a) => a.id === s.assessment_id)?.title,
        assessment_max_score: assessmentsData?.find((a) => a.id === s.assessment_id)?.max_score,
        classroom_nama: classroomsData?.find((c) => c.id === assessmentsData?.find((a) => a.id === s.assessment_id)?.classroom_id)?.nama,
      }));

      setSubmissions(enriched);
    }

    setLoading(false);
  };

  const getScoreColor = (score: number | null, maxScore: number) => {
    if (score === null) return 'text-gray-400';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Nilai Saya</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {submissions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="glass-card">
                <p className="text-sm text-dark-400">Total Tugas</p>
                <p className="text-2xl font-bold text-white">{submissions.length}</p>
              </div>
              <div className="glass-card">
                <p className="text-sm text-dark-400">Sudah Dinilai</p>
                <p className="text-2xl font-bold text-green-600">
                  {submissions.filter((s) => s.score !== null).length}
                </p>
              </div>
              <div className="glass-card">
                <p className="text-sm text-dark-400">Rata-rata Nilai</p>
                <p className="text-2xl font-bold text-blue-400">
                  {submissions.filter((s) => s.score !== null).length > 0
                    ? Math.round(
                        submissions
                          .filter((s) => s.score !== null)
                          .reduce((acc, s) => acc + ((s.score || 0) / (s.assessment_max_score || 100)) * 100, 0) /
                          submissions.filter((s) => s.score !== null).length
                      )
                    : '-'}
                  {submissions.filter((s) => s.score !== null).length > 0 && '%'}
                </p>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Assessment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Kelas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nilai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((sub, index) => (
                  <tr key={sub.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-sm text-white">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{sub.assessment_title}</td>
                    <td className="px-6 py-4 text-sm text-dark-400">{sub.classroom_nama}</td>
                    <td className="px-6 py-4 text-sm text-dark-400">
                      {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      {sub.score !== null && sub.score !== undefined ? (
                        <span className={`text-lg font-bold ${getScoreColor(sub.score, sub.assessment_max_score || 100)}`}>
                          {sub.score}
                          <span className="text-sm font-normal text-dark-400">/{sub.assessment_max_score}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Belum dinilai</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-400 max-w-xs">
                      {sub.feedback || '-'}
                      {sub.rubric_scores && sub.rubric_scores.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          {sub.rubric_scores.map((r, i) => (
                            <div key={i} className="flex justify-between gap-3 text-xs">
                              <span className="text-dark-400 truncate">{r.criterion}</span>
                              <span className="font-medium text-white shrink-0">
                                {r.score}/{r.max_score}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {submissions.length === 0 && (
              <div className="text-center py-12 text-dark-400">Belum ada nilai</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
