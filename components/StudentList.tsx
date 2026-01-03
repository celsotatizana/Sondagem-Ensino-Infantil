
import React, { useState, useMemo } from 'react';
import { Student, AssessmentResult, AssessmentType, DrawingPhase, AssessmentPeriod, School } from '../types';
import { Plus, UserPlus, Filter, XCircle, Trash2, Eraser, Calendar, Pencil, Palette, Mic, FileDigit, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  students: Student[];
  assessments: AssessmentResult[];
  schools: School[];
  onSelectStudent: (student: Student) => void;
  onStartTranscription: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onGenerateReport: (student: Student) => void;
  onAddStudent: () => void;
  onDeleteStudent: (studentId: string, code?: string) => void;
  onDeleteAllStudents: () => void;
}



const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

export const StudentList: React.FC<Props> = ({
  students,
  assessments,
  schools,
  onSelectStudent,
  onStartTranscription,
  onEditStudent,
  onGenerateReport,
  onAddStudent,
  onDeleteStudent,
  onDeleteAllStudents
}) => {
  const [filterSeries, setFilterSeries] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'code' | 'age', direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  const seriesOptions = useMemo(() => Array.from(new Set(students.map(s => s.series).filter(Boolean))), [students]);
  const gradeOptions = useMemo(() => Array.from(new Set(students.map(s => s.grade).filter(Boolean))), [students]);

  const filteredStudents = useMemo(() => {
    // If no school selected, show nothing
    if (!filterSchool) return [];

    const filtered = students.filter(student => {
      const matchSeries = filterSeries === 'all' || student.series === filterSeries;
      const matchGrade = filterGrade === 'all' || student.grade === filterGrade;
      const matchSchool = filterSchool === 'all' || student.schoolId === filterSchool;
      return matchSeries && matchGrade && matchSchool;
    });

    if (sortConfig.key && sortConfig.direction) {
      return [...filtered].sort((a, b) => {
        let aVal: any = a[sortConfig.key === 'age' ? 'birthDate' : sortConfig.key] || '';
        let bVal: any = b[sortConfig.key === 'age' ? 'birthDate' : sortConfig.key] || '';

        // If sorting by age, we actually sort by birthDate reversed (older = smaller birthdate)
        if (sortConfig.key === 'age') {
          // Flip logic: ASC age = DESC birthdate (younger first? no, usually older first in age lists, but let's stick to standard)
          // Actually, let's treat 'age' as the numeric value. Higher birthdate = lower age.
          // For 'asc' age (youngest first), we want largest birthdate first.
          if (sortConfig.direction === 'asc') return aVal < bVal ? 1 : -1;
          return aVal > bVal ? 1 : -1;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [students, filterSeries, filterGrade, filterSchool, sortConfig]);

  const requestSort = (key: 'name' | 'code' | 'age') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };





  const calculateAgeAtDate = (birthDate: string, refDate: string | null) => {
    if (!birthDate || !refDate) return null;
    const birth = new Date(birthDate);
    const ref = new Date(refDate);
    if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return null;

    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getLatestAssessmentInfo = (studentId: string, type: AssessmentType, period?: AssessmentPeriod) => {
    const studentAssessments = assessments
      .filter(a => a.studentId === studentId && a.type === type && (!period || a.period === period))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!studentAssessments[0]) return { phase: '-', date: '-' };

    return {
      phase: studentAssessments[0].phase || '-',
      date: new Date(studentAssessments[0].date).toLocaleDateString('pt-BR')
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <UserPlus size={20} className="text-orange-500" />
          Alunos Cadastrados
        </h3>
        <div className="flex gap-2">
          <button onClick={onDeleteAllStudents} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"><Eraser size={16} /> Limpar Tudo</button>
          <button onClick={onAddStudent} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95"><Plus size={16} /> Novo Aluno</button>
        </div>
      </div>

      <div className="p-4 flex flex-wrap gap-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800 items-center">
        <select value={filterSeries} onChange={(e) => setFilterSeries(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 text-xs rounded-lg p-2 min-w-[120px] dark:text-white">
          <option value="all">Todas as Séries</option>
          {seriesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 text-xs rounded-lg p-2 min-w-[120px] dark:text-white">
          <option value="all">Todas as Turmas</option>
          {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="bg-gray-50 dark:bg-gray-700 border-2 border-orange-200 dark:border-gray-600 text-xs font-bold rounded-lg p-2 min-w-[150px] dark:text-white">
          <option value="">Selecione a Escola...</option>
          <option value="all">Todas as Escolas</option>
          {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-orange-50 dark:bg-gray-700 text-orange-900 dark:text-orange-300">
            <tr>
              <th rowSpan={2} onClick={() => requestSort('code')} className="p-4 font-bold text-xs uppercase border-r dark:border-gray-600 cursor-pointer hover:bg-orange-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-1">Cód. {getSortIcon('code')}</div>
              </th>
              <th rowSpan={2} onClick={() => requestSort('name')} className="p-4 font-bold text-xs uppercase border-r dark:border-gray-600 cursor-pointer hover:bg-orange-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-1">Nome {getSortIcon('name')}</div>
              </th>
              <th rowSpan={2} onClick={() => requestSort('age')} className="p-4 font-bold text-xs uppercase border-r dark:border-gray-600 cursor-pointer hover:bg-orange-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex items-center gap-1">Idade {getSortIcon('age')}</div>
              </th>
              <th rowSpan={2} className="p-4 font-bold text-xs uppercase border-r dark:border-gray-600">Escola</th>
              <th rowSpan={2} className="p-4 font-bold text-xs uppercase border-r dark:border-gray-600">Série/Turma</th>
              <th colSpan={5} className="p-2 font-bold text-xs uppercase text-center border-b border-r dark:border-gray-600">Fase Desenho</th>
              <th colSpan={5} className="p-2 font-bold text-xs uppercase text-center border-b border-r dark:border-gray-600">Fase Escrita</th>
              <th rowSpan={2} className="p-4 font-bold text-center text-xs uppercase border-r dark:border-gray-600">Sondagem</th>
              <th rowSpan={2} className="p-4 font-bold text-center text-xs uppercase">Ações</th>
            </tr>
            <tr>
              {PERIODS.map(p => <th key={`dh-${p}`} className="p-2 font-bold text-[8px] uppercase text-center border-r dark:border-gray-600">{p}</th>)}
              {PERIODS.map(p => <th key={`wh-${p}`} className="p-2 font-bold text-[8px] uppercase text-center border-r dark:border-gray-600">{p}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredStudents.map(student => {
              const drawingInfoGeneral = getLatestAssessmentInfo(student.id, AssessmentType.DRAWING);
              const age = calculateAgeAtDate(student.birthDate, drawingInfoGeneral.date === '-' ? null : new Date().toISOString());

              return (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="p-4 text-gray-400 font-mono text-xs border-r dark:border-gray-700">{student.code || '-'}</td>
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-100 border-r dark:border-gray-700">{student.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300 text-xs font-black border-r dark:border-gray-700">{age !== null ? `${age} anos` : '-'}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-xs border-r dark:border-gray-700">{schools.find(s => s.id === student.schoolId)?.code || '-'}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-xs border-r dark:border-gray-700">{student.series} / {student.grade}</td>

                  {PERIODS.map(p => {
                    const info = getLatestAssessmentInfo(student.id, AssessmentType.DRAWING, p);
                    return (
                      <td key={`draw-${p}`} className="p-2 border-r dark:border-gray-700 text-center">
                        {info.phase !== '-' ? (
                          <span className="bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 text-[8px] px-1 py-0.5 rounded font-black block leading-tight">
                            {info.phase}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px]">-</span>
                        )}
                      </td>
                    );
                  })}

                  {PERIODS.map(p => {
                    const info = getLatestAssessmentInfo(student.id, AssessmentType.WRITING, p);
                    return (
                      <td key={`write-${p}`} className="p-2 border-r dark:border-gray-700 text-center">
                        {info.phase !== '-' ? (
                          <span className="bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-200 text-[8px] px-1 py-0.5 rounded font-black block leading-tight">
                            {info.phase}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px]">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-4 border-r dark:border-gray-700">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => onSelectStudent(student)} className="text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-all active:scale-90" title="Nova Sondagem de Desenho">
                        <Palette size={20} />
                      </button>
                      <button onClick={() => onStartTranscription(student)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all active:scale-90" title="Sondagem de Escrita">
                        <FileDigit size={20} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => onEditStudent(student)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all active:scale-90" title="Alterar Cadastro"><Pencil size={18} /></button>
                      <button onClick={() => onDeleteStudent(student.id, student.code)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all active:scale-90" title="Excluir Aluno"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div >
  );
};
