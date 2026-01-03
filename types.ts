
export enum AssessmentType {
  DRAWING = 'DESENHO',
  WRITING = 'ESCRITA',
  PHONOLOGICAL = 'FONOLOGICA',
  MEMORY = 'MEMORIA',
  MATEMATICA = 'MATEMATICA',
  READING = 'LEITURA'
}

export enum DrawingPhase {
  GARATUJA_DESORDENADA = 'Garatuja Desordenada',
  GARATUJA_ORDENADA = 'Garatuja Ordenada',
  PRE_ESQUEMATISMO = 'Pré-Esquematismo',
  ESQUEMATISMO = 'Esquematismo',
  REALISMO = 'Realismo',
  PSEUDO_NATURALISMO = 'Pseudo-Naturalismo'
}

export enum WritingPhase {
  PRE_ALFABETICA = 'Pré-Alfabética',
  ALFABETICA_PARCIAL = 'Alfabética Parcial',
  ALFABETICA_COMPLETA = 'Alfabética Completa',
  ALFABETICA_CONSOLIDADA = 'Alfabética Consolidada'
}

export type AssessmentPeriod = 'Inicial' | '1º Bim' | '2º Bim' | '3º Bim' | '4º Bim';

export interface AssessmentResult {
  id: string;
  studentId: string;
  date: string; // ISO date
  type: AssessmentType;
  period?: AssessmentPeriod; // Período da sondagem
  phase?: string; // For Drawing/Writing
  situation?: string; // Situação (Normal, Atrasado, Adiantado)
  score?: number; // For Math/Memory/Phonological/Reading
  maxScore?: number;
  notes?: string;
  imageUrl?: string; // For uploaded evidence
  aiAnalysis?: string; // Raw AI feedback
  confidence?: number;
  summary?: string;
  reasoning?: string;
  recommendedActivities?: string;
  markers?: Array<{ label: string, description: string, match: boolean }>;
}

export interface Student {
  id: string;
  code: string; // Código do aluno
  name: string;
  birthDate: string; // Data de nascimento (ISO string)
  grade: string; // Nome da turma
  series: string; // Nome da série
  schoolId?: string; // ID da escola vinculada
  observations?: string; // Novo campo de observações pedagógicas
}

export interface Grade {
  id: string;
  name: string;
}

export interface School {
  id: string;
  code: string;
  name: string;
}

export interface Series {
  id: string;
  name: string;
}

// Math specific detailed breakdown
export interface MathAssessmentDetails {
  counting: boolean;
  numberRecognition: boolean;
  sizeComparison: boolean;
  shapes: boolean;
  patterns: boolean;
  correspondence: boolean;
  quantity: boolean;
  classification: boolean;
  spatial: boolean;
  simpleMath: boolean;
}
