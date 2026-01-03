
import { Student, AssessmentResult, Grade, Series, School } from '../types';

/**
 * Este serviço abstrai a persistência de dados.
 * Utiliza LocalStorage para manter a funcionalidade offline.
 */

const KEYS = {
  STUDENTS: 'pedagogia_students',
  ASSESSMENTS: 'pedagogia_assessments',
  GRADES: 'pedagogia_grades',
  SERIES: 'pedagogia_series'
};

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storageService = {
  // Alunos
  getStudents: async (): Promise<Student[]> => {
    return getLocal<Student>(KEYS.STUDENTS);
  },
  saveStudents: async (students: Student[]) => {
    saveLocal(KEYS.STUDENTS, students);
  },

  // Sondagens
  getAssessments: async (): Promise<AssessmentResult[]> => {
    return getLocal<AssessmentResult>(KEYS.ASSESSMENTS);
  },
  saveAssessments: async (assessments: AssessmentResult[]) => {
    saveLocal(KEYS.ASSESSMENTS, assessments);
  },

  // Turmas
  getGrades: async (): Promise<Grade[]> => {
    return getLocal<Grade>(KEYS.GRADES);
  },
  saveGrades: async (grades: Grade[]) => {
    saveLocal(KEYS.GRADES, grades);
  },

  // Séries
  getSeries: async (): Promise<Series[]> => {
    return getLocal<Series>(KEYS.SERIES);
  },
  saveSeries: async (series: Series[]) => {
    saveLocal(KEYS.SERIES, series);
  },

  // Escolas
  getSchools: async (): Promise<School[]> => {
    return getLocal<School>('pedagogia_schools');
  },
  saveSchools: async (schools: School[]) => {
    saveLocal('pedagogia_schools', schools);
  }
};
