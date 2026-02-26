import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Simple cache to avoid redundant calls and quota issues
const insightsCache: Record<string, { insights: string[], timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export async function getFinancialInsights(data: any) {
  const cacheKey = JSON.stringify(data);
  const now = Date.now();

  if (insightsCache[cacheKey] && (now - insightsCache[cacheKey].timestamp < CACHE_DURATION)) {
    return insightsCache[cacheKey].insights;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this financial data and provide 3 short, actionable insights in Portuguese. 
      Data: ${JSON.stringify(data)}
      Format: JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const insights = JSON.parse(response.text);
    insightsCache[cacheKey] = { insights, timestamp: now };
    return insights;
  } catch (error: any) {
    // Check if it's a quota error
    const isQuotaError = error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED";
    
    if (isQuotaError) {
      console.warn("Gemini API quota exceeded. Using default insights.");
    } else {
      console.error("Error getting insights:", error);
    }
    
    return [
      "Mantenha o foco em suas metas financeiras.",
      "Revise seus gastos fixos este mês.",
      "Considere criar uma reserva de emergência."
    ];
  }
}
