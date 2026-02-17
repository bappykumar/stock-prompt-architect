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

    // --- CONTEXT AWARE LOGIC ---
    
    // 1. Define Visual Categories
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
    // If not 3D and not Artistic, we assume Photorealistic (includes Default/Auto, Standard Photo, Cinematic, etc.)
    const isPhotorealistic = !is3D && !isArtistic; 

    // 2. Determine Subject Context
    let subjectGuidance = "";
    if (isFieldActive('subject') && options.subject !== 'Default / Auto') {
      subjectGuidance = `- SUBJECT CORE: ${options.subject} ${isFieldActive('characterBackground') && options.characterBackground !== 'Default / Auto' ? `(${options.characterBackground} ethnicity)` : ''}`;
    } else {
      subjectGuidance = `- SUBJECT CORE: High-value commercial stock subject (lifestyle, business, or concept).`;
    }

    // 3. Construct Technical Specifications based on Medium
    let mediumProtocol = "";
    const qualitySetting = isFieldActive('qualityCamera') ? options.qualityCamera : 'Default / Auto';
    
    if (is3D) {
      // --- 3D RENDER PROTOCOL ---
      mediumProtocol = `
      MEDIUM: 3D CGI / RENDER
      - STRICT RULE: DO NOT use terms like "Photograph", "Shot on", "Camera", "Lens", "ISO", "Shutter".
      - KEYWORDS: Use "Rendered", "3D Visualization", "CGI", "Global Illumination", "Ray Tracing", "Octane Render", "Unreal Engine 5".
      - VISUAL STYLE: ${options.visualType}.
      - QUALITY TRANSLATION:
        * If user requested "DSLR Quality" -> Interpret as "Hyper-realistic Physically Based Rendering (PBR) with accurate light transport".
        * If user requested "Bokeh" -> Interpret as "Virtual depth of field effect".
        * If user requested "4K/8K" -> Interpret as "8K resolution texture maps, high-poly geometry".
      `;
    } else if (isArtistic) {
      // --- ARTISTIC PROTOCOL ---
      mediumProtocol = `
      MEDIUM: DIGITAL / TRADITIONAL ART
      - STRICT RULE: DO NOT use terms like "Photograph", "Shot on", "Render", "3D", "ISO", "Lens".
      - KEYWORDS: Use "Illustration", "Artwork", "Drawing", "Painting", "Vector", "Composition", "Digital Art".
      - VISUAL STYLE: ${options.visualType}.
      - QUALITY TRANSLATION:
        * If user requested "DSLR Quality" -> Interpret as "Masterpiece quality, high-fidelity details, perfect stroke dynamics".
        * If user requested "Sharp Focus" -> Interpret as "Clean lines, precise edges, vector-sharp".
      `;
    } else {
      // --- PHOTOGRAPHY PROTOCOL ---
      // This applies for 'Default / Auto', 'Standard photo', 'Cinematic', etc.
      let cameraGear = "Professional Full-Frame Camera (Canon EOS R5 or Sony A7R V)";
      let cameraSettings = "f/2.8, ISO 100, 1/250s";
      
      // Dynamic Camera Settings based on user input
      if (qualitySetting === 'Professional DSLR Quality') {
        cameraGear = "High-End DSLR (Canon EOS R5)";
        cameraSettings = "Prime lens quality, f/1.8 aperture for depth";
      } else if (qualitySetting === 'Shallow Depth of Field (Bokeh)') {
        cameraGear = "Portrait Lens (85mm f/1.2)";
        cameraSettings = "Wide aperture f/1.2, creamy bokeh background";
      } else if (qualitySetting === 'Sharp Focus / Macro Detail') {
        cameraGear = "Macro Lens (100mm)";
        cameraSettings = "f/8 for edge-to-edge sharpness, extreme detail";
      } else if (qualitySetting === 'Cinematic Film') {
        cameraGear = "Cinema Camera (Arri Alexa)";
        cameraSettings = "Anamorphic lens, cinematic color grading";
      }

      mediumProtocol = `
      MEDIUM: REALISTIC STOCK PHOTOGRAPHY
      - STRICT RULE: MUST use camera terminology. Start prompts with "Photograph of..." or "Shot on...".
      - CAMERA GEAR: ${cameraGear}.
      - SETTINGS: ${cameraSettings}.
      - VISUAL STYLE: ${options.visualType === 'Default / Auto' ? 'High-end commercial stock photography' : options.visualType}.
      `;
    }

    // 4. Environmental & Lighting Context
    let environmentGuidance = "";
    if (isFieldActive('environment')) {
      environmentGuidance = options.environment === 'Default / Auto' 
        ? "- SETTING: Contextually relevant background that enhances the subject's commercial appeal."
        : `- SETTING: ${options.environment}.`;
    }

    let lightingGuidance = "";
    if (isFieldActive('lighting')) {
       lightingGuidance = options.lighting === 'Default / Auto'
       ? "- LIGHTING: Professional commercial lighting (Softbox/Studio or Golden Hour depending on context)."
       : `- LIGHTING: ${options.lighting}.`;
    }

    // 5. Composition Details
    const viewParams = [];
    if (isFieldActive('framing') && options.framing !== 'Default / Auto') viewParams.push(options.framing);
    if (isFieldActive('subjectPosition') && options.subjectPosition !== 'Default / Auto') viewParams.push(options.subjectPosition);
    if (isFieldActive('cameraAngle') && options.cameraAngle !== 'Default / Auto') viewParams.push(options.cameraAngle);
    const compositionGuidance = viewParams.length > 0 ? `- COMPOSITION: ${viewParams.join(', ')}` : '';

    // --- UNIQUENESS & HISTORY BLOCK ---
    const recentPrompts = sessionHistory.slice(0, 100).map(h => h.text);
    let uniquenessInstruction = "";
    if (recentPrompts.length > 0) {
      uniquenessInstruction = `
      DIVERGENCE PROTOCOL:
      You must avoid repeating these recent concepts:
      ${recentPrompts.map((p, i) => `[${i+1}] ${p.substring(0, 80)}...`).join(' | ')}
      
      INSTRUCTION:
      - Change the scenario, action, and clothing significantly from the list above.
      - Ensure this batch of ${options.quantity} prompts are distinct from one another.
      `;
    }

    const systemPrompt = `
    ROLE: Expert Stock Prompt Architect.
    TASK: Generate ${options.quantity} premium, high-conversion prompts for Adobe Stock/Freepik.
    
    ${subjectGuidance}
    ${mediumProtocol}
    ${environmentGuidance}
    ${lightingGuidance}
    ${compositionGuidance}
    ${isFieldActive('shadowStyle') && options.shadowStyle !== 'Default / Auto' ? `- SHADOWS: ${options.shadowStyle}` : ''}
    ${options.useCalendar ? `- SEASONALITY: ${options.calendarMonth} (${options.calendarEvent})` : ''}
    ${options.useExtraKeywords ? `- CUSTOM KEYWORDS: ${options.extraKeywords}` : ''}

    COMMERCIAL SAFETY & CLEANLINESS PROTOCOL:
    - ABOLISH TEXT & LOGOS: The prompt MUST explicitly describe objects as "unbranded", "blank", "generic", or "plain" to prevent AI from generating text.
    - PACKAGING: If describing containers, boxes, or bottles, use "blank label", "no text", "minimalist unbranded design".
    - SCREENS: If describing devices (phones, laptops), specify "blank screen", "black screen", or "abstract wallpaper".
    - CLOTHING: Specify "plain clothing", "no patterns", "unbranded attire".
    - EXCLUSION: Do not include words like "sign", "label", "poster", "brand", "logo" unless modifying them with "blank" (e.g. "blank sign").
    
    ${uniquenessInstruction}
    
    OUTPUT FORMAT:
    - Return ONLY a JSON object with a "prompts" array.
    - Each prompt must be a single, fluid, highly descriptive paragraph (40-60 words).
    - Focus on visual description, texture, lighting, and mood.
    - ENSURE CONTENT IS 100% COMMERCIAL SAFE (No IP, No Text, No Logos).
    `;

    const response = await ai.models.generateContent({
      model: options.model, 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.95,
      }
    });

    const result = JSON.parse(response.text?.trim() || '{"prompts":[]}');
    return result.prompts.map((p: any) => ({ text: p.text, score: p.qualityScore }));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
