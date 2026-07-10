'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Assessment, Submission, Classroom } from '@/lib/types';
import toast from 'react-hot-toast';

export default function TugasPage() {
  const [assessments, setAssessments] = useState<(Assessment & { submission?: Submission; classroom_nama?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

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

    if (assessmentsData) {
      const enriched = assessmentsData.map((a) => ({
        ...a,
        submission: submissionsData?.find((s) => s.assessment_id === a.id),
        classroom_nama: classroomsRes.data?.find((c) => c.id === a.classroom_id)?.nama,
      }));
      setAssessments(enriched);
    }

    setLoading(false);
  };

  const handleSubmit = async (assessmentId: string, file: File) => {
    setUploading(assessmentId);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `submissions/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file);

    if (uploadError) {
      toast.error('Gagal upload file');
      setUploading(null);
      return;
    }

    const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);

    const { error } = await supabase.from('submissions').insert({
      assessment_id: assessmentId,
      student_id: (await supabase.auth.getUser()).data.user?.id || '',
      file_url: data.publicUrl,
      file_type: fileExt,
    });

    if (error) {
      toast.error('Gagal mengumpulkan tugas');
    } else {
      toast.success('Tugas berhasil dikumpulkan');
      fetchData();
    }

    setUploading(null);
  };

  const isPastDeadline = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'pretest': 'bg-blue-100 text-blue-700',
      'post-test': 'bg-purple-100 text-purple-700',
      'quiz': 'bg-green-100 text-green-700',
      'lkpd': 'bg-yellow-100 text-yellow-700',
      'tugas': 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tugas Saya</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(a.type)}`}>{a.type}</span>
                    <span className="text-xs text-gray-500">{a.classroom_nama}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>Max: {a.max_score} poin</span>
                    {a.deadline && (
                      <span className={isPastDeadline(a.deadline) && !a.submission ? 'text-red-600 font-medium' : ''}>
                        Deadline: {new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {a.submission ? (
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        ✓ Terkumpul
                      </span>
                      {a.submission.score !== null && a.submission.score !== undefined && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Nilai: </span>
                          <span className="text-lg font-bold text-indigo-600">{a.submission.score}</span>
                        </div>
                      )}
                      {a.submission.feedback && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs">{a.submission.feedback}</p>
                      )}
                    </div>
                  ) : (
                    !isPastDeadline(a.deadline || null) ? (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.ppt,.zip"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSubmit(a.id, file);
                          }}
                        />
                        <span className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                          {uploading === a.id ? 'Mengupload...' : 'Kumpulkan'}
                        </span>
                      </label>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                        Deadline Terlewat
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {assessments.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">Belum ada tugas</div>
          )}
        </div>
      )}
    </div>
  );
}
