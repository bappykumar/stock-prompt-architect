
import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

// Upgraded to Pro for Premium users who need the highest quality reasoning
export const ACTIVE_MODEL = 'gemini-3-pro-preview';

export const generateStockPrompts = async (options: PromptOptions, sessionHistory: HistoricalPrompt[] = []): Promise<{text: string, score: number}[]> => {
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

    // Material Guidance Logic
    let materialGuidance = `Material / Surface Finish: ${options.materialStyle}. `;
    
    if (options.visualType.includes('3D')) {
      materialGuidance += "Technical: High-end 3D shaders, realistic refractive indices, ambient occlusion, PBR materials. ";
      if (options.materialStyle === 'Glossy / Shiny') {
        materialGuidance += "Surface: High-gloss polished finish, crisp sharp reflections, specular highlights, wet-look shine.";
      } else if (options.materialStyle === 'Glassmorphism') {
        materialGuidance += "Surface: Semi-transparent frosted glass, refractive blurring, soft inner glow, elegant transparency.";
      } else if (options.materialStyle === 'Metallic / Chrome') {
        materialGuidance += "Surface: Mirror-like chrome finish, anisotropic reflections, industrial luxury aesthetic.";
      } else if (options.materialStyle === 'Realistic') {
        materialGuidance += "Surface: Physically accurate textures, high-fidelity PBR materials, micro-surface details, authentic real-world properties.";
      } else if (options.materialStyle === 'Random / Auto') {
        materialGuidance += "Surface: Use the most appropriate material finish for the specific subject, varying between textures for diversity.";
      }
    } else {
      if (options.materialStyle === 'Glossy / Shiny') {
        materialGuidance += "Vibe: High-sheen polished surfaces, vibrant saturated colors, commercial product photography look.";
      } else if (options.materialStyle === 'Matte / Soft') {
        materialGuidance += "Vibe: Non-reflective soft textures, velvet finish, cinematic diffused look.";
      } else if (options.materialStyle === 'Realistic') {
        materialGuidance += "Vibe: Lifelike authenticity, natural surface imperfections, high tactile quality.";
      }
    }

    let visualTypeGuidance = "";
    switch (options.visualType) {
      case '3D illustration':
        visualTypeGuidance = `Style: High-quality Octane render, ${options.visual3DStyle} shapes, ${materialGuidance} trending 3D minimalist aesthetic, vibrant professional colors.`;
        break;
      case '3D icon':
        visualTypeGuidance = `Style: Premium 3D icon design, isolated center composition, ${materialGuidance} soft ambient lighting, professional modeling.`;
        break;
      case 'Minimalist Vector':
        visualTypeGuidance = `Style: Modern flat vector art, corporate minimalist illustration, ${options.materialStyle === 'Glossy / Shiny' ? 'with vibrant gradients' : 'clean solid colors'}, high commercial appeal.`;
        break;
      default:
        visualTypeGuidance = `Style: Professional high-end stock photography, shot on 85mm or 50mm prime lens, ${materialGuidance}, sharp focus, natural skin textures, depth of field.`;
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

    // History Context for Uniqueness
    const historyContext = sessionHistory.length > 0 
      ? `EXCLUSION LIST (Do NOT repeat or rephrase these concepts):
${sessionHistory.slice(0, 10).map((h, i) => `${i+1}. ${h.text}`).join('\n')}`
      : "No previous history for this session.";

    const systemPrompt = `Act as an expert Prompt Architect for Adobe Stock and Freepik. 
    Task: Generate ${options.quantity} unique, commercially powerful image prompts.

    ${historyContext}

    ARCHITECTURAL CONSTRAINTS:
    - Actor: ${options.subject} (${options.characterBackground} heritage)
    - Aesthetic: ${visualTypeGuidance}
    - Location: ${backgroundGuidance}
    - Lighting: ${options.lighting}
    - Frame: ${options.framing}, ${options.subjectPosition}, ${options.cameraAngle}
    - Shadowing: ${shadowGuidance}
    ${options.useCalendar ? `- Seasonality: ${options.calendarMonth} (${options.calendarEvent})` : ''}
    ${options.useExtraKeywords ? `- Custom Instruction: ${options.extraKeywords}` : ''}

    UNIQUENESS PROTOCOL:
    1. ANALYZE HISTORY: Identify common themes, poses, and actions used previously.
    2. PIVOT CONCEPTS: If history shows "office work", generate "strategic brainstorming" or "networking over coffee". 
    3. DIVERSIFY ACTION: Ensure each prompt in this batch features a different action, emotion, or specific micro-scenario.
    4. VARIATION: Change the sub-setting, specific props, and the nuance of the subject's expression. 
    5. NO REPHRASING: Do not just swap adjectives; create a fundamentally different mental image.

    COMMERCIAL STANDARDS:
    - Commercially safe: No logos, no brands, no identifiable faces.
    - Technical precision: Describe materials, textures, and light interaction.
    - Banned words: Do NOT use "photorealistic", "ultra-detailed", "8k", "masterpiece".

    Return JSON matching the responseSchema.`;

    const response = await ai.models.generateContent({
      model: ACTIVE_MODEL, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.85, // Balanced for creativity and adherence
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
      throw new Error("Quota Exceeded: Your API key limit is reached. Ensure billing is enabled.");
    }
    throw new Error(error.message || "Failed to generate prompts.");
  }
};
