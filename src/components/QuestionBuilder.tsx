'use client';

import { useState } from 'react';
import { AssessmentQuestion, QuestionType, MediaType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface QuestionBuilderProps {
  assessmentId: string;
  questions: AssessmentQuestion[];
  onQuestionsChange: (questions: AssessmentQuestion[]) => void;
}

export default function QuestionBuilder({ assessmentId, questions, onQuestionsChange }: QuestionBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const emptyQuestion = (): Omit<AssessmentQuestion, 'id' | 'assessment_id' | 'created_at'> => ({
    question_text: '',
    question_type: 'paragraph',
    options: [],
    correct_answer: '',
    media_url: '',
    media_type: undefined,
    order_index: questions.length,
  });

  const [draft, setDraft] = useState(emptyQuestion());
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const resetDraft = () => {
    setDraft(emptyQuestion());
    setEditIndex(null);
    setShowAddForm(false);
    setUploadingMedia(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Hanya file gambar atau video yang diizinkan');
      return;
    }

    setUploadingMedia(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `question-media/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from('materials').upload(fileName, file);

    if (error) {
      toast.error('Gagal upload media');
      setUploadingMedia(false);
      return;
    }

    const { data } = supabase.storage.from('materials').getPublicUrl(fileName);
    setDraft({
      ...draft,
      media_url: data.publicUrl,
      media_type: isImage ? 'image' : 'video',
    });
    setUploadingMedia(false);
    toast.success('Media berhasil diupload');
  };

  const handleSave = () => {
    if (!draft.question_text.trim()) {
      toast.error('Pertanyaan tidak boleh kosong');
      return;
    }

    if (draft.question_type === 'multiple_choice' && draft.options.length < 2) {
      toast.error('Pilihan ganda minimal 2 opsi');
      return;
    }

    let updated: AssessmentQuestion[];

    if (editIndex !== null) {
      updated = [...questions];
      updated[editIndex] = { ...updated[editIndex], ...draft };
    } else {
      const newQ: AssessmentQuestion = {
        ...draft,
        id: `temp-${Date.now()}`,
        assessment_id: assessmentId,
        created_at: new Date().toISOString(),
      };
      updated = [...questions, newQ];
    }

    onQuestionsChange(updated);
    resetDraft();
    toast.success(editIndex !== null ? 'Soal berhasil diupdate' : 'Soal berhasil ditambahkan');
  };

  const handleEdit = (index: number) => {
    const q = questions[index];
    setDraft({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      media_url: q.media_url || '',
      media_type: q.media_type,
      order_index: q.order_index,
    });
    setEditIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (index: number) => {
    if (!confirm('Yakin hapus soal ini?')) return;
    const updated = questions.filter((_, i) => i !== index);
    onQuestionsChange(updated);
    toast.success('Soal berhasil dihapus');
  };

  const addOption = () => {
    setDraft({ ...draft, options: [...draft.options, ''] });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...draft.options];
    newOptions[index] = value;
    setDraft({ ...draft, options: newOptions });
  };

  const removeOption = (index: number) => {
    setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) });
  };

  const moveOption = (from: number, to: number) => {
    if (to < 0 || to >= draft.options.length) return;
    const newOptions = [...draft.options];
    const [moved] = newOptions.splice(from, 1);
    newOptions.splice(to, 0, moved);
    setDraft({ ...draft, options: newOptions });
  };

  const getMediaIcon = (type?: MediaType) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'link': return '🔗';
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-300">Soal Assessment ({questions.length})</h3>
        <button
          type="button"
          onClick={() => { resetDraft(); setShowAddForm(true); }}
          className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah Soal
        </button>
      </div>

      {/* Daftar Soal */}
      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={q.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      Soal {index + 1}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      q.question_type === 'paragraph'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {q.question_type === 'paragraph' ? 'Isian' : 'Pilihan Ganda'}
                    </span>
                    {q.media_type && (
                      <span className="text-xs">{getMediaIcon(q.media_type)} {q.media_type}</span>
                    )}
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap">{q.question_text}</p>

                  {/* Media preview */}
                  {q.media_url && (
                    <div className="mt-2">
                      {q.media_type === 'image' && (
                        <img src={q.media_url} alt="Media soal" className="max-w-xs rounded-lg" />
                      )}
                      {q.media_type === 'video' && (
                        <div className="text-xs text-dark-400 mt-1">Video: <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{q.media_url}</a></div>
                      )}
                      {q.media_type === 'link' && (
                        <div className="text-xs text-dark-400 mt-1">Link: <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{q.media_url}</a></div>
                      )}
                    </div>
                  )}

                  {/* Options preview */}
                  {q.question_type === 'multiple_choice' && q.options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-xs px-2 py-1 rounded ${
                          q.correct_answer === opt
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/5 text-dark-400'
                        }`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'paragraph' && (
                    <div className="mt-2 text-xs text-dark-500 italic">
                      Jawaban: {q.correct_answer || '(opsional - skor manual)'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit soal"
                  >
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Hapus soal"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {questions.length === 0 && !showAddForm && (
        <div className="text-center py-6 text-dark-500 text-sm">
          Belum ada soal. Klik "Tambah Soal" untuk membuat soal manual.
        </div>
      )}

      {/* Form Tambah/Edit Soal */}
      {showAddForm && (
        <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              {editIndex !== null ? `Edit Soal ${editIndex + 1}` : `Tambah Soal ${questions.length + 1}`}
            </h4>
            <button type="button" onClick={resetDraft} className="text-dark-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tipe Soal */}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Tipe Soal</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, question_type: 'paragraph', options: [], correct_answer: '' })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  draft.question_type === 'paragraph'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-dark-400 hover:bg-white/10'
                }`}
              >
                📝 Isian (Paragraph)
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, question_type: 'multiple_choice', options: draft.options.length > 0 ? draft.options : ['', ''] })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  draft.question_type === 'multiple_choice'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-dark-400 hover:bg-white/10'
                }`}
              >
                🔘 Pilihan Ganda
              </button>
            </div>
          </div>

          {/* Pertanyaan */}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Pertanyaan</label>
            <textarea
              value={draft.question_text}
              onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-dark-500 outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Tulis pertanyaan di sini..."
            />
          </div>

          {/* Media (opsional) */}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Media (Opsional)</label>
            <div className="flex gap-2 mb-2">
              <select
                value={draft.media_type || ''}
                onChange={(e) => setDraft({ ...draft, media_type: (e.target.value || undefined) as MediaType })}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none"
              >
                <option value="">Tanpa Media</option>
                <option value="image">Gambar</option>
                <option value="video">Video</option>
                <option value="link">Link Eksternal</option>
              </select>
            </div>
            {draft.media_type && (draft.media_type === 'image' || draft.media_type === 'video') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm cursor-pointer hover:bg-blue-500/30 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingMedia ? 'Mengupload...' : 'Upload File'}
                    <input
                      type="file"
                      accept={draft.media_type === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleMediaUpload}
                      className="hidden"
                      disabled={uploadingMedia}
                    />
                  </label>
                  <span className="self-center text-xs text-dark-500">atau</span>
                  <input
                    type="url"
                    value={draft.media_url || ''}
                    onChange={(e) => setDraft({ ...draft, media_url: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-dark-500 outline-none focus:border-blue-500"
                    placeholder={draft.media_type === 'image' ? 'URL gambar' : 'URL video'}
                  />
                </div>
              </div>
            )}
            {draft.media_type === 'link' && (
              <input
                type="url"
                value={draft.media_url || ''}
                onChange={(e) => setDraft({ ...draft, media_url: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-dark-500 outline-none focus:border-blue-500"
                placeholder="URL link"
              />
            )}
            {draft.media_type === 'image' && draft.media_url && (
              <img src={draft.media_url} alt="Preview" className="mt-2 max-w-xs rounded-lg" />
            )}
            {draft.media_type === 'video' && draft.media_url && (
              <div className="mt-2">
                {draft.media_url.includes('youtube.com') || draft.media_url.includes('youtu.be') ? (
                  <div className="text-xs text-dark-400">YouTube: <a href={draft.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{draft.media_url}</a></div>
                ) : (
                  <video src={draft.media_url} controls className="max-w-xs rounded-lg" />
                )}
              </div>
            )}
          </div>

          {/* Jawaban berdasarkan tipe soal */}
          {draft.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Pilihan Jawaban</label>
              <div className="space-y-2">
                {draft.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-dark-400 w-6">{String.fromCharCode(65 + i)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-blue-500"
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, correct_answer: opt })}
                      className={`p-1.5 rounded-lg transition-colors ${
                        draft.correct_answer === opt
                          ? 'bg-green-500 text-white'
                          : 'bg-white/5 text-dark-400 hover:bg-white/10'
                      }`}
                      title={draft.correct_answer === opt ? 'Jawaban benar' : 'Tandai sebagai benar'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    {draft.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambah Opsi
              </button>
            </div>
          )}

          {draft.question_type === 'paragraph' && (
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Kunci Jawaban (Opsional)</label>
              <textarea
                value={draft.correct_answer || ''}
                onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-dark-500 outline-none focus:border-blue-500 resize-none"
                rows={2}
                placeholder="Kunci jawaban untuk referensi penilaian..."
              />
            </div>
          )}

          {/* Tombol Simpan/Batal */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetDraft}
              className="px-3 py-1.5 text-dark-300 hover:bg-white/10 rounded-lg text-sm"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              {editIndex !== null ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
