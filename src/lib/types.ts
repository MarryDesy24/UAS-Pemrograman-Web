export type UserRole = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string;
  created_at: string;
}

export interface Classroom {
  id: string;
  nama: string;
  kode: string;
  guru_id: string;
  subject_id: string;
  semester: string;
  tahun_ajaran: string;
  created_at: string;
}

export interface ClassroomMember {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
}

export interface Module {
  id: string;
  subject_id: string;
  teacher_id: string;
  classroom_id?: string;
  title: string;
  description?: string;
  learning_objectives?: string;
  prerequisite?: string;
  materi_pokok?: string;
  pertanyaan_pemantik?: string;
  references?: string;
  youtube_url?: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  file_type?: 'pdf' | 'docx' | 'ppt' | 'youtube';
  file_url?: string;
  youtube_url?: string;
  created_at: string;
}

export type AssessmentType = 'pretest' | 'post-test' | 'quiz' | 'lkpd' | 'tugas';

export interface Assessment {
  id: string;
  module_id: string;
  classroom_id: string;
  type: AssessmentType;
  title: string;
  description?: string;
  deadline?: string;
  max_score: number;
  attachment_url?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assessment_id: string;
  student_id: string;
  file_url?: string;
  file_type?: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
}

export interface Announcement {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at'>;
        Update: Partial<Omit<Subject, 'id' | 'created_at'>>;
      };
      classrooms: {
        Row: Classroom;
        Insert: Omit<Classroom, 'id' | 'created_at'>;
        Update: Partial<Omit<Classroom, 'id' | 'created_at'>>;
      };
      classroom_members: {
        Row: ClassroomMember;
        Insert: Omit<ClassroomMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<ClassroomMember, 'id' | 'joined_at'>>;
      };
      modules: {
        Row: Module;
        Insert: Omit<Module, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>;
      };
      materials: {
        Row: Material;
        Insert: Omit<Material, 'id' | 'created_at'>;
        Update: Partial<Omit<Material, 'id' | 'created_at'>>;
      };
      assessments: {
        Row: Assessment;
        Insert: Omit<Assessment, 'id' | 'created_at'>;
        Update: Partial<Omit<Assessment, 'id' | 'created_at'>>;
      };
      submissions: {
        Row: Submission;
        Insert: Omit<Submission, 'id' | 'submitted_at'>;
        Update: Partial<Omit<Submission, 'id' | 'submitted_at'>>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, 'id' | 'created_at'>;
        Update: Partial<Omit<Announcement, 'id' | 'created_at'>>;
      };
    };
  };
}
