
import React, { useState, useEffect } from 'react';
import { AssessmentType, AssessmentResult, Student, DrawingPhase, WritingPhase, AssessmentPeriod } from '../types';
import { analyzeDrawing, blobToBase64 } from '../services/geminiService';
import { Camera, CheckCircle, Loader2, FileText, BookOpen, ScanText, Brain, Trash2, Calculator, Layers, MessageCircle, Pencil, AlertCircle, Palette, Trees, Footprints, Info, Lightbulb, XCircle, ChevronDown, ChevronUp, Sparkles, Wand2, CalendarDays } from 'lucide-react';

interface Props {
  student: Student;
  assessments: AssessmentResult[];
  onSave: (result: AssessmentResult) => void;
  onCancel: () => void;
  selectedModel: string;
}

const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

export const AssessmentForm: React.FC<Props> = ({ student, assessments, onSave, onCancel, selectedModel }) => {
  const [activeTab] = useState<AssessmentType>(AssessmentType.DRAWING);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDecisionExpanded, setIsDecisionExpanded] = useState(false);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<AssessmentPeriod>('Inicial');
  const [hasExistingAssessment, setHasExistingAssessment] = useState(false);

  const [formsData, setFormsData] = useState<any>({
    [AssessmentType.DRAWING]: { preview: null, analysis: null, observation: "" }
  });

  // Verificar se existe classificação para o período selecionado
  useEffect(() => {
    const existingAssessment = assessments.some(
      a => a.studentId === student.id &&
        a.type === AssessmentType.DRAWING &&
        a.period === selectedPeriod
    );
    setHasExistingAssessment(existingAssessment);
  }, [selectedPeriod, assessments, student.id]);

  const updateFormData = (type: AssessmentType, data: any) => {
    setFormsData((prev: any) => ({ ...prev, [type]: { ...prev[type], ...data } }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssessmentType.DRAWING) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => updateFormData(type, { preview: event.target?.result as string, analysis: null });
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = formsData[activeTab];
      if (!data.preview) throw new Error("Upload da imagem necessário.");
      const base64 = data.preview.split(',')[1];
      let result;
      if (activeTab === AssessmentType.DRAWING) {
        result = await analyzeDrawing(selectedModel, base64);
      }
      updateFormData(activeTab, { analysis: result });
    } catch (e: any) {
      setErrorMessage(e.message || "Erro na análise.");
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysisContent = () => {
    const analysis = formsData[activeTab]?.analysis;

    if (!analysis) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={64} className="text-orange-500 animate-spin" />
              <p className="font-bold text-lg dark:text-white">Analisando evidências...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Brain size={64} className="text-gray-300" />
              <p className="font-bold text-lg text-gray-400">Aguardando Análise</p>
              <p className="text-sm text-gray-400">Envie a imagem e clique no botão de classificação.</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-[#FFF8F3] dark:bg-orange-950/20 border border-orange-200 p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-widest">FASE IDENTIFICADA</p>
              <h3 className="text-3xl font-black text-orange-900 dark:text-white leading-tight">{analysis.phase || "Não identificado"}</h3>
              <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">{analysis.ageRange || "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-widest mb-1">Confiança</p>
              <p className="text-3xl font-black text-orange-900 dark:text-white">{((analysis.confidence || 0) * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-blue-50 dark:border-gray-700 shadow-sm">
          <h4 className="text-base font-extrabold text-blue-900 dark:text-blue-300 mb-3">Resumo das Características</h4>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{analysis.summary || "Sem resumo disponível."}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(analysis.markers || []).map((marker: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
              <div className={`mt-1 p-1.5 rounded-full ${marker.match ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-700'}`}>
                {marker.match ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-gray-800 dark:text-white leading-tight">{marker.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">{marker.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          <button onClick={() => setIsDecisionExpanded(!isDecisionExpanded)} className="w-full flex items-center justify-between p-4 text-gray-700 dark:text-gray-300 font-bold text-sm">
            <div className="flex items-center gap-2"><FileText size={16} /> <span>Parecer Técnico Detalhado</span></div>
            {isDecisionExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {isDecisionExpanded && (
            <div className="p-4 pt-0 border-t dark:border-gray-700">
              <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 mt-4 whitespace-pre-line">
                {analysis.reasoning || "Análise detalhada não disponível."}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#FAF8FF] dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setIsActivitiesExpanded(!isActivitiesExpanded)}
            className="w-full flex items-center justify-between p-4 text-purple-900 dark:text-purple-300 font-extrabold"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <span>Atividades Recomendadas</span>
            </div>
            {isActivitiesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {isActivitiesExpanded && (
            <div className="p-4 pt-0 border-t border-purple-100 dark:border-purple-900/30">
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white/60 dark:bg-gray-900/40 p-4 rounded-xl">
                {analysis.recommendedActivities || "Sugestões de atividades não geradas."}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 md:p-4 z-50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-7xl rounded-none md:rounded-3xl shadow-2xl flex flex-col h-full md:h-[95vh]">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 shrink-0">
          <div>
            <h2 className="text-xl font-black text-orange-600 dark:text-orange-500 flex items-center gap-2">
              <Palette size={24} /> Sondagem de Desenho
            </h2>
            <p className="text-sm text-gray-500 font-bold">{student.name} • {student.grade}</p>
          </div>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
        </div>

        {hasExistingAssessment && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 p-3 px-6 flex items-center gap-3 animate-fade-in">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-500" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
              Aluno já foi classificado neste período. Se você continuar, a classificação anterior será sobreposta.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FDFBF7] dark:bg-[#0c0d0e]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-stretch max-w-7xl mx-auto w-full">
            <div className="lg:col-span-5 flex flex-col gap-6">

              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                  <CalendarDays size={14} className="text-blue-500" />
                  <span>Selecionar Período da Sondagem</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {PERIODS.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`py-2 px-1 rounded-xl text-[9px] font-black transition-all border-2 ${selectedPeriod === p
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                        : 'bg-white dark:bg-gray-700 text-gray-400 border-gray-100 dark:border-gray-600 hover:border-blue-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm flex flex-col min-h-[400px]">
                <div className="border-2 border-dashed border-orange-100 dark:border-gray-700 rounded-2xl flex-1 flex flex-col items-center justify-center p-4 relative bg-orange-50/20 dark:bg-gray-900/50 overflow-hidden group">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, activeTab as any)} />
                  {formsData[activeTab].preview ? (
                    <img src={formsData[activeTab].preview!} alt="Preview" className="max-w-full max-h-full rounded-xl shadow-lg object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="bg-white p-6 rounded-full shadow-md text-orange-500 group-hover:scale-110 transition-transform"><Camera size={48} /></div>
                      <div>
                        <p className="font-black text-gray-700 text-sm">Clique para carregar foto do desenho</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={runAnalysis}
                  disabled={loading || !formsData[activeTab].preview}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <ScanText size={20} />}
                  <span>{loading ? "Processando..." : "Classificar Desenho com IA"}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl border dark:border-gray-700 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-8 shrink-0">
                  <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600"><Brain size={24} /></div>
                  <span className="font-black text-lg text-gray-800 dark:text-white">Parecer da PedagogIA</span>
                </div>
                {renderAnalysisContent()}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 gap-4 shrink-0">
          <div className="flex-1">
            {errorMessage && <div className="bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2 p-3 rounded-xl border border-red-100"><AlertCircle size={14} /> {errorMessage}</div>}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onCancel} className="px-8 py-4 font-black text-gray-500 hover:text-gray-700">Cancelar</button>
            <button
              onClick={() => {
                const assessmentId = `${student.id}_${activeTab}_${selectedPeriod}`;
                onSave({
                  ...formsData[activeTab].analysis,
                  id: assessmentId,
                  studentId: student.id,
                  date: new Date().toISOString(),
                  type: activeTab,
                  period: selectedPeriod,
                  imageUrl: formsData[activeTab].preview
                });
              }}
              disabled={!formsData[activeTab].analysis}
              className="px-12 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 text-white rounded-2xl font-black shadow-lg transition-all min-w-[220px]"
            >
              Confirmar e Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
