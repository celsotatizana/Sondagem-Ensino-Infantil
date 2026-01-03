
import * as XLSX from 'xlsx';
import { Student, Series, Grade, AssessmentResult, AssessmentType, AssessmentPeriod, School } from '../types';

export interface ImportResult {
  students: Student[];
  series: Series[];
  grades: Grade[];
  schools: School[];
  assessments: AssessmentResult[];
}

export interface ImportSummary {
  data: ImportResult;
  addedStudentsCount: number;
  skippedStudentsCount: number;
  totalRows: number;
  summary: string;
}

const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

export const importFromExcel = async (
  file: File,
  currentData: { students: Student[], series: Series[], grades: Grade[], schools: School[], assessments: AssessmentResult[] }
): Promise<ImportSummary> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const newSeries = [...currentData.series];
        const newGrades = [...currentData.grades];
        const newSchools = [...currentData.schools];
        const newStudents = [...currentData.students];
        const newAssessments = [...currentData.assessments];

        let addedStudentsCount = 0;
        let skippedStudentsCount = 0;
        let totalRows = 0;

        const seriesSheet = workbook.Sheets['Séries'];
        if (seriesSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(seriesSheet);
          rows.forEach(row => {
            const name = row['Nome'];
            if (name && !newSeries.some(s => s.name.toLowerCase() === name.toLowerCase())) {
              newSeries.push({ id: crypto.randomUUID(), name });
            }
          });
        }

        const gradeSheet = workbook.Sheets['Turmas'];
        if (gradeSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(gradeSheet);
          rows.forEach(row => {
            const name = row['Nome'];
            if (name && !newGrades.some(g => g.name.toLowerCase() === name.toLowerCase())) {
              newGrades.push({ id: crypto.randomUUID(), name });
            }
          });
        }

        const schoolSheet = workbook.Sheets['Escolas'];
        if (schoolSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(schoolSheet);
          rows.forEach(row => {
            const name = row['Nome'];
            const code = row['Código']?.toString();
            if (name && code && !newSchools.some(s => s.code.toLowerCase() === code.toLowerCase())) {
              newSchools.push({ id: crypto.randomUUID(), code, name });
            }
          });
        }

        const studentSheet = workbook.Sheets['Alunos'];
        if (studentSheet) {
          const rows: any[] = XLSX.utils.sheet_to_json(studentSheet);
          totalRows = rows.length;
          rows.forEach(row => {
            const code = row['Código']?.toString();
            const name = row['Nome'];
            const birthDate = row['Data de Nascimento'];
            const series = row['Série'];
            const grade = row['Turma'];
            const schoolCode = row['Escola (Código)']?.toString();
            const schoolName = row['Escola (Nome)'];

            const observations = row['Observações'];

            let schoolId = undefined;
            if (schoolCode) {
              const found = newSchools.find(s => s.code === schoolCode);
              if (found) schoolId = found.id;
            } else if (schoolName) {
              const found = newSchools.find(s => s.name.toLowerCase() === schoolName.toLowerCase());
              if (found) schoolId = found.id;
            }

            if (name) {
              let targetStudent = newStudents.find(s => {
                if (code && s.code === code) return true;
                return s.name.toLowerCase() === name.toLowerCase() && s.birthDate === birthDate;
              });

              if (!targetStudent) {
                const studentId = code || crypto.randomUUID();
                targetStudent = {
                  id: studentId,
                  code: code || '',
                  name,
                  birthDate: birthDate || '',
                  series: series || '',
                  grade: grade || '',
                  schoolId: schoolId,
                  observations: observations || ''
                };
                newStudents.push(targetStudent);
                addedStudentsCount++;
              } else {
                // Update school if missing
                if (!targetStudent.schoolId && schoolId) {
                  targetStudent.schoolId = schoolId;
                }
                skippedStudentsCount++;
              }

              const studentId = targetStudent.id;

              PERIODS.forEach(p => {
                const phaseValue = row[`Desenho - ${p}`];
                if (phaseValue) {
                  const exists = newAssessments.some(a =>
                    a.studentId === studentId &&
                    a.type === AssessmentType.DRAWING &&
                    a.period === p &&
                    a.phase === phaseValue
                  );

                  if (!exists) {
                    newAssessments.push({
                      id: crypto.randomUUID(),
                      studentId,
                      date: new Date().toISOString(),
                      type: AssessmentType.DRAWING,
                      period: p,
                      phase: phaseValue
                    });
                  }
                }
              });

              PERIODS.forEach(p => {
                const phaseValue = row[`Escrita - ${p}`];
                if (phaseValue) {
                  const exists = newAssessments.some(a =>
                    a.studentId === studentId &&
                    a.type === AssessmentType.WRITING &&
                    a.period === p &&
                    a.phase === phaseValue
                  );

                  if (!exists) {
                    newAssessments.push({
                      id: crypto.randomUUID(),
                      studentId,
                      date: new Date().toISOString(),
                      type: AssessmentType.WRITING,
                      period: p,
                      phase: phaseValue
                    });
                  }
                }
              });
            }
          });
        }

        resolve({
          data: {
            series: newSeries,
            grades: newGrades,
            schools: newSchools,
            students: newStudents,
            assessments: newAssessments
          },
          addedStudentsCount,
          skippedStudentsCount,
          totalRows,
          summary: `Processado com sucesso.\nTotal de linhas: ${totalRows}\nAlunos adicionados: ${addedStudentsCount}\nAlunos ignorados (já existentes): ${skippedStudentsCount}`
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
