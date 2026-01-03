
import { supabase } from './supabaseClient';
import { Student, AssessmentResult, Grade, Series, School, AssessmentType } from '../types';

// Interfaces matching the database schema exactly
interface DB_Escola {
    codigo: string;
    nome: string;
}

interface DB_Serie {
    serie: string;
}

interface DB_Turma {
    turma: string;
}

interface DB_Aluno {
    codigo: string;
    nome: string;
    data_nascimento: string; // date
    escola: string; // FK to ESCOLAS.codigo
    serie: string; // FK to SERIES.serie
    turma: string; // FK to TURMAS.turma
    observacoes?: string;

    // Assessment columns
    fase_desenho_inicial?: string;
    fase_desenho_1bim?: string;
    fase_desenho_2bim?: string;
    fase_desenho_3bim?: string;
    fase_desenho_4bim?: string;

    fase_escrita_inicial?: string;
    fase_escrita_1bim?: string;
    fase_escrita_2bim?: string;
    fase_escrita_3bim?: string;
    fase_escrita_4bim?: string;
}

const ASSESSMENT_MAPPING: Record<string, { type: AssessmentType; period: string }> = {
    fase_desenho_inicial: { type: AssessmentType.DRAWING, period: 'Inicial' },
    fase_desenho_1bim: { type: AssessmentType.DRAWING, period: '1º Bim' },
    fase_desenho_2bim: { type: AssessmentType.DRAWING, period: '2º Bim' },
    fase_desenho_3bim: { type: AssessmentType.DRAWING, period: '3º Bim' },
    fase_desenho_4bim: { type: AssessmentType.DRAWING, period: '4º Bim' },
    fase_escrita_inicial: { type: AssessmentType.WRITING, period: 'Inicial' },
    fase_escrita_1bim: { type: AssessmentType.WRITING, period: '1º Bim' },
    fase_escrita_2bim: { type: AssessmentType.WRITING, period: '2º Bim' },
    fase_escrita_3bim: { type: AssessmentType.WRITING, period: '3º Bim' },
    fase_escrita_4bim: { type: AssessmentType.WRITING, period: '4º Bim' },
};

const REVERSE_MAPPING: Record<string, string> = {
    [`${AssessmentType.DRAWING}_Inicial`]: 'fase_desenho_inicial',
    [`${AssessmentType.DRAWING}_1º Bim`]: 'fase_desenho_1bim',
    [`${AssessmentType.DRAWING}_2º Bim`]: 'fase_desenho_2bim',
    [`${AssessmentType.DRAWING}_3º Bim`]: 'fase_desenho_3bim',
    [`${AssessmentType.DRAWING}_4º Bim`]: 'fase_desenho_4bim',
    [`${AssessmentType.WRITING}_Inicial`]: 'fase_escrita_inicial',
    [`${AssessmentType.WRITING}_1º Bim`]: 'fase_escrita_1bim',
    [`${AssessmentType.WRITING}_2º Bim`]: 'fase_escrita_2bim',
    [`${AssessmentType.WRITING}_3º Bim`]: 'fase_escrita_3bim',
    [`${AssessmentType.WRITING}_4º Bim`]: 'fase_escrita_4bim',
};

export const supabaseService = {
    // --- Schools ---
    getSchools: async (): Promise<School[]> => {
        const { data, error } = await supabase.from('escolas').select('*');
        if (error) throw error;
        return (data as DB_Escola[]).map(r => ({
            id: r.codigo, // Using code as ID since it's the PK
            code: r.codigo,
            name: r.nome
        }));
    },

    saveSchools: async (schools: School[]) => {
        // Upsert logic
        if (schools.length === 0) return;
        const dbSchools: DB_Escola[] = schools.map(s => ({
            codigo: s.code,
            nome: s.name
        }));
        await supabase.from('escolas').upsert(dbSchools, { onConflict: 'codigo' });
    },

    deleteSchool: async (id: string) => {
        const { error } = await supabase.from('escolas').delete().eq('codigo', id);
        if (error) throw error;
    },

    // --- Series ---
    getSeries: async (): Promise<Series[]> => {
        const { data, error } = await supabase.from('series').select('*');
        if (error) throw error;
        return (data as DB_Serie[]).map(r => ({
            id: r.serie, // Using value as ID
            name: r.serie
        }));
    },

    saveSeries: async (series: Series[]) => {
        if (series.length === 0) return;
        const dbSeries: DB_Serie[] = series.map(s => ({ serie: s.name }));
        await supabase.from('series').upsert(dbSeries, { onConflict: 'serie' });
    },

    deleteSeries: async (id: string) => {
        const { error } = await supabase.from('series').delete().eq('serie', id);
        if (error) throw error;
    },

    // --- Grades (Turmas) ---
    getGrades: async (): Promise<Grade[]> => {
        const { data, error } = await supabase.from('turmas').select('*');
        if (error) throw error;
        return (data as DB_Turma[]).map(r => ({
            id: r.turma, // Using value as ID
            name: r.turma
        }));
    },

    saveGrades: async (grades: Grade[]) => {
        if (grades.length === 0) return;
        const dbGrades: DB_Turma[] = grades.map(g => ({ turma: g.name }));
        await supabase.from('turmas').upsert(dbGrades, { onConflict: 'turma' });
    },

    deleteGrade: async (id: string) => {
        const { error } = await supabase.from('turmas').delete().eq('turma', id);
        if (error) throw error;
    },

    // --- Students & Assessments (ALUNOS table) ---
    getStudents: async (): Promise<Student[]> => {
        const { data, error } = await supabase.from('alunos').select('*');
        if (error) throw error;

        // We need to also fetch Schools to resolve the school ID properly if it differs from code,
        // but here we used code as ID for both.

        return (data as DB_Aluno[]).map(r => ({
            id: r.codigo, // Using code as ID
            code: r.codigo,
            name: r.nome,
            birthDate: r.data_nascimento,
            grade: r.turma,
            series: r.serie,
            schoolId: r.escola, // This refers to school code
            observations: r.observacoes
        }));
    },

    getAssessments: async (): Promise<AssessmentResult[]> => {
        const { data, error } = await supabase.from('alunos').select('*');
        if (error) throw error;

        const assessments: AssessmentResult[] = [];

        (data as DB_Aluno[]).forEach(r => {
            Object.entries(ASSESSMENT_MAPPING).forEach(([colName, meta]) => {
                const phaseValue = (r as any)[colName];
                if (phaseValue) {
                    // Reconstruct assessment object
                    assessments.push({
                        id: `${r.codigo}_${meta.type}_${meta.period}`, // Synthetic ID
                        studentId: r.codigo,
                        type: meta.type,
                        period: meta.period as any,
                        phase: phaseValue,
                        date: new Date().toISOString() // We don't have per-assessment date in this schema, defaulting
                    });
                }
            });
        });

        return assessments;
    },

    // Save student (and their flattened assessments if included, but typically we save assessments separately)
    // For this architecture, we update the ALUNOS row.
    saveStudent: async (student: Student) => {
        const payload: Partial<DB_Aluno> = {
            codigo: student.code,
            nome: student.name,
            data_nascimento: student.birthDate,
            escola: student.schoolId, // schoolId here is actually the code
            serie: student.series,
            turma: student.grade,
            observacoes: student.observations
        };

        const { error } = await supabase.from('alunos').upsert(payload as DB_Aluno, { onConflict: 'codigo' });
        if (error) throw error;
    },

    // To "saveStudents" (bulk), we iterate. Realistically for sync we might need bulk upsert.
    saveStudents: async (students: Student[]) => {
        if (students.length === 0) return;

        const dbStudents: Partial<DB_Aluno>[] = students.map(s => ({
            codigo: s.code,
            nome: s.name,
            data_nascimento: s.birthDate,
            escola: s.schoolId,
            serie: s.series,
            turma: s.grade,
            observacoes: s.observations
        }));

        const { error } = await supabase.from('alunos').upsert(dbStudents as DB_Aluno[], { onConflict: 'codigo' });
        if (error) throw error;
    },

    deleteStudent: async (id: string) => {
        const { error } = await supabase.from('alunos').delete().eq('codigo', id);
        if (error) {
            console.error("Supabase Error [deleteStudent]:", error);
            throw error;
        }
    },

    // When saving assessments, we must update the specific column in ALUNOS table
    saveAssessment: async (assessment: AssessmentResult) => {
        const colName = REVERSE_MAPPING[`${assessment.type}_${assessment.period}`];
        if (!colName) {
            console.warn(`Supabase Warning [saveAssessment]: Mapping not found for ${assessment.type}_${assessment.period}`);
            return;
        }

        const payload: any = {};
        payload[colName] = assessment.phase;

        // Update by student Code
        const { error } = await supabase
            .from('alunos')
            .update(payload)
            .eq('codigo', assessment.studentId); // studentId is actually the student Code in this model

        if (error) {
            console.error("Supabase Error [saveAssessment]:", error);
            throw error;
        }
    },

    saveAssessments: async (assessments: AssessmentResult[]) => {
        const updatesByStudent: Record<string, any> = {};

        assessments.forEach(a => {
            const colName = REVERSE_MAPPING[`${a.type}_${a.period}`];
            if (colName) {
                if (!updatesByStudent[a.studentId]) updatesByStudent[a.studentId] = {};
                updatesByStudent[a.studentId][colName] = a.phase;
            }
        });

        // Perform updates
        const promises = Object.entries(updatesByStudent).map(async ([studentCode, updates]) => {
            const { error } = await supabase.from('alunos').update(updates).eq('codigo', studentCode);
            if (error) {
                console.error(`Supabase Error [saveAssessments] for student ${studentCode}:`, error);
                throw error;
            }
        });

        await Promise.all(promises);
    },

    deleteAssessment: async (assessment: AssessmentResult) => {
        const colName = REVERSE_MAPPING[`${assessment.type}_${assessment.period}`];
        if (!colName) return;

        const payload: any = {};
        payload[colName] = null; // Clear the value

        const { error } = await supabase
            .from('alunos')
            .update(payload)
            .eq('codigo', assessment.studentId);

        if (error) {
            console.error("Supabase Error [deleteAssessment]:", error);
            throw error;
        }
    },

    deleteAllStudents: async () => {
        // Wait, "Apagar todos os alunos" usually means DELETE the rows.
        const { error } = await supabase.from('alunos').delete().neq('codigo', '');
        if (error) {
            console.error("Supabase Error [deleteAllStudents]:", error);
            throw error;
        }
    }
};
