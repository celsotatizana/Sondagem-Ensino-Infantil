
import * as XLSX from 'xlsx';
import { Student, Series, Grade, AssessmentResult, AssessmentType, AssessmentPeriod, School } from '../types';

const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

export const exportToExcel = (
  students: Student[],
  seriesList: Series[],
  grades: Grade[],
  schools: School[],
  assessments: AssessmentResult[]
) => {
  const wb = XLSX.utils.book_new();

  const getColWidths = (data: any[]) => {
    if (!data.length) return [];
    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const headerLen = key.length;
      const maxContentLen = Math.max(
        headerLen,
        ...data.map(item => String(item[key] || '').length)
      );
      return { wch: Math.min(maxContentLen + 5, 60) };
    });
  };

  const getLatestInfo = (studentId: string, type: AssessmentType, period: AssessmentPeriod) => {
    const studentAssessments = assessments
      .filter(a => a.studentId === studentId && a.type === type && a.period === period)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return studentAssessments[0]?.phase || '';
  };



  const studentData = students.map(s => {
    const school = schools.find(sch => sch.id === s.schoolId);
    const row: any = {
      'Código': s.code,
      'Nome': s.name,
      'Data de Nascimento': s.birthDate,
      'Série': s.series,
      'Turma': s.grade,
      'Escola (Código)': school?.code || '',
      'Escola (Nome)': school?.name || '',
    };

    PERIODS.forEach(p => {
      row[`Desenho - ${p}`] = getLatestInfo(s.id, AssessmentType.DRAWING, p);
    });

    PERIODS.forEach(p => {
      row[`Escrita - ${p}`] = getLatestInfo(s.id, AssessmentType.WRITING, p);
    });

    row['Observações'] = s.observations || '';
    return row;
  });

  const wsStudents = XLSX.utils.json_to_sheet(studentData);
  wsStudents['!cols'] = getColWidths(studentData);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos');

  const seriesData = seriesList.map(s => ({ 'Nome': s.name }));
  const wsSeries = XLSX.utils.json_to_sheet(seriesData);
  wsSeries['!cols'] = getColWidths(seriesData);
  XLSX.utils.book_append_sheet(wb, wsSeries, 'Séries');

  const gradeData = grades.map(g => ({ 'Nome': g.name }));
  const wsGrades = XLSX.utils.json_to_sheet(gradeData);
  wsGrades['!cols'] = getColWidths(gradeData);
  XLSX.utils.book_append_sheet(wb, wsGrades, 'Turmas');

  const schoolData = schools.map(s => ({ 'Código': s.code, 'Nome': s.name }));
  const wsSchools = XLSX.utils.json_to_sheet(schoolData);
  wsSchools['!cols'] = getColWidths(schoolData);
  XLSX.utils.book_append_sheet(wb, wsSchools, 'Escolas');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `sondagem_completa_${dateStr}.xlsx`);
};
