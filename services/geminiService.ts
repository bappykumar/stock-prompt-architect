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

    // Enhanced History Usage: Take up to 40 recent prompts to ensure diversity
    const recentPrompts = sessionHistory.slice(0, 40).map(h => h.text);
    
    let uniquenessInstruction = "";
    if (recentPrompts.length > 0) {
      uniquenessInstruction = `
      CRITICAL DIVERGENCE PROTOCOL (STRICT ENFORCEMENT):
      The following concepts have been recently generated and are BANNED from being repeated.
      
      --- BANNED CONCEPTS HISTORY (Recent ${recentPrompts.length}) ---
      ${recentPrompts.map((p, i) => `[${i+1}] ${p.substring(0, 150)}...`).join('\n')}
      ------------------------------------------------------------
      
      INSTRUCTIONS FOR MANDATORY VARIATION:
      1. SCENARIO SHIFT: If previous prompts showed "working on laptop", you must generate "sketching on paper", "discussing with colleague", or "looking out window".
      2. COMPOSITION FLIP: If recent outputs were "close-ups", force "wide angles" or "over-the-shoulder" views.
      3. LIGHTING ROTATION: Avoid repeating the exact lighting setup of the last 5 prompts.
      4. ACTION VARIETY: Do not rephrase the same action. Invent a completely new interaction with the environment.
      5. DISTINCT OUTPUT: Each generated prompt must be conceptuallly distinct from the Banned List.
      `;
    }

    const systemPrompt = `Expert Stock Prompt Architect Task.
    Generate ${options.quantity} unique, high-conversion prompts for Adobe Stock/Freepik.
    
    Target Metadata:
    - Subject: ${options.subject} (${options.characterBackground} heritage)
    - Style: ${visualTypeGuidance}
    - Scene: ${backgroundGuidance}
    - Lighting: ${options.lighting}
    - View: ${options.framing}, ${options.subjectPosition}, ${options.cameraAngle}
    - Shadows: ${options.shadowStyle}
    ${options.useCalendar ? `- Event: ${options.calendarMonth} ${options.calendarEvent}` : ''}
    ${options.useExtraKeywords ? `- User Refinement: ${options.extraKeywords}` : ''}

    ${uniquenessInstruction}

    Output Standards: 
    - Commercially safe, technically descriptive. 
    - Avoid buzzwords like 'photorealistic'. 
    - Focus on visual storytelling elements (textures, micro-expressions, specific lighting falloff).
    - Ensure prompts are distinct from one another within this batch as well.
    
    Return JSON per schema.`;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9, // Increased temperature for higher creativity and divergence
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