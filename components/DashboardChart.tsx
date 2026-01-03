
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { AssessmentResult, AssessmentType, DrawingPhase, WritingPhase, Student, AssessmentPeriod, School } from '../types';
import {
  Users, Palette, FileDigit, CalendarDays, SearchX, Target
} from 'lucide-react';

interface Props {
  assessments: AssessmentResult[];
  students: Student[];
  schools: School[];
}

const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

const DRAWING_PHASES = [
  DrawingPhase.GARATUJA_DESORDENADA,
  DrawingPhase.GARATUJA_ORDENADA,
  DrawingPhase.PRE_ESQUEMATISMO,
  DrawingPhase.ESQUEMATISMO,
  DrawingPhase.REALISMO,
  DrawingPhase.PSEUDO_NATURALISMO,
];

const WRITING_PHASES = [
  WritingPhase.PRE_ALFABETICA,
  WritingPhase.ALFABETICA_PARCIAL,
  WritingPhase.ALFABETICA_COMPLETA,
  WritingPhase.ALFABETICA_CONSOLIDADA
];

const DRAWING_COLORS: Record<string, string> = {
  [DrawingPhase.GARATUJA_DESORDENADA]: '#FCD34D',
  [DrawingPhase.GARATUJA_ORDENADA]: '#F59E0B',
  [DrawingPhase.PRE_ESQUEMATISMO]: '#F97316',
  [DrawingPhase.ESQUEMATISMO]: '#EF4444',
  [DrawingPhase.REALISMO]: '#DB2777',
  [DrawingPhase.PSEUDO_NATURALISMO]: '#7C3AED',
};

const WRITING_COLORS: Record<string, string> = {
  [WritingPhase.PRE_ALFABETICA]: '#94a3b8',
  [WritingPhase.ALFABETICA_PARCIAL]: '#2dd4bf',
  [WritingPhase.ALFABETICA_COMPLETA]: '#0d9488',
  [WritingPhase.ALFABETICA_CONSOLIDADA]: '#059669',
};



export const DashboardChart: React.FC<Props> = ({ assessments, students, schools }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AssessmentPeriod>('Inicial');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  const normalize = (s: string) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const stats = useMemo(() => {
    const periodAssessments = assessments.filter(a => a.period === selectedPeriod);

    // Filtrando avaliações pelos alunos da escola selecionada
    const filteredStudents = selectedSchool === 'all'
      ? students
      : students.filter(s => s.schoolId === selectedSchool);

    const filteredStudentIds = new Set(filteredStudents.map(s => s.id));
    const filteredAssessments = periodAssessments.filter(a => filteredStudentIds.has(a.studentId));

    // Contagem de alunos ÚNICOS avaliados por tipo neste período (filtrado)
    const drawingEvaluatedIds = new Set(filteredAssessments.filter(a => a.type === AssessmentType.DRAWING).map(a => a.studentId));
    const writingEvaluatedIds = new Set(filteredAssessments.filter(a => a.type === AssessmentType.WRITING).map(a => a.studentId));

    const drawingPhaseCount: Record<string, number> = {};
    const writingPhaseCount: Record<string, number> = {};

    filteredStudents.forEach(s => {
      // Pega a avaliação mais recente do período para este aluno
      const studentPeriodDrawings = filteredAssessments.filter(a => a.studentId === s.id && a.type === AssessmentType.DRAWING);
      if (studentPeriodDrawings.length > 0) {
        const lastDrawing = studentPeriodDrawings[studentPeriodDrawings.length - 1];
        if (lastDrawing.phase && lastDrawing.phase !== 'Pendente') {
          const canonical = DRAWING_PHASES.find(dp => normalize(dp) === normalize(lastDrawing.phase!)) || lastDrawing.phase;
          drawingPhaseCount[canonical] = (drawingPhaseCount[canonical] || 0) + 1;
        }
      }

      const studentPeriodWritings = filteredAssessments.filter(a => a.studentId === s.id && a.type === AssessmentType.WRITING);
      if (studentPeriodWritings.length > 0) {
        const lastWriting = studentPeriodWritings[studentPeriodWritings.length - 1];
        if (lastWriting.phase && lastWriting.phase !== 'Pendente') {
          const canonical = WRITING_PHASES.find(wp => normalize(wp) === normalize(lastWriting.phase!)) || lastWriting.phase;
          writingPhaseCount[canonical] = (writingPhaseCount[canonical] || 0) + 1;
        }
      }
    });

    const drawingBarData = DRAWING_PHASES.map(phase => ({
      name: phase,
      Alunos: drawingPhaseCount[phase] || 0,
      fill: DRAWING_COLORS[phase]
    }));

    const writingBarData = WRITING_PHASES.map(phase => ({
      name: phase,
      Alunos: writingPhaseCount[phase] || 0,
      fill: WRITING_COLORS[phase]
    }));

    return {
      totalStudents: filteredStudents.length,
      evaluatedDrawings: drawingEvaluatedIds.size,
      evaluatedWritings: writingEvaluatedIds.size,
      drawingCoverage: filteredStudents.length > 0 ? (drawingEvaluatedIds.size / filteredStudents.length) * 100 : 0,
      writingCoverage: filteredStudents.length > 0 ? (writingEvaluatedIds.size / filteredStudents.length) * 100 : 0,
      drawingBarData,
      writingBarData,
      hasData: filteredAssessments.length > 0
    };
  }, [students, assessments, selectedPeriod, selectedSchool]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-orange-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 rounded-xl">
            <CalendarDays size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Período Selecionado</h4>
            <p className="text-[10px] text-gray-400 font-bold">Resumo estatístico da turma</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="p-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs"
          >
            <option value="all">Todas as Escolas</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex flex-wrap justify-center gap-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${selectedPeriod === p
                  ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100'
                  : 'bg-white dark:bg-gray-700 text-gray-400 border-gray-100 dark:border-gray-600 hover:border-orange-200'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full mb-3">
            <Users size={24} />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total da Turma</p>
          <h4 className="text-3xl font-black dark:text-white">{stats.totalStudents}</h4>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl"><Palette size={20} /></div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Desenhos Avaliados</p>
              <h4 className="text-2xl font-black text-blue-600 leading-none">{stats.evaluatedDrawings}</h4>
            </div>
          </div>
          <div className="mt-auto space-y-1">
            <div className="flex justify-between text-[8px] font-black uppercase text-gray-400">
              <span>Cobertura</span>
              <span>{stats.drawingCoverage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all" style={{ width: `${stats.drawingCoverage}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-teal-100 text-teal-600 rounded-2xl"><FileDigit size={20} /></div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Escritas Avaliadas</p>
              <h4 className="text-2xl font-black text-teal-600 leading-none">{stats.evaluatedWritings}</h4>
            </div>
          </div>
          <div className="mt-auto space-y-1">
            <div className="flex justify-between text-[8px] font-black uppercase text-gray-400">
              <span>Cobertura</span>
              <span>{stats.writingCoverage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
              <div className="bg-teal-600 h-full transition-all" style={{ width: `${stats.writingCoverage}%` }} />
            </div>
          </div>
        </div>


      </div>

      {!stats.hasData ? (
        <div className="bg-white dark:bg-gray-800 p-16 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-4">
          <SearchX size={64} className="text-gray-200" />
          <h3 className="text-xl font-black text-gray-400 uppercase">Nenhum registro no período: {selectedPeriod}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Palette size={18} className="text-orange-600" /> Distribuição por Fase de Desenho
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.drawingBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={120} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="Alunos" radius={[0, 4, 4, 0]}>
                    {stats.drawingBarData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <FileDigit size={18} className="text-teal-600" /> Distribuição por Fase de Escrita
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.writingBarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                  <YAxis allowDecimals={false} hide />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="Alunos" radius={[4, 4, 0, 0]}>
                    {stats.writingBarData.map((entry, index) => <Cell key={`cell-writing-${index}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
