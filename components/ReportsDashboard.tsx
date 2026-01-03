
import React, { useState, useMemo } from 'react';
import { Student, AssessmentResult, AssessmentType, DrawingPhase, AssessmentPeriod, School } from '../types';
import { Filter, FileDown, FileSpreadsheet, Calendar, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { utils, write } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

interface Props {
  students: Student[];
  assessments: AssessmentResult[];
  schools: School[];
  onViewReport: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}



const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

export const ReportsDashboard: React.FC<Props> = ({ students, assessments, schools, onViewReport, onEditStudent }) => {
  const [filterSeries, setFilterSeries] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'code' | 'age', direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  const seriesOptions = useMemo(() => Array.from(new Set(students.map(s => s.series).filter(Boolean))), [students]);
  const gradeOptions = useMemo(() => Array.from(new Set(students.map(s => s.grade).filter(Boolean))), [students]);

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



  const getLatestInfo = (studentId: string, type: AssessmentType, period?: AssessmentPeriod) => {
    const studentAssessments = assessments
      .filter(a => a.studentId === studentId && a.type === type && (!period || a.period === period))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!studentAssessments[0]) return { phase: '-', date: '-', rawDate: null };
    return {
      phase: studentAssessments[0].phase || 'Não Classif.',
      date: new Date(studentAssessments[0].date).toLocaleDateString('pt-BR'),
      rawDate: studentAssessments[0].date
    };
  };

  const filteredStudents = useMemo(() => {
    // If no school selected, show nothing
    if (!filterSchool) return [];

    const filtered = students.filter(student => {
      const matchSeries = filterSeries === 'all' || student.series === filterSeries;
      const matchGrade = filterGrade === 'all' || student.grade === filterGrade;
      const matchSchool = filterSchool === 'all' || student.schoolId === filterSchool;
      const matchName = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSeries && matchGrade && matchSchool && matchName;
    });

    if (sortConfig.key && sortConfig.direction) {
      return [...filtered].sort((a, b) => {
        let aVal: any = a[sortConfig.key === 'age' ? 'birthDate' : sortConfig.key] || '';
        let bVal: any = b[sortConfig.key === 'age' ? 'birthDate' : sortConfig.key] || '';

        if (sortConfig.key === 'age') {
          if (sortConfig.direction === 'asc') return aVal < bVal ? 1 : -1;
          return aVal > bVal ? 1 : -1;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [students, filterSeries, filterGrade, filterSchool, searchTerm, sortConfig]);

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
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={10} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  const handleExportExcel = () => {
    try {
      if (filteredStudents.length === 0) {
        alert("Nenhum aluno para exportar.");
        return;
      }

      const exportData = filteredStudents.map(student => {
        const drawingInfoGen = getLatestInfo(student.id, AssessmentType.DRAWING);
        const age = calculateAgeAtDate(student.birthDate, drawingInfoGen.rawDate);


        const row: any = {
          'Cód': student.code || '-',
          'Escola': schools.find(s => s.id === student.schoolId)?.name || '-',
          'Aluno': student.name,
          'Idade': age !== null ? `${age} anos` : '-',
          'Série/Turma': `${student.series} ${student.grade}`,
        };

        PERIODS.forEach(p => {
          row[`Fase Desenho (${p})`] = getLatestInfo(student.id, AssessmentType.DRAWING, p).phase;
        });

        PERIODS.forEach(p => {
          row[`Fase Escrita (${p})`] = getLatestInfo(student.id, AssessmentType.WRITING, p).phase;
        });

        row['Observações'] = student.observations || '';
        return row;
      });

      const ws = utils.json_to_sheet(exportData);

      const colWidths = Object.keys(exportData[0] || {}).map(key => {
        let maxLen = key.length;
        exportData.forEach(row => {
          const val = String((row as any)[key] || '');
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(maxLen + 5, 50) };
      });
      ws['!cols'] = colWidths;

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Relatório');

      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Relatorio_Pedagogico_Completo.xlsx');
    } catch (error) {
      console.error("Erro Excel:", error);
      alert("Erro ao gerar Excel: " + (error as any).message);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text('Relatório Pedagógico Consolidado Completo', 14, 15);

      const tableRows = filteredStudents.map(student => {
        const drawingInfoGen = getLatestInfo(student.id, AssessmentType.DRAWING);
        const age = calculateAgeAtDate(student.birthDate, drawingInfoGen.rawDate);


        const row = [
          student.code || '-',
          schools.find(s => s.id === student.schoolId)?.name || '-',
          student.name,
          age !== null ? `${age} anos` : '-',
          `${student.series} / ${student.grade}`,
        ];

        PERIODS.forEach(p => {
          row.push(getLatestInfo(student.id, AssessmentType.DRAWING, p).phase);
        });

        PERIODS.forEach(p => {
          row.push(getLatestInfo(student.id, AssessmentType.WRITING, p).phase);
        });

        row.push(student.observations || '');
        return row;
      });

      const head = [
        ['Cód', 'Escola', 'Aluno', 'Idade', 'Série/Turma',
          'D. Inicial', 'D. 1º Bim', 'D. 2º Bim', 'D. 3º Bim', 'D. 4º Bim',
          'E. Inicial', 'E. 1º Bim', 'E. 2º Bim', 'E. 3º Bim', 'E. 4º Bim',
          'Observações']
      ];

      autoTable(doc, {
        head: head,
        body: tableRows,
        startY: 25,
        styles: { fontSize: 5, overflow: 'linebreak' },
        headStyles: { fillColor: [234, 88, 12] },
        columnStyles: {
          15: { cellWidth: 20 }
        }
      });



      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, 'Relatorio_Consolidado_Completo.pdf');
    } catch (error) {
      console.error("Erro PDF:", error);
      alert("Erro ao gerar PDF: " + (error as any).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2"><Filter size={20} className="text-orange-500" /><h3 className="font-bold uppercase text-xs">Filtros</h3></div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95"><FileSpreadsheet size={16} /> Excel</button>
            <button onClick={handleExportPDF} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95"><FileDown size={16} /> PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Pesquisar aluno..." className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-xl text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <select value={filterSeries} onChange={(e) => setFilterSeries(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-xl text-sm outline-none">
            <option value="all">Séries...</option>
            {seriesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-xl text-sm outline-none">
            <option value="all">Turmas...</option>
            {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-2 border-orange-200 rounded-xl text-sm font-bold outline-none">
            <option value="">Selecione a Escola...</option>
            <option value="all">Todas as Escolas</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-bold border-b dark:border-gray-700">
              <tr>
                <th rowSpan={2} onClick={() => requestSort('code')} className="p-4 text-[9px] uppercase border-r dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">Cód. {getSortIcon('code')}</div>
                </th>
                <th rowSpan={2} onClick={() => requestSort('name')} className="p-4 text-[9px] uppercase border-r dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">Aluno {getSortIcon('name')}</div>
                </th>
                <th rowSpan={2} onClick={() => requestSort('age')} className="p-4 text-[9px] uppercase border-r dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">Idade {getSortIcon('age')}</div>
                </th>
                <th rowSpan={2} className="p-4 text-[9px] uppercase border-r dark:border-gray-700">Escola</th>
                <th rowSpan={2} className="p-4 text-[9px] uppercase border-r dark:border-gray-700">Série/Turma</th>
                <th colSpan={5} className="p-2 text-[9px] uppercase text-center border-b border-r dark:border-gray-700">Fase Desenho</th>
                <th colSpan={5} className="p-2 text-[9px] uppercase text-center border-b border-r dark:border-gray-700">Fase Escrita</th>
                <th rowSpan={2} className="p-4 text-[9px] uppercase border-r dark:border-gray-700">Obs.</th>
                <th rowSpan={2} className="p-4 text-[9px] uppercase text-center">Ações</th>
              </tr>
              <tr>
                {/* Desenho sub-headers */}
                {PERIODS.map(p => (
                  <th key={`head-draw-${p}`} className="p-2 text-[7px] uppercase text-center border-r dark:border-gray-700">{p}</th>
                ))}
                {/* Escrita sub-headers */}
                {PERIODS.map(p => (
                  <th key={`head-write-${p}`} className="p-2 text-[7px] uppercase text-center border-r dark:border-gray-700">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredStudents.map(student => {
                const drawingInfoGen = getLatestInfo(student.id, AssessmentType.DRAWING);
                const age = calculateAgeAtDate(student.birthDate, drawingInfoGen.rawDate);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="p-4 text-xs text-gray-400 border-r dark:border-gray-700">{student.code || '-'}</td>
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100 border-r dark:border-gray-700">
                      <button onClick={() => onViewReport(student)} className="hover:text-orange-600 transition-colors text-left">{student.name}</button>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 text-xs font-black border-r dark:border-gray-700">{age !== null ? `${age} anos` : '-'}</td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400 border-r dark:border-gray-700 max-w-[150px] truncate" title={schools.find(s => s.id === student.schoolId)?.name}>{schools.find(s => s.id === student.schoolId)?.name || '-'}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs border-r dark:border-gray-700">{student.series} / {student.grade}</td>

                    {/* Desenho columns */}
                    {PERIODS.map(p => {
                      const info = getLatestInfo(student.id, AssessmentType.DRAWING, p);
                      return (
                        <td key={`draw-${p}`} className="p-2 border-r dark:border-gray-700 text-center">
                          {info.phase !== '-' ? (
                            <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 text-[8px] px-1 py-0.5 rounded font-black block leading-tight">
                              {info.phase}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Escrita columns */}
                    {PERIODS.map(p => {
                      const info = getLatestInfo(student.id, AssessmentType.WRITING, p);
                      return (
                        <td key={`write-${p}`} className="p-2 border-r dark:border-gray-700 text-center">
                          {info.phase !== '-' ? (
                            <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 text-[8px] px-1 py-0.5 rounded font-black block leading-tight">
                              {info.phase}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate border-r dark:border-gray-700" title={student.observations}>
                      {student.observations || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => onEditStudent(student)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-all active:scale-90 shadow-sm"
                        title="Alterar Cadastro Completo / Situação / Fase"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
