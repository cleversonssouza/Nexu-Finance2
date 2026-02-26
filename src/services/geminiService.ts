import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getFinancialInsights(data: any) {
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
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting insights:", error);
    return ["Mantenha o foco em suas metas financeiras.", "Revise seus gastos fixos este mês.", "Considere criar uma reserva de emergência."];
  }
}
