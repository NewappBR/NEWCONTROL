
import { GoogleGenAI, Type } from "@google/genai";
import { Order } from "../types";

// Helper to get fresh instance of AI with updated API Key from environment
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getProductionInsights(orders: Order[]) {
  const activeOrders = orders.filter(o => !o.isArchived);
  const prompt = `
    Analise a seguinte lista de ordens de produção (PCP) ativas e forneça um resumo executivo e sugestões de otimização:
    ${JSON.stringify(activeOrders)}

    Considere:
    1. Análise de Carga Total: Quantas ordens por fase?
    2. Estimativa Temporal: Baseado nas datas de entrega, quais dias estão sobrecarregados?
    3. Otimização de Agenda: Se houver muitos itens no mesmo dia, sugira quais mover para datas anteriores ou posteriores com base na prioridade.
    4. Riscos: Destaque atrasos críticos.
    
    Responda em Português de forma direta e técnica.
  `;

  try {
    const ai = getAI();
    // Using gemini-3-flash-preview for general text analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // response.text is a getter, not a function
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights do Gemini:", error);
    return "Não foi possível carregar os insights inteligentes no momento.";
  }
}

export async function getOptimizationSchedule(orders: Order[]) {
  const activeOrders = orders.filter(o => !o.isArchived && o.expedicao !== 'Concluído');
  
  const prompt = `
    Com base nas ordens de produção abaixo, gere um plano de otimização de datas de entrega para equilibrar a carga de trabalho.
    Ordens: ${JSON.stringify(activeOrders)}
    
    Objetivo: Nenhuma data deve ter mais de 3 ordens complexas (Prioridade Alta).
    Retorne as sugestões no formato JSON.
  `;

  try {
    const ai = getAI();
    // Using gemini-3-pro-preview for complex reasoning and planning
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  orderId: { type: Type.STRING },
                  suggestedDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                  reason: { type: Type.STRING },
                  priorityScore: { type: Type.NUMBER, description: "1-10" }
                },
                required: ["orderId", "suggestedDate", "reason"]
              }
            }
          }
        }
      }
    });
    
    // response.text is a getter, handle empty or undefined results gracefully
    return JSON.parse(response.text || '{"suggestions":[]}');
  } catch (error) {
    console.error("Erro na otimização da IA:", error);
    return { suggestions: [] };
  }
}
