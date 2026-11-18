'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { Assessment, Classroom, Material, Submission, User } from '@/lib/types';
import toast from 'react-hot-toast';

interface ClassProgress {
  classroom: Classroom;
  students: number;
  materials: number;
  assessments: number;
  completedMaterials: number;
  submitted: number;
  graded: number;
  averageScore: number;
}

export default function ProgressPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<ClassProgress[]>([]);
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

    let classrooms: Classroom[] = [];

    if (current.role === 'admin') {
      const { data } = await supabase.from('classrooms').select('*').order('nama');
      classrooms = data || [];
    } else if (current.role === 'guru') {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('guru_id', current.id)
        .order('nama');
      classrooms = data || [];
    } else {
      const { data: member } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('student_id', current.id);
      const ids = (member || []).map((m) => m.classroom_id);
      if (ids.length > 0) {
        const { data } = await supabase.from('classrooms').select('*').in('id', ids).order('nama');
        classrooms = data || [];
      }
    }

    const classroomIds = classrooms.map((c) => c.id);

    if (classroomIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [materialsRes, assessmentsRes, membersRes] = await Promise.all([
      supabase.from('materials').select('*').in('classroom_id', classroomIds),
      supabase.from('assessments').select('*').in('classroom_id', classroomIds),
      supabase.from('classroom_members').select('*').in('classroom_id', classroomIds),
    ]);

    const materials: Material[] = materialsRes.data || [];
    const assessments: Assessment[] = assessmentsRes.data || [];
    const members = membersRes.data || [];

    const materialIds = materials.map((m) => m.id);
    const assessmentIds = assessments.map((a) => a.id);

    const progressQuery = materialIds.length
      ? supabase.from('materials_progress').select('*').in('material_id', materialIds)
      : Promise.resolve({ data: [] as any[] });

    const submissionQuery = assessmentIds.length
      ? supabase.from('submissions').select('*').in('assessment_id', assessmentIds)
      : Promise.resolve({ data: [] as any[] });

    const [progressRes, submissionsRes] = await Promise.all([progressQuery, submissionQuery]);

    let progressData = progressRes.data || [];
    let submissions: Submission[] = submissionsRes.data || [];

    if (current.role === 'siswa') {
      progressData = progressData.filter((p: any) => p.student_id === current.id);
      submissions = submissions.filter((s) => s.student_id === current.id);
    }

    const result: ClassProgress[] = classrooms.map((classroom) => {
      const classMaterials = materials.filter((m) => m.classroom_id === classroom.id);
      const classAssessments = assessments.filter((a) => a.classroom_id === classroom.id);
      const classMaterialIds = new Set(classMaterials.map((m) => m.id));
      const classAssessmentIds = new Set(classAssessments.map((a) => a.id));
      const classStudentIds = new Set(
        members.filter((m) => m.classroom_id === classroom.id).map((m) => m.student_id)
      );

      const completed = progressData.filter((p: any) => classMaterialIds.has(p.material_id));
      const subs = submissions.filter((s) => classAssessmentIds.has(s.assessment_id));
      const graded = subs.filter((s) => s.score !== null && s.score !== undefined);

      const averageScore = graded.length > 0
        ? Math.round(
            graded.reduce((acc, s) => {
              const assessment = classAssessments.find((a) => a.id === s.assessment_id);
              return acc + ((s.score || 0) / (assessment?.max_score || 100)) * 100;
            }, 0) / graded.length
          )
        : 0;

      return {
        classroom,
        students: current.role === 'siswa' ? 1 : classStudentIds.size,
        materials: classMaterials.length,
        assessments: classAssessments.length,
        completedMaterials: completed.length,
        submitted: subs.length,
        graded: graded.length,
        averageScore,
      };
    });

    setRows(result);
    setLoading(false);
  };

  const materialPercent = (row: ClassProgress) => {
    const total = user?.role === 'siswa' ? row.materials : row.materials * row.students;
    return total > 0 ? Math.min(100, Math.round((row.completedMaterials / total) * 100)) : 0;
  };

  const submissionPercent = (row: ClassProgress) => {
    const total = user?.role === 'siswa' ? row.assessments : row.assessments * row.students;
    return total > 0 ? Math.min(100, Math.round((row.submitted / total) * 100)) : 0;
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
        <h1 className="text-2xl font-bold text-white">Progress Belajar</h1>
        <p className="text-sm text-dark-400 mt-1">
          {user?.role === 'siswa'
            ? 'Progres belajar Anda di setiap kelas.'
            : user?.role === 'guru'
              ? 'Progres kelas yang Anda ampu.'
              : 'Progres seluruh kelas di sekolah.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.classroom.id} className="glass-card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-white">{row.classroom.nama}</h2>
                <p className="text-xs text-dark-400">
                  {user?.role === 'siswa' ? 'Kelas diikuti' : `${row.students} siswa`} · {row.materials} materi · {row.assessments} assessment
                </p>
              </div>
              <span className="text-sm font-semibold text-blue-400">
                {row.averageScore > 0 ? `${row.averageScore}%` : '-'}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300">Materi selesai</span>
                <span className="text-white">{materialPercent(row)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${materialPercent(row)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300">Tugas terkumpul</span>
                <span className="text-white">{submissionPercent(row)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-400" style={{ width: `${submissionPercent(row)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
              <div>
                <p className="text-lg font-bold text-white">{row.completedMaterials}</p>
                <p className="text-xs text-dark-400">Materi selesai</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{row.submitted}</p>
                <p className="text-xs text-dark-400">Terkumpul</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{row.graded}</p>
                <p className="text-xs text-dark-400">Dinilai</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="glass-card text-center py-12 text-dark-400">Belum ada data kelas</div>
      )}
    </div>
  );
}
