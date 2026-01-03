
import React, { useEffect, useState, useRef } from 'react';
import { AssessmentResult, AssessmentType, Student, DrawingPhase, WritingPhase } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { 
  BookOpen, Calculator, Brain, Palette, Pencil, MessageCircle, Layers, 
  Calendar, GraduationCap, AlertCircle, CheckCircle, ArrowLeft, Printer, Download, Loader2,
  TrendingUp, TrendingDown, Minus, Image as ImageIcon, ChevronRight, Globe, ExternalLink, Hash
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateStudentReport } from '../services/geminiService';

interface Props {
  student: Student;
  assessments: AssessmentResult[];
  onBack: () => void;
}

export const ConsolidatedStudentView: React.FC<Props> = ({ student, assessments, onBack }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<{text: string, sources: any[]} | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleGenerateFullReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateStudentReport("gemini-3-pro-preview", student.name, assessments);
      setAiReport(report);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar parecer com Grounding.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const DRAWING_ORDER = [DrawingPhase.GARATUJA_DESORDENADA, DrawingPhase.GARATUJA_ORDENADA, DrawingPhase.PRE_ESQUEMATISMO, DrawingPhase.ESQUEMATISMO, DrawingPhase.REALISMO, DrawingPhase.PSEUDO_NATURALISMO];
  const WRITING_ORDER = [WritingPhase.PRE_ALFABETICA, WritingPhase.ALFABETICA_PARCIAL, WritingPhase.ALFABETICA_COMPLETA, WritingPhase.ALFABETICA_CONSOLIDADA];

  const getHistory = (type: AssessmentType) => assessments.filter(a => a.studentId === student.id && a.type === type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const latestDrawing = getHistory(AssessmentType.DRAWING)[0];
  const latestWriting = getHistory(AssessmentType.WRITING)[0];
  const recentDrawings = assessments.filter(a => a.studentId === student.id && a.type === AssessmentType.DRAWING && a.imageUrl).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  const PhaseStepper = ({ currentPhase, allPhases, colorBase }: any) => {
    const currentIndex = allPhases.indexOf(currentPhase as any);
    if (currentIndex === -1) return null;
    return (
      <div className="mt-3">
        <div className="flex gap-1 h-1.5 w-full">
          {allPhases.map((_: any, idx: number) => (
            <div key={idx} className={`flex-1 rounded-full ${idx <= currentIndex ? `${colorBase} opacity-100` : 'bg-gray-200 dark:bg-gray-600 opacity-50'}`} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={reportRef} id="printable-report" className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-screen flex flex-col animate-fade-in overflow-hidden">
      
      {/* Header */}
      <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#FDFBF7] dark:bg-gray-900/50">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm text-gray-400 hover:text-orange-600 transition-all no-print">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-bold text-gray-500 flex items-center gap-1">
                <Hash size={10} /> {student.code || 'S/C'}
              </span>
              <h2 className="text-3xl font-black text-gray-800 dark:text-white">{student.name}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <span className="flex items-center gap-1.5"><GraduationCap size={18} className="text-orange-500" /> {student.grade}</span>
              <span className="flex items-center gap-1.5"><Calendar size={18} className="text-orange-500" /> {calculateAge(student.birthDate)} anos</span>
              <span className="text-[10px] font-normal opacity-70">Nascimento: {new Date(student.birthDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 no-print">
          <button 
            onClick={handleGenerateFullReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-purple-100"
          >
            {isGeneratingReport ? <Loader2 size={20} className="animate-spin" /> : <Brain size={20} />}
            <span>{isGeneratingReport ? "Sintetizando..." : "Parecer Final (IA + Web)"}</span>
          </button>
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* Grids de Fases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-orange-50/50 dark:bg-gray-700/50 rounded-3xl p-8 border border-orange-100 dark:border-gray-600">
            <h3 className="text-xs font-black text-orange-800 dark:text-orange-300 uppercase tracking-widest mb-4">Fase do Desenho</h3>
            <p className="text-3xl font-black text-gray-800 dark:text-white mb-2">{latestDrawing?.phase || 'Não Avaliado'}</p>
            <PhaseStepper currentPhase={latestDrawing?.phase} allPhases={DRAWING_ORDER} colorBase="bg-orange-600" />
          </div>
          <div className="bg-teal-50/50 dark:bg-gray-700/50 rounded-3xl p-8 border border-teal-100 dark:border-gray-600">
            <h3 className="text-xs font-black text-teal-800 dark:text-teal-300 uppercase tracking-widest mb-4">Fase da Escrita</h3>
            <p className="text-3xl font-black text-gray-800 dark:text-white mb-2">{latestWriting?.phase || 'Não Avaliado'}</p>
            <PhaseStepper currentPhase={latestWriting?.phase} allPhases={WRITING_ORDER} colorBase="bg-teal-600" />
          </div>
        </div>

        {/* Parecer IA com Grounding */}
        {aiReport && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-purple-100 dark:border-gray-700 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Brain size={28} className="text-purple-600" />
              <h3 className="text-xl font-black text-gray-800 dark:text-white">Parecer Sintetizado pela PedagogIA</h3>
            </div>
            <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
              {aiReport.text}
            </div>
            
            {(aiReport.sources || []).length > 0 && (
              <div className="mt-8 pt-6 border-t dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <Globe size={14} /> Grounding: Fontes Consultadas via Google Search
                </div>
                <div className="flex flex-wrap gap-3">
                  {aiReport.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600 transition-all border border-gray-100 dark:border-gray-600"
                    >
                      {source.title} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Galeria */}
        {recentDrawings.length > 0 && (
          <div>
            <h3 className="text-base font-black text-gray-400 uppercase tracking-widest mb-6">Linha do Tempo de Produções</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {recentDrawings.map((drawing) => (
                <div key={drawing.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                  <img src={drawing.imageUrl} alt="Desenho" className="aspect-square w-full rounded-xl object-cover mb-4 shadow-sm" />
                  <p className="text-[10px] font-black text-gray-400 uppercase text-center">{new Date(drawing.date).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
