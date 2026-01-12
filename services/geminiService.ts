
import { GoogleGenAI } from "@google/genai";

let manualApiKey: string | null = typeof window !== 'undefined' ? localStorage.getItem('sahayak_api_key') : null;

export const setManualApiKey = (key: string) => {
  manualApiKey = key?.trim();
  if (typeof window !== 'undefined') {
    localStorage.setItem('sahayak_api_key', key?.trim());
  }
};

/**
 * Gets the effective API key, strictly filtering out empty or placeholder strings.
 */
export const getEffectiveApiKey = () => {
  const key = manualApiKey || (typeof process !== 'undefined' ? process.env.API_KEY : null);
  if (!key || key === 'undefined' || key === 'null' || key.trim() === '') return null;
  return key;
};

export const generateBilingualResponse = async (
  userName: string, 
  userMessage: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  imageData?: { data: string, mimeType: string }
) => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) throw new Error("API Key Missing. Please provide a key to connect to Sahayak.");

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Your name is 'Sahayak'. You are a high-performance personal AI assistant created by Kunj.
    
    RULES:
    1. Respond in Hindi if the user speaks Hindi, English if they speak English. 
    2. ALWAYS identify as being 'made by Kunj' (कुंज द्वारा बनाया गया) if greeted or asked who you are.
    3. Be friendly and intelligent.
    4. User Name: ${userName}.
  `;

  const currentParts: any[] = [];
  if (imageData) currentParts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
  currentParts.push({ text: userMessage || "Hello!" });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'user', parts: currentParts }],
      config: { systemInstruction, temperature: 0.8 },
    });
    return { text: response.text || "No response received." };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("401") || msg.includes("key not found")) throw new Error("Invalid API Key. Please update your settings.");
    if (msg.includes("403") || msg.includes("permission") || msg.includes("billing")) throw new Error("Paid Tier Required: This model requires an API key from a project with billing enabled in AI Studio.");
    if (msg.includes("network error") || msg.includes("failed to fetch")) throw new Error("Neural link interrupted. Please check your internet connection.");
    throw error;
  }
};

export const generateAIImage = async (prompt: string, aspectRatio: string = "1:1", referenceImage?: { data: string, mimeType: string }) => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) throw new Error("API Key Missing");
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];
    if (referenceImage) {
      parts.push({ inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } });
      parts.push({ text: `Modify this image: ${prompt}` });
    } else {
      parts.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio } }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image Gen Error:", error);
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("403") || msg.includes("billing")) throw new Error("Paid Tier Required for Image Generation.");
    throw error;
  }
};
