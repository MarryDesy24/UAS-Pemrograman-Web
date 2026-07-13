'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Submission, Assessment } from '@/lib/types';
import toast from 'react-hot-toast';

export default function PenilaianPage() {
  const [submissions, setSubmissions] = useState<(Submission & { assessment_title?: string; student_nama?: string; assessment_max_score?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<(Submission & { assessment_title?: string; student_nama?: string; assessment_max_score?: number }) | null>(null);
  const [formData, setFormData] = useState({ score: 0, feedback: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const { data: modulesData } = await supabase
      .from('modules')
      .select('id')
      .eq('teacher_id', user.user?.id || '');

    const moduleIds = modulesData?.map((m) => m.id) || [];

    const { data: assessmentsData } = await supabase
      .from('assessments')
      .select('*')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['none']);

    const assessmentIds = assessmentsData?.map((a) => a.id) || [];

    const { data: submissionsData } = await supabase
      .from('submissions')
      .select('*')
      .in('assessment_id', assessmentIds.length > 0 ? assessmentIds : ['none'])
      .order('submitted_at', { ascending: false });

    if (submissionsData) {
      const enriched = submissionsData.map((s) => ({
        ...s,
        assessment_title: assessmentsData?.find((a) => a.id === s.assessment_id)?.title,
        assessment_max_score: assessmentsData?.find((a) => a.id === s.assessment_id)?.max_score,
      }));

      const studentIds = enriched.map((s) => s.student_id);
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, nama')
        .in('id', studentIds.length > 0 ? studentIds : ['none']);

      const final = enriched.map((s) => ({
        ...s,
        student_nama: studentsData?.find((st) => st.id === s.student_id)?.nama,
      }));

      setSubmissions(final);
    }

    setLoading(false);
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const { error } = await supabase
      .from('submissions')
      .update({
        score: formData.score,
        feedback: formData.feedback,
        graded_at: new Date().toISOString(),
        graded_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      toast.error('Gagal memberikan penilaian');
    } else {
      toast.success('Penilaian berhasil disimpan');
      setShowModal(false);
      setSelectedSubmission(null);
      fetchData();
    }
  };

  const openGradeModal = (sub: Submission & { assessment_title?: string; student_nama?: string; assessment_max_score?: number }) => {
    setSelectedSubmission(sub);
    setFormData({ score: sub.score || 0, feedback: sub.feedback || '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Penilaian</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-sm font-medium text-white">{sub.student_nama}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">{sub.assessment_title}</td>
                  <td className="px-6 py-4 text-sm">
                    {sub.file_url ? (
                      <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Lihat File</a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-400">
                    {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    {sub.score !== null && sub.score !== undefined ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Dinilai: {sub.score}</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Belum Dinilai</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openGradeModal(sub)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {sub.score !== null && sub.score !== undefined ? 'Edit Nilai' : 'Beri Nilai'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {submissions.length === 0 && (
            <div className="text-center py-12 text-dark-400">Belum ada pengumpulan tugas</div>
          )}
        </div>
      )}

      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Penilaian</h2>
            <p className="text-sm text-dark-400 mb-4">
              {selectedSubmission.student_nama} - {selectedSubmission.assessment_title}
            </p>

            {selectedSubmission.file_url && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg">
                <a href={selectedSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm">
                  📎 Lihat File Jawaban
                </a>
              </div>
            )}

            <form onSubmit={handleGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Nilai (Maks: {selectedSubmission.assessment_max_score})
                </label>
                <input
                  type="number"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  min={0}
                  max={selectedSubmission.assessment_max_score || 100}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Feedback</label>
                <textarea
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Berikan feedback untuk siswa..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
