'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Assessment, Submission, AssessmentQuestion } from '@/lib/types';
import ExamTaker from '@/components/ExamTaker';
import toast from 'react-hot-toast';

export default function TugasPage() {
  const [assessments, setAssessments] = useState<(Assessment & { submission?: Submission; classroom_nama?: string; has_questions?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const [memberRes, classroomsRes] = await Promise.all([
      supabase.from('classroom_members').select('classroom_id').eq('student_id', user.user?.id || ''),
      supabase.from('classrooms').select('*'),
    ]);

    const classroomIds = memberRes.data?.map((m) => m.classroom_id) || [];

    const { data: assessmentsData } = await supabase
      .from('assessments')
      .select('*')
      .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['none'])
      .order('deadline', { ascending: true });

    const { data: submissionsData } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user.user?.id || '');

    // Check which assessments have questions
    const assessmentsWithQuestions = await Promise.all(
      (assessmentsData || []).map(async (a) => {
        const { count } = await supabase
          .from('assessment_questions')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', a.id);
        return {
          ...a,
          submission: submissionsData?.find((s) => s.assessment_id === a.id),
          classroom_nama: classroomsRes.data?.find((c) => c.id === a.classroom_id)?.nama,
          has_questions: (count || 0) > 0,
        };
      })
    );

    setAssessments(assessmentsWithQuestions);
    setLoading(false);
  };

  const isPastDeadline = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'pretest': 'bg-blue-500/20 text-blue-400',
      'post-test': 'bg-purple-500/20 text-purple-400',
      'quiz': 'bg-green-500/20 text-green-400',
      'lkpd': 'bg-yellow-500/20 text-yellow-400',
      'tugas': 'bg-orange-500/20 text-orange-400',
    };
    return colors[type] || 'bg-white/10 text-dark-400';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Tugas Saya</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => (
            <div key={a.id} className="glass-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(a.type)}`}>{a.type}</span>
                    <span className="text-xs text-dark-400">{a.classroom_nama}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-white">{a.title}</h3>
                  <p className="text-sm text-dark-400 mt-1">{a.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-dark-400">
                    <span>Max: {a.max_score} poin</span>
                    {a.deadline && (
                      <span className={isPastDeadline(a.deadline) && !a.submission ? 'text-red-400 font-medium' : ''}>
                        Deadline: {new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {a.submission ? (
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                        ✓ Terkumpul
                      </span>
                      {a.submission.score !== null && a.submission.score !== undefined && (
                        <div className="mt-2">
                          <span className="text-sm text-dark-400">Nilai: </span>
                          <span className="text-lg font-bold text-blue-400">{a.submission.score}</span>
                        </div>
                      )}
                      {a.submission.feedback && (
                        <p className="text-xs text-dark-400 mt-1 max-w-xs">{a.submission.feedback}</p>
                      )}
                    </div>
                  ) : (
                    !isPastDeadline(a.deadline || null) ? (
                      a.has_questions ? (
                        <button
                          onClick={() => setSelectedAssessment(a)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Kerjakan
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-dark-400">
          Menunggu soal
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                        Deadline Terlewat
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {assessments.length === 0 && (
            <div className="text-center py-12 text-dark-400 glass-card">Belum ada tugas</div>
          )}
        </div>
      )}

      {/* Exam Taker Modal */}
      {selectedAssessment && (
        <ExamTaker
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          onSubmit={() => {
            setSelectedAssessment(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
