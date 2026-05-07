import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. Gemini features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCompletionDua = async (familyName: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "اللهم تقبل منا ومنكم صالح الأعمال.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, heart-touching Islamic Dua (supplication) in Arabic for the '${familyName}' family who has just finished reading the entire Quran (Khatma). Keep it under 50 words and very encouraging.`,
    });
    return response.text || "اللهم تقبل منا ومنكم.";
  } catch (error) {
    console.error("Error generating dua:", error);
    return "اللهم اجعل القرآن ربيع قلوبنا ونور صدورنا.";
  }
};
