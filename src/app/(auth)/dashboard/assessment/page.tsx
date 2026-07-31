'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Assessment, Classroom, AssessmentType, AssessmentQuestion, RubricCriterion } from '@/lib/types';
import QuestionBuilder from '@/components/QuestionBuilder';
import toast from 'react-hot-toast';

export default function AssessmentPage() {
  const [assessments, setAssessments] = useState<(Assessment & { classroom_nama?: string; question_count?: number })[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    classroom_id: '',
    type: 'tugas' as AssessmentType,
    title: '',
    description: '',
    deadline: '',
    max_score: 100,
    attachment_url: '',
  });
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<AssessmentQuestion[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricAssessment, setRubricAssessment] = useState<Assessment | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [rubricLoading, setRubricLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();

    const [assessmentsRes, classroomsRes] = await Promise.all([
      supabase.from('assessments').select('*').order('created_at', { ascending: false }),
      supabase.from('classrooms').select('*').eq('guru_id', user.user?.id || '').order('nama'),
    ]);

    if (assessmentsRes.data) {
      const enriched = await Promise.all(assessmentsRes.data.map(async (a) => {
        const { count } = await supabase
          .from('assessment_questions')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', a.id);
        return {
          ...a,
          classroom_nama: classroomsRes.data?.find((c) => c.id === a.classroom_id)?.nama,
          question_count: count || 0,
        };
      }));
      setAssessments(enriched);
    }

    setClassrooms(classroomsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      classroom_id: formData.classroom_id,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline || null,
      max_score: formData.max_score,
      attachment_url: formData.attachment_url || null,
    };

    let assessmentId: string | null = null;

    if (editingAssessment) {
      const { error } = await supabase.from('assessments').update(payload).eq('id', editingAssessment.id);
      if (error) {
        toast.error('Gagal mengupdate assessment');
        return;
      }
      assessmentId = editingAssessment.id;
      toast.success('Assessment berhasil diupdate');
    } else {
      const { data, error } = await supabase.from('assessments').insert(payload).select('id').single();
      if (error) {
        console.error('Assessment insert error:', error);
        toast.error(`Gagal: ${error.message}`);
        return;
      }
      assessmentId = data.id;
      toast.success('Assessment berhasil ditambahkan');
    }

    // Save questions
    if (assessmentId && questions.length > 0) {
      if (editingAssessment) {
        const { error: delError } = await supabase.from('assessment_questions').delete().eq('assessment_id', assessmentId);
        if (delError) console.error('Delete old questions error:', delError);
      }

      const questionsToInsert = questions.map((q, i) => ({
        assessment_id: assessmentId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer || null,
        media_url: q.media_url || null,
        media_type: q.media_type || null,
        order_index: i,
      }));

      const { error: qError } = await supabase.from('assessment_questions').insert(questionsToInsert);
      if (qError) {
        console.error('Questions insert error:', qError);
        toast.error(`Gagal menyimpan soal: ${qError.message}`);
      }
    }

    setShowModal(false);
    setEditingAssessment(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({ classroom_id: '', type: 'tugas', title: '', description: '', deadline: '', max_score: 100, attachment_url: '' });
    setQuestions([]);
  };

  const handleEdit = async (a: Assessment) => {
    setEditingAssessment(a);
    setFormData({
      classroom_id: a.classroom_id,
      type: a.type,
      title: a.title,
      description: a.description || '',
      deadline: a.deadline ? new Date(a.deadline).toISOString().slice(0, 16) : '',
      max_score: a.max_score,
      attachment_url: a.attachment_url || '',
    });

    const { data: existingQuestions } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', a.id)
      .order('order_index');

    setQuestions(existingQuestions || []);
    setShowModal(true);
  };

  const handleViewQuestions = async (assessmentId: string) => {
    if (selectedAssessment === assessmentId) {
      setSelectedAssessment(null);
      setDetailQuestions([]);
      return;
    }

    setDetailLoading(true);
    setSelectedAssessment(assessmentId);

    const { data } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('order_index');

    setDetailQuestions(data || []);
    setDetailLoading(false);
  };

  const openRubricModal = async (a: Assessment) => {
    setRubricAssessment(a);
    setRubricLoading(true);
    const { data } = await supabase
      .from('rubric_criteria')
      .select('*')
      .eq('assessment_id', a.id)
      .order('order_index');
    setRubricCriteria(data || []);
    setRubricLoading(false);
    setShowRubricModal(true);
  };

  const addRubricRow = () => {
    setRubricCriteria((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        assessment_id: rubricAssessment?.id || '',
        criterion: '',
        max_score: 10,
        order_index: prev.length,
        created_at: '',
      },
    ]);
  };

  const updateRubricRow = (id: string, field: 'criterion' | 'max_score', value: string | number) => {
    setRubricCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeRubricRow = (id: string) => {
    setRubricCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const saveRubric = async () => {
    if (!rubricAssessment) return;
    const valid = rubricCriteria.filter((c) => c.criterion.trim() !== '');

    const { error: delError } = await supabase.from('rubric_criteria').delete().eq('assessment_id', rubricAssessment.id);
    if (delError) {
      toast.error('Gagal menyimpan rubrik');
      return;
    }

    if (valid.length > 0) {
      const toInsert = valid.map((c, i) => ({
        assessment_id: rubricAssessment.id,
        criterion: c.criterion.trim(),
        max_score: Math.max(1, c.max_score || 0),
        order_index: i,
      }));
      const { error } = await supabase.from('rubric_criteria').insert(toInsert);
      if (error) {
        toast.error(`Gagal menyimpan rubrik: ${error.message}`);
        return;
      }
    }

    toast.success('Rubrik berhasil disimpan');
    setShowRubricModal(false);
    setRubricAssessment(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `assessments/${fileName}`;

    const { error } = await supabase.storage.from('materials').upload(filePath, file);

    if (error) {
      toast.error('Gagal upload lampiran');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
    setFormData({ ...formData, attachment_url: data.publicUrl });
    setUploading(false);
    toast.success('Lampiran berhasil diupload');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus assessment ini?')) return;
    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) {
      toast.error('Gagal menghapus assessment');
    } else {
      toast.success('Assessment berhasil dihapus');
      fetchData();
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Assessment</h1>
        <button
          onClick={() => { setEditingAssessment(null); resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Buat Assessment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div key={a.id} className="glass-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(a.type)}`}>
                      {a.type}
                    </span>
                    <span className="text-xs text-dark-500">{a.classroom_nama}</span>
                  </div>
                  <h3 className="font-semibold text-white">{a.title}</h3>
                  {a.description && <p className="text-sm text-dark-400 mt-1 line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                    {a.deadline && <span>Deadline: {new Date(a.deadline).toLocaleDateString('id-ID')}</span>}
                    <span>Max: {a.max_score}</span>
                    <span>{a.question_count || 0} soal</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewQuestions(a.id)}
                    className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    {selectedAssessment === a.id ? 'Tutup Soal' : 'Lihat Soal'}
                  </button>
                  <button onClick={() => openRubricModal(a)} className="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors">
                    Rubrik
                  </button>
                  <button onClick={() => handleEdit(a)} className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                    Hapus
                  </button>
                </div>
              </div>

              {selectedAssessment === a.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {detailLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : detailQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {detailQuestions.map((q, i) => (
                        <div key={q.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Soal {i + 1}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              q.question_type === 'paragraph' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {q.question_type === 'paragraph' ? 'Isian' : 'Pilihan Ganda'}
                            </span>
                            {q.media_type && <span className="text-xs">{q.media_type === 'image' ? '🖼️' : q.media_type === 'video' ? '🎥' : '🔗'}</span>}
                          </div>
                          <p className="text-sm text-white">{q.question_text}</p>
                          {q.media_url && q.media_type === 'image' && (
                            <img src={q.media_url} alt="" className="mt-2 max-w-xs rounded" />
                          )}
                          {q.question_type === 'multiple_choice' && q.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, j) => (
                                <div key={j} className={`text-xs px-2 py-1 rounded ${
                                  q.correct_answer === opt ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-dark-400'
                                }`}>
                                  {String.fromCharCode(65 + j)}. {opt} {q.correct_answer === opt && '✓'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-500 text-center py-4">Belum ada soal</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {assessments.length === 0 && (
            <div className="glass-card text-center py-12 text-dark-400">Belum ada assessment</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl my-8 mx-4">
            <h2 className="text-lg font-semibold mb-4">{editingAssessment ? 'Edit Assessment' : 'Buat Assessment'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Jenis</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as AssessmentType })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white">
                    <option value="pretest">Pretest</option>
                    <option value="post-test">Post-test</option>
                    <option value="quiz">Quiz</option>
                    <option value="lkpd">LKPD</option>
                    <option value="tugas">Tugas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">Max Nilai</label>
                  <input type="number" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" min={0} max={100} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Kelas</label>
                <select value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" required>
                  <option value="">Pilih Kelas</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-white" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Deadline</label>
                <input type="datetime-local" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Lampiran (Opsional)</label>
                <input type="file" onChange={handleFileUpload} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" accept=".pdf,.docx,.ppt,.xlsx,.zip" />
                {uploading && <p className="text-sm text-dark-400 mt-1">Mengupload...</p>}
                {formData.attachment_url && (
                  <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lampiran terupload
                    <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Lihat</a>
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                <QuestionBuilder
                  assessmentId={editingAssessment?.id || ''}
                  questions={questions}
                  onQuestionsChange={setQuestions}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">{editingAssessment ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Rubrik */}
      {showRubricModal && rubricAssessment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="glass-card w-full max-w-xl my-8 mx-4">
            <h2 className="text-lg font-semibold mb-1">Rubrik Penilaian</h2>
            <p className="text-sm text-dark-400 mb-4">{rubricAssessment.title}</p>

            {rubricLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {rubricCriteria.length === 0 && (
                  <p className="text-sm text-dark-400 text-center py-4">Belum ada kriteria. Tambahkan kriteria penilaian.</p>
                )}
                {rubricCriteria.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded shrink-0">K{i + 1}</span>
                    <input
                      type="text"
                      value={c.criterion}
                      onChange={(e) => updateRubricRow(c.id, 'criterion', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                      placeholder="Nama kriteria (contoh: Kelengkapan isi)"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        value={c.max_score}
                        onChange={(e) => updateRubricRow(c.id, 'max_score', parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                        min={1}
                        max={100}
                      />
                      <span className="text-xs text-dark-400">poin</span>
                    </div>
                    <button onClick={() => removeRubricRow(c.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-dark-400 hover:text-red-400 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={addRubricRow}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 text-sm"
              >
                + Tambah Kriteria
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setShowRubricModal(false); setRubricAssessment(null); }} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">
                  Batal
                </button>
                <button onClick={saveRubric} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Simpan Rubrik
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
