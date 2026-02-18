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
  
  // Helper to check if a field is active and not default
  const getFieldVal = (key: keyof PromptOptions, val: string) => {
    if (options.activeFields && options.activeFields[key] === false) return null;
    if (val === 'Default / Auto') return null;
    return val;
  };

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

    // --- 1. VISUAL CATEGORY DETERMINATION ---
    const threeDStyles = [
      '3D Render', 'Unreal Engine 5 Render', '3D illustration', 
      'Isometric 3D', 'Claymorphism'
    ];
    const artisticStyles = [
      'Anime Style', 'Oil Painting', 'Minimalist Vector', 'Flat Illustration', 
      'Paper Cut Art', 'Line Art', 'Pencil Sketch / Charcoal'
    ];
    
    const is3D = threeDStyles.includes(options.visualType);
    const isArtistic = artisticStyles.includes(options.visualType);

    // --- 2. TECHNICAL SPECS CONSTRUCTION (MUTUALLY EXCLUSIVE) ---
    let techSpecsInstructions = "";
    
    if (is3D) {
      techSpecsInstructions = `
      - MODE: 3D RENDER / CGI
      - STRICT RULE: DO NOT use photography terms (Camera, Lens, ISO, Shutter).
      - REQUIRED KEYWORDS: "Unreal Engine 5", "Octane Render", "Global Illumination", "Ray Tracing", "8K Resolution", "Physically Based Rendering (PBR)", "Subsurface Scattering", "Virtual Studio Lighting".
      - CONTEXT: If quality is high, use "Hyper-realistic 3D Masterpiece".
      `;
    } else if (isArtistic) {
      techSpecsInstructions = `
      - MODE: DIGITAL ART / ILLUSTRATION
      - STRICT RULE: DO NOT use photography or 3D render terms.
      - REQUIRED KEYWORDS: "Digital Art", "Vector Lines", "Detailed Brushstrokes", "Composition", "High Fidelity", "Clean Lines", "Artistic Medium".
      - CONTEXT: If quality is high, use "Masterpiece Quality Illustration".
      `;
    } else {
      // Default to Photography
      const cam = getFieldVal('qualityCamera', options.qualityCamera);
      let cameraGear = "Shot on Sony A7R V, 85mm Lens, f/1.8 Aperture"; // Default pro setup
      
      if (cam === 'Professional DSLR Quality') cameraGear = "Shot on Canon EOS R5, 50mm Prime Lens, f/1.2";
      if (cam === 'Cinematic Film') cameraGear = "Shot on Arri Alexa, Anamorphic Lens, Cinematic Color Grading";
      if (cam === 'Shallow Depth of Field (Bokeh)') cameraGear = "Shot on Sony A7R V, 85mm Portrait Lens, f/1.4, Bokeh";

      techSpecsInstructions = `
      - MODE: REALISTIC PHOTOGRAPHY
      - STRICT RULE: DO NOT use 3D or Art terms (Render, Vector, Illustration).
      - REQUIRED KEYWORDS: "${cameraGear}", "Photorealistic", "Super-Resolution", "Natural Lighting", "ISO 100".
      - CONTEXT: Ensure the image looks like a high-end commercial stock photo.
      `;
    }

    // --- 3. DIVERGENCE (HISTORY) ---
    const recentPrompts = sessionHistory.slice(0, 50).map(h => h.text.substring(0, 50));
    const divergenceInstruction = recentPrompts.length > 0 
      ? `Avoid repeating these recent concepts: ${recentPrompts.join(" | ")}. Create distinct variations.` 
      : "";

    // --- 4. GATHER INPUTS ---
    const inputs = {
      subject: getFieldVal('subject', options.subject),
      background: getFieldVal('characterBackground', options.characterBackground),
      environment: getFieldVal('environment', options.environment),
      lighting: getFieldVal('lighting', options.lighting),
      framing: getFieldVal('framing', options.framing),
      angle: getFieldVal('cameraAngle', options.cameraAngle),
      position: getFieldVal('subjectPosition', options.subjectPosition),
      shadows: getFieldVal('shadowStyle', options.shadowStyle),
      style: getFieldVal('visualType', options.visualType),
      season: options.useCalendar ? `${options.calendarMonth} (${options.calendarEvent})` : null,
      keywords: options.useExtraKeywords ? options.extraKeywords : null
    };

    const systemPrompt = `
    ROLE: PROMPT MASTER v3.0 PRODUCTION ARCHITECT.
    TASK: Generate ${options.quantity} high-end stock image prompts.
    
    INPUT PARAMETERS:
    ${JSON.stringify(inputs, null, 2)}
    
    COMMERCIAL SAFETY PROTOCOL (CRITICAL):
    - NO TEXT, NO BRANDING, NO LOGOS.
    - Describe clothing as "plain", "unbranded", "solid color".
    - Describe devices/screens as "blank", "abstract".
    - Describe packaging as "blank label", "generic".
    
    ${techSpecsInstructions}

    MASTER PROMPT STRUCTURE (YOU MUST FOLLOW THIS ORDER EXACTLY):
    
    1. [IDENTITY & CHARACTER]
       - Start with the Primary Actor (Subject) and Action.
       - Include Cultural Context if provided.
       - Describe clothing/appearance (adhering to Safety Protocol).
       
    2. [WORLD & STYLE]
       - Visual Style (${inputs.style || 'Contextual'}).
       - Environment description (${inputs.environment || 'Contextual'}).
       
    3. [OPTICS & TECHNICAL]
       - Insert the Technical Keywords defined in the 'MODE' section above.
       - Include Shot Framing (${inputs.framing || 'Contextual'}) and Camera Elevation (${inputs.angle || 'Contextual'}).
       - Subject Placement (${inputs.position || 'Contextual'}).
       
    4. [ATMOSPHERE & LIGHTING]
       - Atmosphere/Mood.
       - Lighting Style (${inputs.lighting || 'Contextual'}).
       - Shadows (${inputs.shadows || 'Contextual'}).
       
    5. [OUTPUT ENHANCEMENT]
       - Seasonality (${inputs.season || 'None'}).
       - Smart Refinement Keywords (${inputs.keywords || 'None'}).

    RULES:
    - OUTPUT FORMAT: Single, flowing, cinematic paragraph (40-60 words).
    - NO bullet points. NO labels (e.g., "Subject: ...").
    - If an Input Parameter is null/empty, invent a contextually appropriate value that fits a "Premium Stock" aesthetic.
    - DO NOT mix 3D and Photo terms.
    - ${divergenceInstruction}

    Generate JSON with "prompts" array containing "text" and "qualityScore".
    `;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9, // High creativity within structure
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({ text: p.text, score: p.qualityScore }));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
