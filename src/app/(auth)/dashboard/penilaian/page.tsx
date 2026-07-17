'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Submission } from '@/lib/types';
import toast from 'react-hot-toast';

interface EnrichedSubmission extends Submission {
  assessment_title?: string;
  assessment_max_score?: number;
  student_nama?: string;
  student_email?: string;
  answers?: { question_id: string; question_text: string; question_type: string; answer: string; correct_answer: string | null; options: string[] }[];
}

export default function PenilaianPage() {
  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<EnrichedSubmission | null>(null);
  const [formData, setFormData] = useState({ score: 0, feedback: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    // Get ALL submissions (RLS should handle access)
    const { data: subs, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (subError) {
      console.error('Submissions error:', subError);
      setLoading(false);
      return;
    }

    // Get all assessments
    const assessmentIds = Array.from(new Set(subs?.map(s => s.assessment_id) || []));
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, title, max_score')
      .in('id', assessmentIds.length > 0 ? assessmentIds : ['___none___']);

    // Get all students
    const studentIds = Array.from(new Set(subs?.map(s => s.student_id) || []));
    const { data: students } = await supabase
      .from('users')
      .select('id, nama, email')
      .in('id', studentIds.length > 0 ? studentIds : ['___none___']);

    // Get answers for each submission
    const enriched = await Promise.all((subs || []).map(async (s) => {
      const { data: answersData } = await supabase
        .from('student_answers')
        .select('question_id, answer')
        .eq('assessment_id', s.assessment_id)
        .eq('student_id', s.student_id);

      const qIds = answersData?.map(a => a.question_id) || [];
      const { data: questions } = await supabase
        .from('assessment_questions')
        .select('id, question_text, question_type, correct_answer, options')
        .in('id', qIds.length > 0 ? qIds : ['___none___']);

      const answers = answersData?.map(a => {
        const q = questions?.find(qq => qq.id === a.question_id);
        return {
          question_id: a.question_id,
          question_text: q?.question_text || '-',
          question_type: q?.question_type || '-',
          answer: a.answer || '-',
          correct_answer: q?.correct_answer || null,
          options: q?.options || [],
        };
      }) || [];

      return {
        ...s,
        assessment_title: assessments?.find(a => a.id === s.assessment_id)?.title || '-',
        assessment_max_score: assessments?.find(a => a.id === s.assessment_id)?.max_score || 100,
        student_nama: students?.find(st => st.id === s.student_id)?.nama || '-',
        student_email: students?.find(st => st.id === s.student_id)?.email || '-',
        answers,
      };
    }));

    setSubmissions(enriched);
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
      toast.error('Gagal menyimpan penilaian');
    } else {
      toast.success('Penilaian berhasil disimpan');
      setShowModal(false);
      setSelectedSubmission(null);
      fetchData();
    }
  };

  const openDetailModal = (sub: EnrichedSubmission) => {
    setSelectedSubmission(sub);
    setFormData({ score: sub.score || 0, feedback: sub.feedback || '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Penilaian</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Nilai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{sub.student_nama}</div>
                    <div className="text-xs text-dark-400">{sub.student_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-400">{sub.assessment_title}</td>
                  <td className="px-6 py-4 text-sm text-dark-400">
                    {new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    {sub.score !== null && sub.score !== undefined ? (
                      <span className="text-green-400 font-bold">{sub.score}</span>
                    ) : (
                      <span className="text-yellow-400 text-sm">Auto-graded</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => openDetailModal(sub)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs">
                      Lihat Jawaban
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl my-8 mx-4">
            <h2 className="text-lg font-semibold text-white mb-1">Detail Jawaban</h2>
            <p className="text-sm text-dark-400 mb-4">{selectedSubmission.student_nama} - {selectedSubmission.assessment_title}</p>

            {selectedSubmission.answers && selectedSubmission.answers.length > 0 ? (
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {selectedSubmission.answers.map((a, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Soal {i + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${a.question_type === 'paragraph' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {a.question_type === 'paragraph' ? 'Isian' : 'Pilihan Ganda'}
                      </span>
                      {a.correct_answer && a.answer === a.correct_answer && <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Benar</span>}
                      {a.correct_answer && a.answer !== a.correct_answer && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">Salah</span>}
                    </div>
                    <p className="text-sm text-white mb-2">{a.question_text}</p>
                    <div className="text-sm"><span className="text-dark-400">Jawaban: </span><span className={`font-medium ${a.correct_answer && a.answer === a.correct_answer ? 'text-green-400' : 'text-white'}`}>{a.answer || '(kosong)'}</span></div>
                    {a.correct_answer && <div className="text-sm mt-1"><span className="text-dark-400">Kunci: </span><span className="text-green-400 font-medium">{a.correct_answer}</span></div>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-dark-400 mb-6">Tidak ada jawaban soal</p>}

            <form onSubmit={handleGrade} className="space-y-4 border-t border-white/10 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Nilai (Maks: {selectedSubmission.assessment_max_score})</label>
                  <input type="number" value={formData.score} onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" min={0} max={selectedSubmission.assessment_max_score || 100} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Feedback</label>
                  <input type="text" value={formData.feedback} onChange={(e) => setFormData({ ...formData, feedback: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="Feedback" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Tutup</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Simpan Nilai</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
