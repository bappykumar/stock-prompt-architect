
import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

export const generateStockPrompts = async (options: PromptOptions, sessionHistory: HistoricalPrompt[] = []): Promise<{text: string, score: number}[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Logical Mapping
    let visualTypeGuidance = "";
    switch (options.visualType) {
      case '3D illustration':
        visualTypeGuidance = "Style: 3D rendered illustration, high-quality Octane render, soft clay-like textures, bright studio lighting, isometric or 3D perspective, vibrant colors, trending on Dribbble/Behance style.";
        break;
      case '3D icon':
        visualTypeGuidance = "Style: High-gloss 3D icon, minimalist aesthetic, rounded corners, glassmorphism or soft plastic material, center-composed, high resolution, soft ambient occlusion.";
        break;
      case 'Minimalist Vector':
        visualTypeGuidance = "Style: Minimalist flat vector art, clean lines, professional color palette, no gradients, geometric shapes, modern commercial illustration style.";
        break;
      default:
        visualTypeGuidance = "Style: High-end professional photography, shot on 85mm lens, sharp focus, cinematic depth of field, commercial stock photo quality.";
    }

    let backgroundGuidance = "";
    if (options.environment === 'White Background') {
      backgroundGuidance = "Environment: Set against a pure, clean, isolated hex #FFFFFF white background. Perfect for easy PNG extraction and masking.";
    } else {
      backgroundGuidance = `Environment: ${options.environment}. Ensure the setting is authentic and adds professional depth to the composition.`;
    }

    let shadowGuidance = "";
    if (options.shadowStyle === 'No Shadow / Flat') {
      shadowGuidance = "Shadows: No visible shadows, flat lighting, uniform brightness.";
    } else if (options.shadowStyle === 'Minimal Base Shadow') {
      shadowGuidance = "Shadows: Subtle contact shadow at the base only, grounding the subject without being intrusive.";
    } else {
      shadowGuidance = `Shadows: ${options.shadowStyle} that logically follows the main light source.`;
    }

    let seasonalGuidance = "";
    if (options.useCalendar) {
      seasonalGuidance = `Seasonal Context: The image should represent the month of ${options.calendarMonth} and the theme of ${options.calendarEvent}. Integrate relevant colors and atmospheric elements.`;
    }

    // User's custom keywords/instructions (only if enabled)
    let customRefinement = (options.useExtraKeywords && options.extraKeywords) 
      ? `\n--- MANDATORY USER REFINEMENT ---\nIntegrate these specific keywords or instructions strictly: ${options.extraKeywords}\n`
      : "";

    const historicalContext = sessionHistory.length > 0 
      ? `\n--- DIVERGENCE PROTOCOL ---\nAvoid repeating concepts or structures from these previous prompts:\n${sessionHistory.slice(-10).map((h, i) => `${i + 1}. ${h.text.substring(0, 100)}...`).join('\n')}`
      : "";

    const systemPrompt = `Act as an Expert Stock Image Prompt Engineer for Adobe Stock and Freepik.
    Generate ${options.quantity} extremely high-quality, commercially viable image prompts.

    USER SELECTIONS:
    - Subject: ${options.subject} (${options.characterBackground} heritage)
    - Style: ${visualTypeGuidance}
    - Setting: ${backgroundGuidance}
    - Lighting: ${options.lighting}
    - Composition: ${options.framing}, ${options.subjectPosition}
    - Camera Angle: ${options.cameraAngle}
    - Shadow: ${shadowGuidance}
    ${seasonalGuidance}
    ${customRefinement}
    ${historicalContext}

    RULES:
    1. No buzzwords (photorealistic, 8k, etc). Use technical description.
    2. UNIQUE: Each prompt must depict a different activity/scenario for the subject.
    3. COMMERCIAL: Ensure generic clothing/tech, no logos.
    4. VARIETY: Different sentence openers and descriptive adjectives.
    5. CAMERA ANGLE: If "Top View / Flat Lay" is selected, describe the scene from a direct top-down perspective.

    Output format: Pure JSON matching the responseSchema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.85,
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({
      text: p.text,
      score: p.qualityScore
    }));
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};