
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

export const generateAIImage = async (
  prompt: string,
  aspectRatio: string = "1:1",
  inputImage?: { data: string, mimeType: string },
  styleReferenceImage?: { data: string, mimeType: string },
  isWhiteBackground: boolean = false,
  isDesignMode: boolean = false
) => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];

    // Add Input Image (Subject)
    if (inputImage) {
      parts.push({ inlineData: { data: inputImage.data, mimeType: inputImage.mimeType } });
    }

    // Add Style Reference Image
    if (styleReferenceImage) {
      parts.push({ inlineData: { data: styleReferenceImage.data, mimeType: styleReferenceImage.mimeType } });
    }

    // Construct Text Prompt
    let fullPrompt = prompt;
    let systemModifiers = "";

    // Add Mode Modifiers
    if (isDesignMode) {
      systemModifiers += " [DESIGN MODE ACTIVE: Focus strictly on the PRODUCT DESIGN (e.g. jewelry, object). REMOVE all mannequins, stands, human skin, necks, and cluttered backgrounds. Isolate the object completely. Output should look like a high-end clean catalog shot or 3D render.]";
    }
    if (isWhiteBackground) {
      systemModifiers += " [WHITE BACKGROUND MODE: The background MUST be pure white (#FFFFFF). Remove all other background elements.]";
    }

    if (inputImage && styleReferenceImage) {
      fullPrompt = `[IMAGE 1 is the INPUT SUBJECT. IMAGE 2 is the STYLE/BACKGROUND REFERENCE]. 
        Task: Transfer the PRODUCT DESIGN from Image 1 onto the STYLE and BACKGROUND of Image 2.
        1. Keep the SHAPE and DESIGN of the subject from Image 1 EXACTLY as is.
        2. Apply the LIGHTING, BACKGROUND, and MATERIAL RENDERING style from Image 2 to the subject from Image 1.
        3. If Design Mode is active, ensure no mannequins or stands from Image 1 are preserved.
        User Prompt: ${prompt}
        ${systemModifiers}`;
    } else if (inputImage) {
      fullPrompt = `Modify this image: ${prompt} ${systemModifiers}`;
    } else if (styleReferenceImage) {
      fullPrompt = `Create an image based on this reference style: ${prompt} ${systemModifiers}`;
    } else {
      fullPrompt = `${prompt} ${systemModifiers}`;
    }

    parts.push({ text: fullPrompt });

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
