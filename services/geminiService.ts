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

    let subjectGuidance = "";
    if (isFieldActive('subject')) {
      subjectGuidance = `- Subject: ${options.subject} ${isFieldActive('characterBackground') ? `(${options.characterBackground} heritage)` : ''}`;
    } else {
      subjectGuidance = `- Subject: AI choice (Creative freedom).`;
    }

    let materialGuidance = "";
    if (isFieldActive('materialStyle')) {
       materialGuidance = `Material Finish: ${options.materialStyle}. `;
       if (options.visualType.includes('3D') || options.visualType === 'Claymorphism') {
         materialGuidance += "Technical: PBR shaders, ambient occlusion, realistic ray-tracing. ";
       }
    }

    let visualTypeGuidance = "";
    if (isFieldActive('visualType')) {
      switch (options.visualType) {
        case 'Ultra Realistic':
          visualTypeGuidance = `Style: Hyper-realistic 8K photography, physical accuracy, realistic textures, path tracing style, commercially flawless.`;
          break;
        case 'Anime Style':
          visualTypeGuidance = `Style: High-quality modern anime art, cell shading, vibrant expressive features, clean line work, professional illustration.`;
          break;
        case 'Cinematic':
          visualTypeGuidance = `Style: Masterpiece cinematic visual, anamorphic lens flares, high contrast storytelling lighting, movie still aesthetic.`;
          break;
        case 'Oil Painting':
          visualTypeGuidance = `Style: Classic oil on canvas painting, visible thick brush strokes, impasto technique, rich pigments, museum quality.`;
          break;
        case '3D Render':
          visualTypeGuidance = `Style: Premium 3D render, Octane Render style, global illumination, sophisticated light bouncing, high-end production look.`;
          break;
        case 'Hyper Detailed':
          visualTypeGuidance = `Style: Extreme detail macro photography, hyper-focused textures, intricate micro-patterns visible, sharpest possible clarity.`;
          break;
        case '3D illustration':
          visualTypeGuidance = `Style: High-end 3D render, ${options.visual3DStyle} shapes, ${materialGuidance} vibrant palette.`;
          break;
        case 'Cinematic Film (Kodak Portra)':
          visualTypeGuidance = `Style: High-end cinematic photography on 35mm film, rich skin tones, subtle film grain.`;
          break;
        case 'National Geographic Wildstyle':
          visualTypeGuidance = `Style: Professional documentary photography, high dynamic range, raw and authentic capture.`;
          break;
        case 'Unreal Engine 5 Render':
          visualTypeGuidance = `Style: State-of-the-art 3D render, ray-tracing, extreme detail, hyper-realistic lighting.`;
          break;
        case 'High-Fashion Editorial':
          visualTypeGuidance = `Style: High-fashion magazine editorial look, dramatic lighting, expensive aesthetic.`;
          break;
        case 'Isometric 3D':
          visualTypeGuidance = `Style: High-end Isometric 3D render, 45-degree perspective, clean geometric alignment.`;
          break;
        case 'Claymorphism':
          visualTypeGuidance = `Style: Trendy Claymorphism, soft rounded matte surfaces, plastic/clay texture.`;
          break;
        case 'Flat Illustration':
          visualTypeGuidance = `Style: Modern flat 2D vector illustration, corporate Memphis aesthetic, clean lines.`;
          break;
        case 'Paper Cut Art':
          visualTypeGuidance = `Style: Intricate paper-cut craft art, layered paper textures, soft drop shadows.`;
          break;
        case 'Minimalist Studio Photo':
          visualTypeGuidance = `Style: Clean minimalist studio photography, soft lighting, professional portrait quality.`;
          break;
        case 'Line Art':
          visualTypeGuidance = `Style: Minimalist continuous line art, clean strokes, sophisticated professional sketch.`;
          break;
        default:
          visualTypeGuidance = `Style: High-end commercial stock photography, prime lens bokeh, authentic textures.`;
      }
    } else {
      visualTypeGuidance = "Style: Premium commercial stock imagery, high quality.";
    }

    let technicalGuidance = "";
    if (isFieldActive('qualityCamera') && options.qualityCamera !== 'Default / Auto') {
      technicalGuidance = `- Technical Specs: ${options.qualityCamera}. Ensure absolute clarity, sharp textures, and premium camera rendering.`;
    }

    let backgroundGuidance = "";
    if (isFieldActive('environment')) {
      backgroundGuidance = options.environment === 'Default / Auto' 
        ? "Setting: Aesthetically pleasing context matching the subject."
        : `Setting: Realistic ${options.environment}.`;
    }

    const viewParams = [];
    if (isFieldActive('framing')) viewParams.push(options.framing);
    if (isFieldActive('subjectPosition')) viewParams.push(options.subjectPosition);
    if (isFieldActive('cameraAngle')) viewParams.push(options.cameraAngle);
    const viewGuidance = viewParams.length > 0 ? `- View: ${viewParams.join(', ')}` : '';

    // Robust Uniqueness Mechanism
    const recentPrompts = sessionHistory.slice(0, 100).map(h => h.text);
    let uniquenessInstruction = "";
    if (recentPrompts.length > 0) {
      uniquenessInstruction = `
STRICT UNIQUENESS PROTOCOL:
You MUST NOT generate anything similar to the following recent prompt concepts. 
Analyze these for their core "Idea", "Action", "Interaction", and "Phrasing" and ENSURE 100% VARIANCE:
${recentPrompts.map((p, i) => `${i+1}. ${p.substring(0, 150)}...`).join('\n')}

MANDATORY DIFFERENTIATION:
- If previous prompts used "standing", use "sitting", "interacting", or "motion".
- Change the narrative focal point.
- Avoid repeating adjective clusters used in history.
- Ensure each of the ${options.quantity} prompts in THIS batch are conceptually distinct from each other.
`;
    }

    const systemPrompt = `Expert Stock Prompt Architect Task.
Generate ${options.quantity} unique, high-conversion prompts for Adobe Stock/Freepik.

Target Metadata:
${subjectGuidance}
- Style: ${visualTypeGuidance}
${technicalGuidance}
- Scene: ${backgroundGuidance}
${isFieldActive('lighting') ? `- Lighting: ${options.lighting}` : ''}
${viewGuidance}
${isFieldActive('shadowStyle') ? `- Shadows: ${options.shadowStyle}` : ''}
${options.useCalendar ? `- Event: ${options.calendarMonth} ${options.calendarEvent}` : ''}
${options.useExtraKeywords ? `- User Refinement: ${options.extraKeywords}` : ''}

COMMERCIAL SAFETY:
1. NO TEXT/TYPOGRAPHY.
2. NO TRADEMARKS.
3. NO SPECIFIC YEARS.
4. GENERIC DESIGN.

${uniquenessInstruction}

Return JSON per schema.`;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 1.0, // Higher temperature for more creative variance
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({ text: p.text, score: p.qualityScore }));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};