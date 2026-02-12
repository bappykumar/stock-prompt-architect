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

  // Helper to check if a field is active (backward compatible)
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

    // Construct Subject Guidance
    let subjectGuidance = "";
    if (isFieldActive('subject')) {
      subjectGuidance = `- Subject: ${options.subject} ${isFieldActive('characterBackground') ? `(${options.characterBackground} heritage)` : ''}`;
    } else {
      subjectGuidance = `- Subject: AI choice (Creative freedom). Focus on an aesthetically captivating scene, object, or nature-based focal point without a specific human actor.`;
    }

    // Construct Material Guidance
    let materialGuidance = "";
    if (isFieldActive('materialStyle')) {
       materialGuidance = `Material Finish: ${options.materialStyle}. `;
       if (options.visualType.includes('3D') || options.visualType === 'Claymorphism' || options.visualType.includes('Art')) {
         materialGuidance += "Technical: PBR shaders, ambient occlusion, realistic ray-tracing, subsurface scattering. ";
       }
    }

    // Construct Visual Type Guidance
    let visualTypeGuidance = "";
    if (isFieldActive('visualType')) {
      switch (options.visualType) {
        case '3D illustration':
          visualTypeGuidance = `Style: High-end 3D render, ${options.visual3DStyle} shapes, ${materialGuidance} vibrant professional palette.`;
          break;
        case '3D icon':
          visualTypeGuidance = `Style: Premium 3D icon isolated on center, ${materialGuidance} soft ambient light.`;
          break;
        case 'Abstract Fractal':
          visualTypeGuidance = `Style: Intricate Abstract Fractal Art, mathematical recursion patterns, complex geometric self-similarity, high-contrast neon glow, deep shadows.`;
          break;
        case 'Parametric Art':
          visualTypeGuidance = `Style: Modern Parametric Design, flowing mathematical curves, algorithmically generated architecture, sleek procedural surfaces, vibrant color gradients.`;
          break;
        case 'Isometric 3D':
          visualTypeGuidance = `Style: High-end Isometric 3D render, 45-degree perspective, clean geometric alignment, professional soft shadows.`;
          break;
        case 'Claymorphism':
          visualTypeGuidance = `Style: Trendy Claymorphism, soft rounded matte surfaces, playful plastic/clay texture, soft inner shadows.`;
          break;
        case 'Flat Illustration':
          visualTypeGuidance = `Style: Modern flat 2D vector illustration, corporate Memphis aesthetic, clean lines, vibrant limited color palette.`;
        case 'Paper Cut Art':
          visualTypeGuidance = `Style: Intricate paper-cut craft art, layered paper textures, soft drop shadows between cut layers, handcrafted look.`;
          break;
        case 'Minimalist Vector':
          visualTypeGuidance = `Style: Modern flat corporate vector, clean solid colors, commercially high appeal.`;
          break;
        case 'Line Art':
          visualTypeGuidance = `Style: Minimalist continuous line art, clean strokes, sophisticated professional sketch look, white or solid background.`;
          break;
        case 'Double Exposure':
          visualTypeGuidance = `Style: Creative double exposure photography, blending two distinct visual concepts into one silhouette, artistic bokeh.`;
          break;
        default:
          visualTypeGuidance = `Style: High-end commercial stock photography, prime lens bokeh, ${materialGuidance}, authentic textures.`;
      }
    } else {
      // Fallback/Auto behavior if Visual Type is disabled
      visualTypeGuidance = "Style: Premium commercial stock imagery, high quality, authentic look.";
    }

    // Construct Background Guidance
    let backgroundGuidance = "";
    if (isFieldActive('environment')) {
      backgroundGuidance = options.environment === 'Default / Auto' 
        ? "Setting: Aesthetically pleasing context that matches the subject's story."
        : `Setting: Realistic ${options.environment}.`;
    } else {
      backgroundGuidance = "Setting: Contextual background suited for high-value stock photography.";
    }

    // Construct View/Framing Guidance
    const viewParams = [];
    if (isFieldActive('framing')) viewParams.push(options.framing);
    if (isFieldActive('subjectPosition')) viewParams.push(options.subjectPosition);
    if (isFieldActive('cameraAngle')) viewParams.push(options.cameraAngle);
    const viewGuidance = viewParams.length > 0 ? `- View: ${viewParams.join(', ')}` : '';

    // Enhanced History Usage
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
    ${subjectGuidance}
    - Style: ${visualTypeGuidance}
    - Scene: ${backgroundGuidance}
    ${isFieldActive('lighting') ? `- Lighting: ${options.lighting}` : ''}
    ${viewGuidance}
    ${isFieldActive('shadowStyle') ? `- Shadows: ${options.shadowStyle}` : ''}
    ${options.useCalendar ? `- Event: ${options.calendarMonth} ${options.calendarEvent}` : ''}
    ${options.useExtraKeywords ? `- User Refinement: ${options.extraKeywords}` : ''}

    COMMERCIAL SAFETY & COMPLIANCE (STRICT RULES):
    1. NO TEXT/TYPOGRAPHY: The image must NOT contain any text, letters, numbers, or watermarks. Explicitly describe the scene as "clean, without text overlays".
    2. NO TRADEMARKS: Do not mention specific brands (e.g., Apple, Nike), logos on clothing/devices, or copyrighted characters (e.g., Marvel). Use generic terms like "smartphone" instead of "iPhone", "sneakers" instead of "Nike".
    3. NO SPECIFIC YEARS: Do not include visual representations of years like "2024" or "2025" in the background or foreground.
    4. GENERIC DESIGN: Any UI screens, posters, or books in the scene must be abstract or blank.

    ANTI-REPETITION & CREATIVITY ENGINE:
    - Dynamic Phrasing: Do not start every prompt with the same phrase (e.g., avoid always starting with "A photo of..."). vary the sentence structure.
    - Emotional Depth: Vary the mood (Focused, Joyful, Serious, Collaborative, Serene).
    - Uniqueness: Each of the ${options.quantity} prompts MUST be significantly different from each other in this batch.

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
        temperature: 0.95, // Increased temperature for maximum variety
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