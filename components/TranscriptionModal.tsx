
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Loader2, Save, X, FileText, AlertTriangle, Sparkles, Brain, CalendarDays, Pencil, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, Trash2, Wand2, Info, GraduationCap, History, AlertCircle } from 'lucide-react';
import { Student, AssessmentResult, AssessmentType, AssessmentPeriod, WritingPhase } from '../types';
import { analyzeWritingTextOnly, extractTextFromImage } from '../services/geminiService';

interface Props {
  student: Student;
  assessments: AssessmentResult[];
  onClose: () => void;
  onSave: (result: AssessmentResult) => void;
  selectedModel: string;
}

const PERIODS: AssessmentPeriod[] = ['Inicial', '1º Bim', '2º Bim', '3º Bim', '4º Bim'];

const SUGGESTED_WORDS: Record<string, string[]> = {
  'Palavra de alta frequência': ['CACHORRO', 'CASA', 'CADEIRA', 'BOLA', 'CAMISA'],
  'Palavra de baixa frequência': ['ORNITORRINCO', 'ALCACHOFRA', 'CANDELABRO', 'GEADA', 'HELICÓPTERO'],
  'Palavra irregular': ['GENTE', 'IOGURTE', 'SOFÁ', 'XALE', 'ADVOGADO'],
  'Palavra regida por regras': ['PEIXE', 'PÃO', 'LÂMPADA', 'BONECA', 'SAPATO'],
  'Pseudopalavras': ['FRANECO', 'GRANISU', 'FALUME', 'BELUCO', 'LUMETRA'],
};

const RECOMMENDED_ACTIVITIES: Record<string, string> = {
  [WritingPhase.PRE_ALFABETICA]: "PRÉ-ALFABÉTICO: Ensino focado em consciência fonológica e conhecimento alfabético. É aconselhável trabalhar o reconhecimento e nomeação das letras, além de explorar rimas e jogos de sons na fala. Ler em voz alta para a criança amplia seu vocabulário e familiariza-a com estruturas textuais. Ehri recomenda, especificamente, que nessa fase o trabalho dos educadores seja dirigido à linguagem oral (ampliar vocabulário) e à conscientização dos sons da fala, preparando a criança para perceber que as palavras são formadas de fonemas. Em resumo, investe-se em familiarização com letras e sons sem exigir decodificação completa.",
  [WritingPhase.ALFABETICA_PARCIAL]: "FASE ALFABÉTICO PARCIAL: O foco deve ser o ensino sistemático de letras e fonemas e o fortalecimento da consciência fonêmica. Brincadeiras com sons (rimas, jogos de adição e substituição de letras) ajudam a criança a perceber que palavras são compostas de fonemas. Ehri sugere atividades que destaquem as letras de início e fim das palavras e permitam à criança “escutar” e escrever os sons que ouve. Por exemplo, mudar a consoante inicial de “ato” para formar “mato, pato, rato” fortalece a percepção dos fonemas iniciais; e exercícios de ditado fonético (aceitando grafias aproximadas) encorajam a criança a representar sons com letras, mesmo que ainda assinale apenas os fonemas-chave. Resumindo: ensina-se sistematicamente os sons das letras conhecidas e exercícios de segmentação simples, sempre valorizando o progresso parcial (por ex., aceitando “VRN” para “verão” enquanto amplia-se o conhecimento).",
  [WritingPhase.ALFABETICA_COMPLETA]: "ALFABÉTICA COMPLETA: O foco é ensino sistemático de fonética e prática intensiva de decodificação. Nesse período deve-se explorar scope and sequence de fonemas e grafemas (como no método fônico), ensinando a segmentação e a fusão dos sons. Ehri indica exercícios de leitura em voz alta e de escrita de ditados fonéticos, para reforçar a conexão ortografia–pronúncia na memória. Por exemplo, ler em voz alta junto com a criança ajuda a “colar” grafia e fonologia de novas palavras: a criança lê palavra por palavra enquanto pronuncia cada sílaba, fortalecendo o mapeamento ortográfico. Outras dicas incluem o ensino de palavras em contexto (frases) para reforçar a compreensão dos fonemas em diferentes posições e familiarizar-se com exceções. Em resumo, consolidam-se as correspondências som-letra conhecidas e introduzem-se sistematicamente as restantes, promovendo cada vez mais fluência.",
  [WritingPhase.ALFABETICA_CONSOLIDADA]: "ALFABÉTICA CONSOLIDADA: ensino explora padrões ortográficos e consciência silábica/morfológica. Ensinar a isolar sílabas e morfemas em palavras novas acelera a memorização delas. Por exemplo, atividades que levem a criança a dividir “INTERESSANTE” em “in–ter–es–san–te” ao ler e falar ajudam a fixar cada sílaba. Ferramentas como quadros de construção de palavras (montar familias com prefixos e sufixos) também reforçam a visão de unidades consolidadas. O vocabulário e a leitura fluente crescem quando a criança pratica a aplicação desses padrões em contextos diversos. De modo geral, recomenda-se incentivar a leitura de textos com palavras complexas e a análise de suas partes (jogos de sílabas, quebra-cabeças silábicos) para automatizar o reconhecimento de unidades ortográficas maiores."
};

const CANONICAL_WRITING_PHASES = [
  WritingPhase.PRE_ALFABETICA,
  WritingPhase.ALFABETICA_PARCIAL,
  WritingPhase.ALFABETICA_COMPLETA,
  WritingPhase.ALFABETICA_CONSOLIDADA
];

const PHASE_HIERARCHY: Record<string, number> = {
  [WritingPhase.PRE_ALFABETICA]: 0,
  'PRE-ALFABETICA': 0,
  'PRE-ALFABÉTICA': 0,
  'PRÉ-ALFABÉTICA': 0,
  'PRE ALFABETICA': 0,
  'PRÉ-ALFABÉTICO': 0,
  [WritingPhase.ALFABETICA_PARCIAL]: 1,
  'ALFABETICA PARCIAL': 1,
  'ALFABÉTICA PARCIAL': 1,
  'ALFABÉTICO PARCIAL': 1,
  [WritingPhase.ALFABETICA_COMPLETA]: 2,
  'ALFABETICA COMPLETA': 2,
  'ALFABÉTICA COMPLETA': 2,
  [WritingPhase.ALFABETICA_CONSOLIDADA]: 3,
  'ALFABETICA CONSOLIDADA': 3,
  'ALFABÉTICA CONSOLIDADA': 3
};

export const TranscriptionModal: React.FC<Props> = ({ student, assessments, onClose, onSave, selectedModel }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [targetWord, setTargetWord] = useState<string>('');
  const [producedText, setProducedText] = useState<string>('');
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AssessmentPeriod>('Inicial');
  const [hasExistingAssessment, setHasExistingAssessment] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionPhase, setActiveSuggestionPhase] = useState<string | null>(null);
  const [showRecommendedActivities, setShowRecommendedActivities] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar se existe classificação para o período selecionado
  useEffect(() => {
    const existingAssessment = assessments.some(
      a => a.studentId === student.id &&
        a.type === AssessmentType.WRITING &&
        a.period === selectedPeriod
    );
    setHasExistingAssessment(existingAssessment);
  }, [selectedPeriod, assessments, student.id]);

  const normalizePhase = (phase: string): string => {
    return phase.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const calculateFinalPhase = (wordBreakdown: any[]): string => {
    if (!wordBreakdown || wordBreakdown.length === 0) return WritingPhase.PRE_ALFABETICA;

    const counts: Record<string, number> = {};
    wordBreakdown.forEach(item => {
      const p = normalizePhase(item.phase);
      const canonical = CANONICAL_WRITING_PHASES.find(cw => normalizePhase(cw) === p || normalizePhase(cw).includes(p) || p.includes(normalizePhase(cw)));
      const phaseKey = canonical || item.phase;
      counts[phaseKey] = (counts[phaseKey] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(counts));
    const candidates = Object.keys(counts).filter(phase => counts[phase] === maxFreq);

    let winner;
    if (candidates.length === 1) {
      winner = candidates[0];
    } else {
      winner = candidates.reduce((highest, current) => {
        const highestScore = PHASE_HIERARCHY[highest] ?? PHASE_HIERARCHY[normalizePhase(highest)] ?? -1;
        const currentScore = PHASE_HIERARCHY[current] ?? PHASE_HIERARCHY[normalizePhase(current)] ?? -1;
        return currentScore > highestScore ? current : highest;
      });
    }

    const normalizedWinner = normalizePhase(winner);
    return CANONICAL_WRITING_PHASES.find(p => normalizePhase(p) === normalizedWinner) || winner;
  };

  const predominantPhase = useMemo(() => {
    if (!analysisResult || !analysisResult.wordBreakdown) return '-';
    return calculateFinalPhase(analysisResult.wordBreakdown);
  }, [analysisResult]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setEvidencePreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleExtractText = async () => {
    if (!evidencePreview) return;
    setIsExtracting(true);
    setError(null);
    try {
      const base64 = evidencePreview.split(',')[1];
      const result = await extractTextFromImage(selectedModel, base64);
      setProducedText(result);
    } catch (err: any) {
      setError(`Erro na extração: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClassifyWriting = async () => {
    if (!producedText.trim()) {
      setError("Por favor, preencha as 'PALAVRAS ESCRITAS'.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setWarning(null);
    setShowRecommendedActivities(false);

    // Save current word selection
    if (targetWord.trim()) {
      localStorage.setItem('ultima_selecao_palavras', targetWord.trim());
    }

    try {
      const result = await analyzeWritingTextOnly(selectedModel, producedText, targetWord);

      // Normalize individual word phases to match enum exactly (prevents UI mismatch)
      if (result && result.wordBreakdown) {
        result.wordBreakdown = result.wordBreakdown.map((item: any) => {
          const norm = normalizePhase(item.phase);
          const canonical = CANONICAL_WRITING_PHASES.find(cw => normalizePhase(cw) === norm);
          return { ...item, phase: canonical || item.phase };
        });
      }

      setAnalysisResult(result);
    } catch (err: any) {
      setError(`Erro na classificação: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveResult = () => {
    if (!analysisResult) return;
    onSave({
      id: crypto.randomUUID(),
      studentId: student.id,
      date: new Date().toISOString(),
      type: AssessmentType.WRITING,
      period: selectedPeriod,
      phase: predominantPhase,
      notes: `Ditadas: ${targetWord}\nEscritas: ${producedText}\n\n${analysisResult.summary}`,
      reasoning: analysisResult.reasoning,
      confidence: analysisResult.confidence,
      imageUrl: evidencePreview || undefined
    });
  };

  const handleDiscard = () => {
    setTargetWord('');
    setProducedText('');
    setEvidencePreview(null);
    setAnalysisResult(null);
    setError(null);
    setWarning(null);
    setShowSuggestions(false);
    setActiveSuggestionPhase(null);
    setShowRecommendedActivities(false);
  };

  const selectSuggestedWord = (word: string) => {
    const current = targetWord.trim();
    const newWords = current ? `${current} ${word}` : word;
    setTargetWord(newWords);
    if (newWords.split(/\s+/).filter(Boolean).length >= 5) {
      setShowSuggestions(false);
      setActiveSuggestionPhase(null);
    }
  };

  const handleLoadLastSelection = () => {
    const last = localStorage.getItem('ultima_selecao_palavras');
    if (last) {
      setTargetWord(last);
    }
  };

  const handleUpdatePhase = (index: number, newPhase: string) => {
    if (!analysisResult) return;

    const updatedBreakdown = [...analysisResult.wordBreakdown];
    updatedBreakdown[index] = {
      ...updatedBreakdown[index],
      phase: newPhase,
      explanation: `Classificação alterada manualmente para ${newPhase}.`
    };

    setAnalysisResult({
      ...analysisResult,
      wordBreakdown: updatedBreakdown
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl">
            <Pencil size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black dark:text-white">Sondagem de Escrita (Linnea Ehri)</h3>
            <p className="text-sm text-gray-500 font-bold">{student.name}</p>
          </div>
        </div>

        {hasExistingAssessment && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 px-6 mb-6 flex items-center gap-3 animate-fade-in rounded-2xl">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-500" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
              Aluno já classificado neste período. Caso continue, a classificação anterior será sobreposta.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LADO ESQUERDO: INPUTS */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                <CalendarDays size={14} className="text-blue-500" />
                <span>Período da Sondagem</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setSelectedPeriod(p)} className={`py-2 px-1 rounded-xl text-[9px] font-black transition-all border-2 ${selectedPeriod === p ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-gray-700 text-gray-400 border-gray-100 dark:border-gray-600 hover:border-blue-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-gray-900 border border-blue-100 p-6 rounded-3xl relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  <FileText size={14} /> PALAVRAS DITADAS:
                </div>
                <button onClick={() => setShowSuggestions(!showSuggestions)} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-full text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 transition-colors shadow-sm">
                  <Lightbulb size={12} className="text-yellow-500" />
                  <span>Sugestões</span>
                  {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button onClick={handleLoadLastSelection} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-full text-[9px] font-black text-blue-600 uppercase hover:bg-blue-50 transition-colors shadow-sm" title="Carregar última seleção">
                  <History size={12} className="text-purple-500" />
                  <span>Última seleção</span>
                </button>
              </div>
              {showSuggestions && (
                <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-gray-700 animate-fade-in shadow-inner">
                  {!activeSuggestionPhase ? (
                    <div className="grid grid-cols-1 gap-1">
                      {Object.keys(SUGGESTED_WORDS).map(category => (
                        <button key={category} onClick={() => setActiveSuggestionPhase(category)} className="w-full text-left p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between group transition-colors border border-transparent hover:border-amber-200">
                          {category} <ChevronDown size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <button onClick={() => setActiveSuggestionPhase(null)} className="mb-2 text-[9px] font-black text-amber-600 uppercase flex items-center gap-1 hover:underline">← Voltar</button>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_WORDS[activeSuggestionPhase].map(word => (
                          <button key={word} onClick={() => selectSuggestedWord(word)} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-[10px] font-black border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm">{word}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <textarea value={targetWord} onChange={(e) => setTargetWord(e.target.value.toUpperCase())} className="w-full bg-transparent border-none focus:ring-0 text-lg font-black text-gray-800 dark:text-gray-100 leading-relaxed outline-none resize-none" placeholder="DIGITE OU USE SUGESTÕES..." rows={2} />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
              {evidencePreview ? (
                <div className="relative group w-full flex flex-col items-center">
                  <img src={evidencePreview} alt="Preview" className="max-h-48 rounded-xl shadow-md mb-4" />
                  <div className="flex gap-2">
                    <button onClick={handleExtractText} disabled={isExtracting} className="px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-md disabled:bg-gray-300">
                      {isExtracting ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} Analisar Escrita
                    </button>
                    <button onClick={() => setEvidencePreview(null)} className="p-2 bg-red-100 text-red-600 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">
                    <ImageIcon size={18} className="inline mr-2" /> Selecionar Foto da Escrita
                  </button>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <p className="text-[10px] font-black text-gray-400 uppercase">Extraia o texto da imagem automaticamente</p>
                </div>
              )}
            </div>

            <div className="bg-orange-50 dark:bg-gray-900 border border-orange-100 p-6 rounded-3xl">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                <Pencil size={14} /> PALAVRAS ESCRITAS PELO ALUNO:
              </div>
              <textarea value={producedText} onChange={(e) => setProducedText(e.target.value.toUpperCase())} className="w-full bg-transparent border-none focus:ring-0 text-lg font-black text-gray-800 dark:text-gray-100 leading-relaxed outline-none resize-none" placeholder="RESULTADO DO SCAN OU DIGITE..." rows={2} />
            </div>

            <button onClick={handleClassifyWriting} disabled={isAnalyzing || !producedText.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl transition-all disabled:bg-gray-300">
              {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Classificar com IA
            </button>
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold flex items-center gap-2"><AlertTriangle size={18} /> {error}</div>}
          </div>

          {/* LADO DIREITO: RESULTADOS */}
          <div className="flex flex-col h-full space-y-6">
            {analysisResult ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-6 shrink-0">
                  <Brain className="text-orange-600" size={24} />
                  <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Relatório de Classificação Ehri</h4>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 custom-scrollbar">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Análise por Par de Palavra:</p>
                  {analysisResult.wordBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border dark:border-gray-700 shadow-sm transition-all hover:border-orange-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black text-gray-400 uppercase">Ditada</span>
                          <p className="text-xs font-black text-blue-600">{item.target}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[8px] font-black text-gray-400 uppercase">Escrita</span>
                          <p className="text-xs font-black text-orange-600">{item.produced}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t dark:border-gray-700 space-y-2">
                        <select
                          value={item.phase}
                          onChange={(e) => handleUpdatePhase(idx, e.target.value)}
                          className="inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 rounded text-[9px] font-black uppercase border-none focus:ring-0 cursor-pointer appearance-none hover:bg-orange-200 transition-colors w-full"
                          title="Clique para alterar a classificação manual"
                        >
                          {CANONICAL_WRITING_PHASES.map(phase => (
                            <option key={phase} value={phase}>{phase}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight italic">{item.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SESSÃO FASE PREDOMINANTE E ATIVIDADES (INFERIOR DIREITA) */}
                <div className="bg-orange-50 dark:bg-orange-950/20 p-5 rounded-3xl border border-orange-100 dark:border-orange-900/30 shrink-0 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Resultado Final (Sondagem):</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xl font-black text-orange-700 dark:text-orange-300 leading-tight">
                        {predominantPhase}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">* Cálculo predominante com desempate por nível superior.</p>
                    </div>

                    {RECOMMENDED_ACTIVITIES[predominantPhase] && (
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowRecommendedActivities(!showRecommendedActivities)}
                          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-all border border-blue-100 shadow-sm"
                        >
                          <GraduationCap size={14} />
                          Atividades recomendadas
                          {showRecommendedActivities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showRecommendedActivities && (
                          <div className="p-4 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-blue-50 dark:border-gray-700 animate-fade-in shadow-inner max-h-40 overflow-y-auto custom-scrollbar">
                            <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                              {RECOMMENDED_ACTIVITIES[predominantPhase]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-6 shrink-0">
                  <button onClick={handleSaveResult} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl transition-all">
                    <Save size={18} /> Salvar Sondagem
                  </button>
                  <button onClick={() => { setAnalysisResult(null); setShowRecommendedActivities(false); }} className="w-full py-2 text-gray-400 font-bold text-xs uppercase hover:text-gray-600">Refazer Classificação</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <Sparkles size={64} className="text-gray-200 mb-4" />
                <h4 className="text-lg font-black text-gray-400 uppercase">Aguardando Classificação</h4>
                <p className="text-sm text-gray-400 mt-2">Os resultados da IA aparecerão aqui após clicar no botão.</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleDiscard} className="text-gray-400 font-bold text-xs uppercase hover:text-red-500 transition-colors mx-auto block mt-8">Limpar Todos os Campos</button>
      </div>
    </div>
  );
};
