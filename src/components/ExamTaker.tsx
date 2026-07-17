'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Assessment, AssessmentQuestion } from '@/lib/types';
import toast from 'react-hot-toast';

interface ExamTakerProps {
  assessment: Assessment;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ExamTaker({ assessment, onClose, onSubmit }: ExamTakerProps) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('order_index');

    if (data) {
      setQuestions(data);
      // Load existing answers if any
      const { data: user } = await supabase.auth.getUser();
      const { data: existingAnswers } = await supabase
        .from('student_answers')
        .select('question_id, answer')
        .eq('assessment_id', assessment.id)
        .eq('student_id', user.user?.id || '');

      if (existingAnswers) {
        const answerMap: Record<string, string> = {};
        existingAnswers.forEach((a) => { answerMap[a.question_id] = a.answer; });
        setAnswers(answerMap);
      }
    }
    setLoading(false);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setSubmitting(true);

    // Delete existing answers first
    await supabase
      .from('student_answers')
      .delete()
      .eq('assessment_id', assessment.id)
      .eq('student_id', user.user.id);

    // Insert all answers
    const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
      assessment_id: assessment.id,
      student_id: user.user.id,
      question_id: questionId,
      answer,
    }));

    if (answersToInsert.length > 0) {
      const { error } = await supabase.from('student_answers').insert(answersToInsert);
      if (error) {
        console.error('Error saving answers:', error);
        toast.error(`Gagal menyimpan jawaban: ${error.message}`);
        setSubmitting(false);
        return;
      }
    }

    // Auto-score for multiple choice
    let score = 0;
    let totalQuestions = questions.length;
    questions.forEach((q) => {
      if (q.question_type === 'multiple_choice' && q.correct_answer && answers[q.id] === q.correct_answer) {
        score += Math.round(assessment.max_score / totalQuestions);
      }
    });

    // Check if submission already exists
    const { data: existingSub } = await supabase
      .from('submissions')
      .select('id')
      .eq('assessment_id', assessment.id)
      .eq('student_id', user.user.id)
      .maybeSingle();

    if (existingSub) {
      // Update existing submission
      const { error: updateError } = await supabase.from('submissions').update({
        score,
        feedback: `Auto-graded: ${score}/${assessment.max_score}`,
        graded_at: new Date().toISOString(),
      }).eq('id', existingSub.id);
      if (updateError) console.error('Update submission error:', updateError);
    } else {
      // Create new submission
      const { error: insertError } = await supabase.from('submissions').insert({
        assessment_id: assessment.id,
        student_id: user.user.id,
        score,
        feedback: `Auto-graded: ${score}/${assessment.max_score}`,
        graded_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Insert submission error:', insertError);
        toast.error(`Gagal menyimpan: ${insertError.message}`);
        setSubmitting(false);
        return;
      }
    }

    toast.success(`Jawaban berhasil dikumpulkan! Nilai: ${score}`);
    setSubmitting(false);
    onSubmit();
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-card w-full max-w-2xl mx-4">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
      <div className="glass-card w-full max-w-3xl mx-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{assessment.title}</h2>
            <p className="text-sm text-dark-400">{assessment.type} &middot; Max {assessment.max_score} poin</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-dark-400 mb-2">
            <span>Soal {currentQuestion + 1} dari {totalQuestions}</span>
            <span>{answeredCount}/{totalQuestions} terjawab</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
          </div>
        </div>

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                i === currentQuestion
                  ? 'bg-blue-500 text-white'
                  : answers[q.id]
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-dark-400 hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current Question */}
        {questions[currentQuestion] && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                Soal {currentQuestion + 1}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                questions[currentQuestion].question_type === 'paragraph'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {questions[currentQuestion].question_type === 'paragraph' ? 'Isian' : 'Pilihan Ganda'}
              </span>
            </div>

            <p className="text-white text-lg mb-4 whitespace-pre-wrap">{questions[currentQuestion].question_text}</p>

            {questions[currentQuestion].media_url && questions[currentQuestion].media_type === 'image' && (
              <img src={questions[currentQuestion].media_url} alt="Media soal" className="max-w-full rounded-lg mb-4" />
            )}

            {questions[currentQuestion].media_url && questions[currentQuestion].media_type === 'video' && (
              <div className="mb-4">
                {questions[currentQuestion].media_url.includes('youtube') || questions[currentQuestion].media_url.includes('youtu.be') ? (
                  <a href={questions[currentQuestion].media_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    🎥 Lihat Video YouTube
                  </a>
                ) : (
                  <video src={questions[currentQuestion].media_url} controls className="max-w-full rounded-lg" />
                )}
              </div>
            )}

            {/* Answer Input */}
            {questions[currentQuestion].question_type === 'multiple_choice' && (
              <div className="space-y-2">
                {questions[currentQuestion].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(questions[currentQuestion].id, opt)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      answers[questions[currentQuestion].id] === opt
                        ? 'bg-blue-500/20 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-dark-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-medium mr-3">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {questions[currentQuestion].question_type === 'paragraph' && (
              <textarea
                value={answers[questions[currentQuestion].id] || ''}
                onChange={(e) => handleAnswer(questions[currentQuestion].id, e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-dark-500 outline-none focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Tulis jawaban Anda di sini..."
              />
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-white/5 text-dark-300 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          {currentQuestion < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Selanjutnya
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Kumpulkan
            </button>
          )}
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Kumpulkan Jawaban?</h3>
            <p className="text-sm text-dark-400 mb-4">
              Anda telah menjawab {answeredCount} dari {totalQuestions} soal.
              {answeredCount < totalQuestions && (
                <span className="text-yellow-400"> Masih ada {totalQuestions - answeredCount} soal yang belum dijawab.</span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-dark-300 hover:bg-white/10 rounded-lg">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {submitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
