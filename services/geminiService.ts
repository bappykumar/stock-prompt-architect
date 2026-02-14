import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

export const generateStockPrompts = async (
  options: PromptOptions, 
  apiKey: string,
  sessionHistory: HistoricalPrompt[] = []
): Promise<{text: string, score: number}[]> => {
  
  const finalKey = apiKey || process.env.API_KEY;

  if (!finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey: finalKey });
  const isFieldActive = (key: string) => options.activeFields ? options.activeFields[key] !== false : true;

  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        prompts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The full descriptive prompt text." },
              qualityScore: { type: Type.INTEGER, description: "Internal quality score (1-100)." }
            },
            required: ["text", "qualityScore"]
          }
        }
      },
      required: ["prompts"]
    };

    // --- GUIDANCE BLOCK START ---
    let subjectGuidance = "";
    if (isFieldActive('subject') && options.subject !== 'Default / Auto') {
      subjectGuidance = `- Primary Focus: ${options.subject} ${isFieldActive('characterBackground') && options.characterBackground !== 'Default / Auto' ? `of ${options.characterBackground} heritage` : ''}`;
    } else {
      subjectGuidance = `- Primary Focus: High-demand commercial subjects (diverse professionals, authentic family moments, or trending lifestyle concepts).`;
    }

    let visualTypeGuidance = "";
    if (isFieldActive('visualType') && options.visualType !== 'Default / Auto') {
      switch (options.visualType) {
        case 'Ultra Realistic':
          visualTypeGuidance = `Style: Photorealistic 8K, physically-based rendering, microscopic texture detail, flawless skin/surface rendering.`;
          break;
        case 'Anime Style':
          visualTypeGuidance = `Style: Modern high-tier digital anime art, vibrant palette, professional cel-shading, dynamic composition.`;
          break;
        case 'Cinematic':
          visualTypeGuidance = `Style: Epic cinematic visual, volumetric lighting, high dynamic range, mood-driven storytelling palette.`;
          break;
        case 'Oil Painting':
          visualTypeGuidance = `Style: Masterful oil on canvas, visible impasto textures, rich pigments, traditional fine art technique.`;
          break;
        case '3D Render':
          visualTypeGuidance = `Style: High-end 3D CGI render, global illumination, ray-traced reflections, premium production quality.`;
          break;
        case 'Hyper Detailed':
          visualTypeGuidance = `Style: Macro-level extreme detail, focus stacking, intricate micro-patterns, maximum clarity.`;
          break;
        default:
          visualTypeGuidance = `Style: Professional commercial stock aesthetic, clean, polished, and authentic.`;
      }
    } else {
      visualTypeGuidance = "Style: High-end production-grade stock imagery with industry-standard aesthetic appeal.";
    }

    let technicalGuidance = "";
    if (isFieldActive('qualityCamera') && options.qualityCamera !== 'Default / Auto') {
      if (options.qualityCamera === 'Professional DSLR Quality') {
        technicalGuidance = `- Technical Specs: Shot on professional full-frame DSLR (e.g., Canon EOS R5 or Sony A7R V). 
          MUST vary lens selection (e.g., 35mm f/1.4 for wide, 50mm f/1.2 for natural, 85mm f/1.4 for portraits, 24-70mm f/2.8 for versatile). 
          Include specific metadata: shutter speed, aperture, and ISO (e.g., f/1.8, 1/500s, ISO 100).`;
      } else if (options.qualityCamera === 'Sharp Focus / Macro Detail') {
        technicalGuidance = `- Technical Specs: Macro lens (90mm or 100mm), f/2.8 or f/4 for detail, extreme focus on textures, ring-light illumination.`;
      } else {
        technicalGuidance = `- Technical Specs: ${options.qualityCamera}, high-end optics, professional digital sensor output.`;
      }
    } else {
      technicalGuidance = `- Technical Specs: High-resolution sharp focus, professional camera rendering settings.`;
    }

    let backgroundGuidance = "";
    if (isFieldActive('environment')) {
      backgroundGuidance = options.environment === 'Default / Auto' 
        ? "Setting: High-quality relevant context that enhances the subject's commercial value."
        : `Setting: Realistic ${options.environment}.`;
    }

    const viewParams = [];
    if (isFieldActive('framing') && options.framing !== 'Default / Auto') viewParams.push(options.framing);
    if (isFieldActive('subjectPosition') && options.subjectPosition !== 'Default / Auto') viewParams.push(options.subjectPosition);
    if (isFieldActive('cameraAngle') && options.cameraAngle !== 'Default / Auto') viewParams.push(options.cameraAngle);
    const viewGuidance = viewParams.length > 0 ? `- Composition: ${viewParams.join(', ')}` : '';

    // --- UNIQUENESS & HISTORY BLOCK ---
    const recentPrompts = sessionHistory.slice(0, 100).map(h => h.text);
    let uniquenessInstruction = "";
    if (recentPrompts.length > 0) {
      uniquenessInstruction = `
STRICT NEGATIVE REFERENCE PROTOCOL (DO NOT REPEAT):
You MUST review the following recent concepts and ENSURE absolute conceptual divergence.
Do not repeat these scenarios, actions, or specific phrasing structures:
${recentPrompts.map((p, i) => `${i+1}. ${p.substring(0, 120)}...`).join('\n')}

DIVERGENCE REQUIREMENTS:
1. CONCEPTUAL JUMP: If the history contains "working at a desk", generate "outdoor collaboration", "standing at a window", or "creative workshop".
2. ACTION VARIETY: Vary the kinetic energy (stillness, candid movement, intense focus, laughter).
3. PHRASING REBOOT: Avoid starting prompts with the same grammatical structure or adjective clusters.
4. UNIQUE BATTERY: Ensure the ${options.quantity} prompts in this specific batch are distinct from each other in composition and narrative.
`;
    }

    const systemPrompt = `Expert Stock Prompt Architect Task.
Generate ${options.quantity} truly unique, high-conversion prompts for Adobe Stock and Freepik. 
Each prompt must be a masterpiece of descriptive detail, targeting the premium commercial market.

ARCHITECTURAL LOGIC:
${subjectGuidance}
- Aesthetic Direction: ${visualTypeGuidance}
${technicalGuidance}
- Environment: ${backgroundGuidance}
${isFieldActive('lighting') && options.lighting !== 'Default / Auto' ? `- Lighting Strategy: ${options.lighting}` : '- Lighting Strategy: High-end professional lighting (natural soft-box, dramatic rim light, or golden hour).'}
${viewGuidance}
${isFieldActive('shadowStyle') && options.shadowStyle !== 'Default / Auto' ? `- Shadow Dynamics: ${options.shadowStyle}` : ''}
${options.useCalendar ? `- Seasonal/Event Context: ${options.calendarMonth} ${options.calendarEvent}` : ''}
${options.useExtraKeywords ? `- User Refinement: ${options.extraKeywords}` : ''}

QUALITY BENCHMARKS:
1. SUPREME DETAIL: Describe textures (grain of wood, pores of skin, weave of fabric) and atmosphere (haze, clarity, warmth).
2. CAMERA PRECISION: For Realistic/DSLR styles, provide specific lens focal lengths (35mm, 50mm, 85mm) and aperture settings (f/1.4, f/2.8, f/8) that make sense for the shot.
3. NARRATIVE DEPTH: Instead of a "man working", describe a "focused architect sketching on a blueprint, evening city lights blurred in the background".
4. STOCK READINESS: Ensure high-end commercial appeal with no trademarked items or text.

${uniquenessInstruction}

Return ONLY a valid JSON object matching the provided schema. Each prompt should be a single, long, evocative paragraph.`;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 1.0, // Maximum variance for uniqueness
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({ text: p.text, score: p.qualityScore }));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
