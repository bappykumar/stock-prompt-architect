
import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

// Exporting model name for UI visibility
export const ACTIVE_MODEL = 'gemini-3-flash-preview';

export const generateStockPrompts = async (options: PromptOptions, sessionHistory: HistoricalPrompt[] = []): Promise<{text: string, score: number}[]> => {
  // Safe access to environment variables for Vercel/Vite
  const env = typeof process !== 'undefined' ? process.env : (import.meta as any).env;
  const apiKey = env?.API_KEY || env?.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        prompts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { 
                type: Type.STRING,
                description: "The full descriptive prompt text."
              },
              qualityScore: { 
                type: Type.INTEGER, 
                description: "Internal quality score (1-100) based on uniqueness, commercial appeal, and richness." 
              }
            },
            required: ["text", "qualityScore"]
          }
        }
      },
      required: ["prompts"]
    };

    let visualTypeGuidance = "";
    switch (options.visualType) {
      case '3D illustration':
        visualTypeGuidance = "Style: High-quality Octane render, 3D character/object, soft clay textures, trending 3D minimalist aesthetic, vibrant professional colors.";
        break;
      case '3D icon':
        visualTypeGuidance = "Style: Premium 3D icon design, glassmorphism elements, high gloss finish, soft ambient lighting, isolated center composition.";
        break;
      case 'Minimalist Vector':
        visualTypeGuidance = "Style: Modern flat vector art, corporate minimalist illustration, clean lines, professional color harmony, high commercial appeal.";
        break;
      default:
        visualTypeGuidance = "Style: Professional high-end stock photography, shot on 85mm or 50mm prime lens, sharp focus, natural skin textures, depth of field.";
    }

    let backgroundGuidance = "";
    if (options.environment === 'White Background') {
      backgroundGuidance = "Setting: Pure #FFFFFF white background, high-key lighting, strictly isolated for easy PNG cut-outs.";
    } else {
      backgroundGuidance = `Setting: Realistic ${options.environment}, ensuring atmospheric depth and contextually relevant details.`;
    }

    let shadowGuidance = options.shadowStyle === 'No Shadow / Flat' 
      ? "Shadows: None, flat uniform lighting." 
      : `Shadows: ${options.shadowStyle}, grounding the subject realistically.`;

    const systemPrompt = `Act as a world-class Prompt Engineer for Adobe Stock and Freepik. 
    Generate ${options.quantity} unique, commercially successful image prompts.
    
    CORE REQUIREMENTS:
    - Subject: ${options.subject} (${options.characterBackground} heritage)
    - Style: ${visualTypeGuidance}
    - Environment: ${backgroundGuidance}
    - Lighting: ${options.lighting}
    - Shot: ${options.framing}, ${options.subjectPosition}, ${options.cameraAngle}
    - Shadow: ${shadowGuidance}
    ${options.useCalendar ? `- Season: ${options.calendarMonth}, Event: ${options.calendarEvent}` : ''}
    ${options.useExtraKeywords ? `- User Instructions: ${options.extraKeywords}` : ''}

    STRICT RULES:
    1. Avoid banned keywords: "photorealistic", "8k", "hyperdetailed", "masterpiece".
    2. Focus on technical descriptions: lens types, materials, specific lighting angles.
    3. Ensure variety: Every prompt in this batch must depict a unique concept.
    4. Compliance: No brand logos, no specific famous people, generic modern clothing only.

    Output pure JSON matching the responseSchema.`;

    const response = await ai.models.generateContent({
      model: ACTIVE_MODEL, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9,
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({
      text: p.text,
      score: p.qualityScore
    }));
  } catch (error: any) {
    console.error("Gemini Execution Error:", error);
    if (error.message?.includes('429')) {
      throw new Error("Quota Exceeded: Your API key has run out of free requests for today. Please wait a few minutes or try another key.");
    }
    throw new Error(error.message || "Failed to generate prompts. Check API key and connection.");
  }
};
