
import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

export const generateStockPrompts = async (
  options: PromptOptions, 
  apiKey: string,
  sessionHistory: HistoricalPrompt[] = []
): Promise<{text: string, score: number}[]> => {
  
  // Use provided key or fallback to environment key
  const finalKey = apiKey || process.env.API_KEY;

  if (!finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalKey });

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
                description: "Internal quality score (1-100) based on uniqueness and commercial appeal." 
              }
            },
            required: ["text", "qualityScore"]
          }
        }
      },
      required: ["prompts"]
    };

    let materialGuidance = `Material Finish: ${options.materialStyle}. `;
    if (options.visualType.includes('3D')) {
      materialGuidance += "Technical: PBR shaders, ambient occlusion, realistic ray-tracing. ";
    }

    let visualTypeGuidance = "";
    switch (options.visualType) {
      case '3D illustration':
        visualTypeGuidance = `Style: High-end 3D render, ${options.visual3DStyle} shapes, ${materialGuidance} vibrant professional palette.`;
        break;
      case '3D icon':
        visualTypeGuidance = `Style: Premium 3D icon isolated on center, ${materialGuidance} soft ambient light.`;
        break;
      case 'Minimalist Vector':
        visualTypeGuidance = `Style: Modern flat corporate vector, clean solid colors, commercially high appeal.`;
        break;
      default:
        visualTypeGuidance = `Style: High-end commercial stock photography, prime lens bokeh, ${materialGuidance}, authentic textures.`;
    }

    let backgroundGuidance = options.environment === 'Default / Auto' 
      ? "Setting: Aesthetically pleasing context that matches the subject's story."
      : `Setting: Realistic ${options.environment}.`;

    const historyContext = sessionHistory.length > 0 
      ? `Avoid these specific previous themes: ${sessionHistory.slice(0, 5).map(h => h.text.substring(0, 50)).join('; ')}`
      : "";

    const systemPrompt = `Expert Stock Prompt Architect Task.
    Generate ${options.quantity} unique, high-conversion prompts for Adobe Stock/Freepik.
    ${historyContext}
    
    Constraints:
    - Subject: ${options.subject} (${options.characterBackground} heritage)
    - Style: ${visualTypeGuidance}
    - Scene: ${backgroundGuidance}
    - Lighting: ${options.lighting}
    - View: ${options.framing}, ${options.subjectPosition}, ${options.cameraAngle}
    - Shadows: ${options.shadowStyle}
    ${options.useCalendar ? `- Event: ${options.calendarMonth} ${options.calendarEvent}` : ''}
    ${options.useExtraKeywords ? `- User Refinement: ${options.extraKeywords}` : ''}

    Standards: Commercially safe, technically descriptive. Avoid buzzwords like 'photorealistic'.
    Return JSON per schema.`;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.8,
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({
      text: p.text,
      score: p.qualityScore
    }));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
