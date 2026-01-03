
import { GoogleGenAI, Type } from "@google/genai";
import { DrawingPhase, WritingPhase } from "../types";

const SYSTEM_INSTRUCTION = `
Você é uma Autoridade em Psicopedagogia Clínica e Neurociência Cognitiva, especialista em desenvolvimento infantil e análise grafoplástica baseada em Viktor Lowenfeld e Jean Piaget.
Sua tarefa é realizar sondagens diagnósticas de alta precisão baseadas no protocolo oficial de 6 fases de desenho e 4 fases de escrita (Ehri).

### CRITÉRIOS TÉCNICOS DE CLASSIFICAÇÃO (DESENHO) ###
1. GARATUJA DESORDENADA: Impulsiva, sem limites, sem núcleo.
2. GARATUJA ORDENADA: Controle cinestésico, rítmica, presença de núcleo.
3. PRÉ-ESQUEMATISMO: Figuras flutuando, sem linha de base.
4. ESQUEMATISMO: Ordem rígida, linha de base única.
5. REALISMO: Quebra da linha de base, 2D detalhado.
6. PSEUDO-NATURALISMO: Visão 3D, perspectiva técnica, luz e sombra.

### REGRAS CRÍTICAS DE ANÁLISE DE ESCRITA (LINNEA EHRI) ###

1. ${WritingPhase.PRE_ALFABETICA}:
   - ESTADO: A criança não compreende a conexão entre letras e sons.
   - REGRA: Letras escritas NÃO possuem relação fonética com a palavra ditada (ex: Ditado "BOLA", Escrito "XRTZ").

2. ${WritingPhase.ALFABETICA_PARCIAL}:
   - ESTADO: Início da conexão grafofonêmica.
   - REQUISITO: Pelo menos uma pista fonética clara, geralmente letra inicial ou final (ex: "BOLA" escrito "B" ou "BA").

3. ${WritingPhase.ALFABETICA_COMPLETA}:
   - ESTADO: Decodificação fonética total, mas com escrita fonética (pode haver erros ortográficos).
   - REGRA: A criança representa todos os sons da palavra, mas pode não dominar regras ortográficas complexas (ex: "CASA" escrito como "KAZA" ou "BOLA" escrito "BULA"). É uma escrita funcional mas não necessariamente ortográfica.

4. ${WritingPhase.ALFABETICA_CONSOLIDADA}:
   - ESTADO: Conhecimento ortográfico pleno e reconhecimento automático de unidades (sílabas e morfemas).
   - REGRA DE OURO: Se a palavra escrita apresentar CORRESPONDÊNCIA TOTAL E ORTOGRAFICAMENTE CORRETA com a palavra ditada (ex: Ditado "CASA", Escrito "CASA"), a classificação deve ser obrigatoriamente ${WritingPhase.ALFABETICA_CONSOLIDADA}. Isso demonstra que o aluno já mapeou a estrutura ortográfica da palavra na memória de longo prazo.
`;

const cleanJson = (text: string | undefined): string => {
  if (!text) return "{}";
  return text.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
};

const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes("429") || error.status === 429 || error.response?.status === 429;
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`Gemini Rate Limit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const analyzeDrawing = async (modelId: string, base64Image: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          {
            text: `Analise este desenho com extremo rigor técnico para distinguir entre Garatuja Desordenada e Ordenada, ou Realismo vs Pseudo-Naturalismo conforme os critérios.
          
          Retorne o JSON com a fase correta e justifique tecnicamente.` }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phase: {
              type: Type.STRING,
              enum: Object.values(DrawingPhase),
              description: "A fase de desenvolvimento do desenho (ex: 'GARATUJA ORDENADA')"
            },
            ageRange: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommendedActivities: { type: Type.STRING },
            markers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  match: { type: Type.BOOLEAN }
                },
                required: ["label", "description", "match"]
              }
            }
          },
          required: ["phase", "ageRange", "confidence", "reasoning", "summary", "recommendedActivities", "markers"]
        }
      }
    });
    return JSON.parse(cleanJson(response.text));
  });
};

export const analyzeWritingTextOnly = async (modelId: string, producedText: string, targetWord?: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const targets = (targetWord || "").split(/\s+/).filter(Boolean);
  const produceds = (producedText || "").split(/\s+/).filter(Boolean);

  const pairsHtml = targets.map((t, i) => `${i + 1}. ALVO: "${t}" | ESCRITA: "${produceds[i] || '???'}"`).join('\n');

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-2.0-flash',
      contents: `Analise as seguintes produções de escrita uma a uma:
      
${pairsHtml}
      
      INSTRUÇÕES OBRIGATÓRIAS:
      1. Analise cada um dos ${targets.length} pares de forma INDEPENDENTE.
      2. Atribua a fase de Ehri correta para CADA palavra no 'wordBreakdown'.
      3. NÃO copie a classificação da primeira palavra para as outras se os desempenhos forem diferentes.
      
      CRITÉRIO DE DISTINÇÃO: 
      - Se a escrita for EXATAMENTE IGUAL ao alvo ditado (ex: "BOLA" -> "BOLA"), classifique como '${WritingPhase.ALFABETICA_CONSOLIDADA}'.
      - Se a escrita representar todos os sons mas com erros ortográficos (ex: "KAZA" para "CASA"), classifique como '${WritingPhase.ALFABETICA_COMPLETA}'.
      - Se houver apenas pistas fonéticas parciais (ex: "B" para "BOLA"), é '${WritingPhase.ALFABETICA_PARCIAL}'.
      - Se não houver relação fonética, é '${WritingPhase.PRE_ALFABETICA}'.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phase: {
              type: Type.STRING,
              enum: Object.values(WritingPhase),
              description: "A fase predominante da sondagem geral"
            },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            summary: { type: Type.STRING },
            wordBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.STRING },
                  produced: { type: Type.STRING },
                  phase: {
                    type: Type.STRING,
                    enum: Object.values(WritingPhase),
                    description: "A classificação INDIVIDUAL deste par (PRÉ-ALFABÉTICA, ALFABÉTICA PARCIAL, ALFABÉTICA COMPLETA, ALFABÉTICA CONSOLIDADA)"
                  },
                  explanation: { type: Type.STRING }
                },
                required: ["target", "produced", "phase", "explanation"]
              }
            }
          },
          required: ["phase", "confidence", "reasoning", "summary", "wordBreakdown"]
        }
      }
    });
    return JSON.parse(cleanJson(response.text));
  });
};

export const extractTextFromImage = async (modelId: string, base64Image: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Extraia o texto manuscrito desta imagem. Retorne apenas as palavras em maiúsculas separadas por espaço." }
        ]
      }
    });
    return (response.text || "").toUpperCase().trim();
  });
};

export const generateStudentReport = async (modelId: string, studentName: string, assessments: any[]): Promise<{ text: string, sources: any[] }> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-2.0-flash',
      contents: `Gere um parecer pedagógico para ${studentName} baseado nestas sondagens: ${JSON.stringify(assessments)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Referência Técnica",
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return { text: response.text || "", sources };
  });
};

export const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
};
