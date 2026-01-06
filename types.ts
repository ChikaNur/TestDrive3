
export type Role = 'ADMIN' | 'STUDENT' | 'DOSEN';

export interface Student {
  nim: string;
  name: string;
  photoUrl?: string; // Base64
  nowa?: string;
  grades?: {
    scoreOral: number;
    scoreCoding: number;
    scoreTotal: number;
    feedback: string;
  };
}

export interface Team {
  id: string; // courseCode
  team_ref: string; // unique key "course|class|no_tim"
  name: string; // no_tim
  course: string;
  className: string;
  projectTitle: string;
  leaderId: string;
  members: Student[];
  isActive: boolean;
  extractedFiles?: CodeFile[];
}

export interface User {
  nim?: string;
  kodedosen?: string;
  name: string;
  role: Role;
  photoUrl?: string;
  nowa?: string;
}

export interface CodeFile {
  name: string;
  content: string;
  language: string;
}

export interface CourseConfig {
  name: string;
  code?: string;
  languagePriority: string[];
  projectType: string;
  uiFramework: string;
  appFramework: string;
  qtyEasy: number;
  qtyMedium: number;
  qtyHard: number;
  qtyCodingEasy: number;
  qtyCodingMedium: number;
  qtyCodingHard: number;
  timeOralMin: number;
  timeCodingMin: number;
  weightOral: number;
  weightCode: number;
  instrOral?: string; // Instruksi khusus uji lisan
  instrCode?: string; // Instruksi khusus uji coding
  aiDetailLevel: number; // 1: Basic, 2: Standard, 3: Expert
}

export interface CourseItem {
  code: string;
  name: string;
}

export enum Difficulty {
  Easy = 'Mudah',
  Medium = 'Sedang',
  Hard = 'Sulit',
  Coding = 'Test Coding'
}

export interface Question {
  id: string;
  type: 'ORAL' | 'CODING';
  fileSource?: string;
  snippet?: string;
  difficulty: Difficulty;
  aiPrompt: string;
  aiDetailLevel?: number; // Pass this context to evaluation
}

export interface ExamResult {
  questionId: string;
  type: 'ORAL' | 'CODING';
  studentAnswer: string;
  score: number;
  feedback: string;
}

export interface TeamData {
  className: string;
  members: Student[];
}

export type AppStep = 'LANDING' | 'AUTH' | 'ADMIN_DASHBOARD' | 'STUDENT_DASHBOARD' | 'TEAM_REGISTER' | 'EXAM_RUNNER';
