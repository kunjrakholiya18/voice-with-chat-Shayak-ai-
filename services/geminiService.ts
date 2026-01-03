
import { GoogleGenAI } from "@google/genai";

/**
 * Generate a language-matched response (English or Hindi) 
 * based on the user's input language.
 */
export const generateBilingualResponse = async (
  userName: string, 
  userMessage: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  imageData?: { data: string, mimeType: string }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Your name is 'Sahayak'. You are an expert and deeply knowledgeable personal AI assistant for ${userName}.
    
    STRICT LANGUAGE RULES:
    1. Detect the language of the user's message.
    2. If the user speaks English -> Respond ONLY in English.
    3. If the user speaks Hindi/Hinglish -> Respond ONLY in Hindi.
    4. NEVER provide bilingual responses unless specifically asked.
    
    DETAIL & DEPTH RULES:
    1. Provide EXTREMELY DETAILED, comprehensive, and thorough explanations. 
    2. DO NOT be concise. Give as much information as possible to satisfy the query fully.
    3. Use formatting like bullet points, headers, or numbered lists to make long, detailed answers easy to read.
    
    GREETING RULES:
    1. DO NOT repeat greetings like "Hello ${userName}" or "नमस्ते ${userName}" in every single message.
    2. Only greet the user if it is the very beginning of the session or if they specifically greet you. 
    3. For follow-up questions, dive straight into the detailed answer without repeating the greeting.
    
    TONE:
    Be professional, intellectual, and highly supportive.
  `;

  const currentParts: any[] = [];
  
  if (imageData) {
    currentParts.push({
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType
      }
    });
  }
  
  currentParts.push({ text: userMessage || "Hello!" });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for more detailed reasoning
      contents: [
        ...history,
        { role: 'user', parts: currentParts }
      ],
      config: {
        systemInstruction,
        temperature: 0.8, // Slightly higher for more detailed creative output
      },
    });

    return { text: response.text || "I apologize, I couldn't generate a response." };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("Sahayak connection failed. Please check your internet connection.");
  }
};

/**
 * Generate images based on text prompts.
 */
export const generateAIImage = async (prompt: string, referenceImage?: { data: string, mimeType: string }) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};
