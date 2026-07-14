import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptions, HistoricalPrompt } from "../types";

export const testApiKey = async (apiKey: string, provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini'): Promise<boolean> => {
  try {
    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'test',
        config: { maxOutputTokens: 1 }
      });
      return true;
    } else if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API test failed: ${response.status} - ${errText}`);
      }
      return true;
    } else if (provider === 'mistral') {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mistral API test failed: ${response.status} - ${errText}`);
      }
      return true;
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API test failed: ${response.status} - ${errText}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn("API Key Test Failed:", error);
    throw error;
  }
};

export async function analyzeReferenceAndSuggestSettings(
  input: { type: 'image', data: string, mimeType: string } 
       | { type: 'text', description: string },
  availableOptions: any,
  apiKey: string,
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini'
): Promise<any> {
  
  const finalKey = apiKey || process.env.API_KEY;
  if (!finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }
  const ai = new GoogleGenAI({ apiKey: finalKey });

  let analysisPrompt = '';

  if (input.type === 'image') {
    if (provider !== 'gemini') {
      throw new Error("Image analysis requires a Gemini API key.");
    }
    analysisPrompt = `Analyze this image's VISUAL 
CONTENT ONLY — completely ignore and ignore any text, 
watermarks, logos, captions, or written words that 
may appear in the image. Focus purely on the visual 
scene: who/what is shown, their appearance, the 
setting, lighting, and mood.

Based on the visual content, return a JSON object 
with three parts:

1. "settings": best matching values from these 
available options:
${JSON.stringify(availableOptions)}
Only include fields you can confidently determine 
from the image. If a field cannot be determined, set it to "Default / Auto".

2. "smartRefinement": a concise core description of the main subject and their specific action/appearance. Maximum 15 words. Only unique scene-specific details. No framing, no lighting, no technical terms. Just describe the subject and what they are doing.

3. "activeFields": A boolean map of the fields. Set to true if the field is prominently featured and should be explicitly toggled on, and false if it should be turned off or left as Default/Auto. Include keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
IMPORTANT LOGIC: If the image is a flat illustration or vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.

Return ONLY this JSON structure, no markdown:
{
  "settings": { ... },
  "smartRefinement": "...",
  "activeFields": { ... }
}`;
  } else {
    analysisPrompt = `Analyze this description 
  and determine the best matching settings from 
  these available options:
  ${JSON.stringify(availableOptions)}
  
  Return ONLY a JSON object matching this structure 
  with your best-guess values for each field based 
  on what you observe.
  
  1. "settings": The values for the fields. If you cannot determine a field, set it to "Default / Auto".
  
  2. "smartRefinement": A concise core description of the main subject and their specific action/appearance based on the input. Maximum 15 words. Only unique scene-specific details. No framing, no lighting, no technical terms. Just describe the subject and what they are doing.
  
  3. "activeFields": A boolean map of the fields. Set to true ONLY if the field is explicitly mentioned or strongly implied in the description and should be toggled on. Set to false if the field should be turned off or kept as Default/Auto. You MUST provide a boolean value for ALL of these keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
  IMPORTANT LOGIC: If the concept is a flat illustration or 2D vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.
  
  {
    "settings": {
      "subject": "...",
      "characterBackground": "...",
      "ageRange": "...",
      "imageMedium": "...",
      "visualType": "...",
      "environment": "...",
      "colorMood": "...",
      "lighting": "...",
      "conceptFocus": "...",
      "interaction": "...",
      "targetMarket": "...",
      "materialStyle": "...",
      "authenticity": "...",
      "qualityCamera": "...",
      "framing": "...",
      "cameraAngle": "...",
      "shadowStyle": "..."
    },
    "smartRefinement": "...",
    "activeFields": {
      "subject": true,
      "characterBackground": false
    }
  }
  
  Respond with ONLY the JSON object, no markdown, 
  no explanation.`;
  }

  const contents: any[] = input.type === 'image' 
    ? [{ inlineData: { data: input.data.replace(/^data:(.*,)?/, ''), mimeType: input.mimeType } }, { text: analysisPrompt }]
    : [{ text: `${analysisPrompt}\n\nDescription: ${input.description}` }];

  try {
    let rawText = "";
    
    if (provider === 'gemini') {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: "application/json",
        }
      });
      rawText = response.text || "";
    } else if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${(input as any).description}` }],
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`Groq API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || "";
    } else if (provider === 'mistral') {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${(input as any).description}` }],
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`Mistral API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || "";
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct:free',
          messages: [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${(input as any).description}` }]
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || "";
    }

    let jsonString = rawText;
    const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = rawText.substring(firstBrace, lastBrace + 1);
      }
    }
    
    return JSON.parse(jsonString.trim());
  } catch (error: any) {
    console.warn("Gemini Error:", error);
    let msg = error.message || "An unknown error occurred.";
    try {
      const parsed = JSON.parse(msg.replace(/^\[.*?\]\s*/, ''));
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message;
      }
    } catch(e) {}
    
    if (msg.includes('API key not valid')) {
      throw new Error("Invalid API Key. Please check your settings.");
    } else if (msg.includes('quota') || msg.includes('429')) {
      throw new Error("API Quota exceeded. Please try again later or use a different key.");
    } else if (msg.includes('Unterminated string in JSON') || msg.includes('Unexpected end of JSON')) {
      throw new Error("The AI model returned an incomplete or massive response that could not be parsed. Please try generating again or use a smaller image.");
    }
    throw new Error(msg);
  }
}

export const generateStockPrompts = async (
  options: PromptOptions, 
  apiKey: string,
  sessionHistory: HistoricalPrompt[] = [],
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini'
): Promise<{text: string}[]> => {
  
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
              text: { type: Type.STRING, description: "The full descriptive prompt text." }
            },
            required: ["text"]
          }
        }
      },
      required: ["prompts"]
    };

    // --- 1. DETERMINE MODES ---
    const medium = options.imageMedium || 'Default / Auto';
    const isDefaultMode = medium === 'Default / Auto';
    const isPhoto = medium === 'Photography';
    const is3D = medium === '3D & CGI';
    const isArt = medium === 'Art & Illustration';
    
    // Emoji/Icon Mode Detection
    const isEmojiMode = options.subject === 'No person (product)' && 
      ['Premium 3D Icon', 'Claymorphism', '3D Render'].some(t => options.visualType.includes(t));

    // --- 2. CONSTRUCT RENDERING LAYER (MEDIUM DEPENDENT) ---
    let renderingInstructions = "";
    
    if (isEmojiMode) {
      renderingInstructions = `
      - MODE: OBJECT-CENTRIC 3D ICON
      - STYLE: Premium 3D icon, smooth rounded geometry, soft clay material, glossy plastic surface.
      - COMPOSITION: Centered composition, isolated background, floating object.
      - LIGHTING: Soft studio lighting, subtle shadow beneath.
      - COLORS: Vibrant, harmonious.
      - STRICT RULE: NO environment storytelling, NO camera model, NO lifestyle tone.
      `;
    } else if (isPhoto) {
      // Camera Model Logic - ONLY if DSLR Quality is selected
      let cameraModel = "";
      if (options.qualityCamera === 'Professional DSLR Quality') {
        cameraModel = "Generic Full-frame Mirrorless";
      }

      // Construct Camera Gear String
      let cameraGear = "";
      if (cameraModel) {
        cameraGear = `professional full-frame camera quality, ${cameraModel.includes('Generic') ? 'natural lens perspective' : 'high-resolution sensor quality'}`;
      } else {
        cameraGear = `Professional Photography`; 
      }

      renderingInstructions = `
      - MODE: REALISTIC PHOTOGRAPHY
      - VOCABULARY: Use camera-based language. "${cameraGear}".
      - LENS LOGIC: Dynamic adaptation based on framing and environment scale.
      - RESTRICTION: Do not overuse "premium" or "high-end".
      - STRICT RULE: DO NOT use 3D or Art terms (Render, Vector, Illustration).
      `;
    } else if (is3D) {
      renderingInstructions = `
      - MODE: 3D RENDER / CGI
      - VOCABULARY: Use render-based language (e.g., "Ray Tracing", "Global Illumination", "Subsurface Scattering").
      - PRIORITY: Prioritize material and lighting descriptions before subject emotion.
      - STRICT RULE: Never use real camera brands (Canon, Sony, etc.). DO NOT use photography terms like "ISO" or "Shutter Speed".
      `;
    } else if (isArt) {
      renderingInstructions = `
      - MODE: DIGITAL ART / ILLUSTRATION
      - VOCABULARY: Use stylized artistic language appropriate for the visual style.
      - FOCUS: Composition and graphic clarity.
      - STRICT RULE: No camera brands. DO NOT use photography or 3D render terms.
      `;
    } else {
      // Default / Auto Fallback - 100% Backward Compatible
      renderingInstructions = `
      - MODE: ADAPTIVE / HYBRID (DEFAULT)
      - VOCABULARY: Use terms appropriate for the selected Visual Style (${options.visualType}).
      - If Visual Style is photorealistic, use photography terms.
      - If Visual Style is 3D, use render terms.
      - If Visual Style is artistic, use illustration terms.
      - NO RESTRICTIONS: Allow camera models if context implies photography.
      `;
    }

    // --- 3. LIGHTING DISCIPLINE ENGINE (v1.1) ---
    const lightingDiscipline = `
    LIGHTING DISCIPLINE ENGINE (STRICT):
    1. UNIVERSAL PRIORITIES:
       - Enforce: Even exposure, clear facial visibility, natural skin tones, balanced highlights/shadows, single dominant light direction.
       - Avoid: Mixed conflicting light sources, extreme contrast (unless cinematic), blown highlights, underexposed faces, stacked lighting types.

    2. ENVIRONMENT-BASED AUTO LIGHT MAPPING:
       - IF Environment = "Modern Office" → Use "Soft diffused window daylight, balanced indoor ambient fill".
       - IF Environment = "White Background" → Use "Soft professional studio lighting, even exposure, minimal harsh shadows".
       - IF Environment = "Outdoor" → Use "Natural daylight, realistic sun direction, soft natural shadows".
       - IF Environment = "Neon City" → Use "Neon glow as dominant light, controlled secondary fill".
       - Rule: Never mix incompatible lighting sources automatically.

    3. ATMOSPHERE CONFLICT RESOLUTION:
       - IF "Golden Hour" + "Studio" → Prioritize Golden Hour, remove studio language.
       - IF "Cinematic Lighting" + "Corporate Target" → Reduce dramatic contrast, maintain professional clarity.
       - IF "Volumetric Lighting" + "Clean Commercial" → Soften volumetric intensity, avoid extreme beams.
       - Rule: Ensure only one dominant lighting mood remains active.

    4. EXPOSURE CONTROL (Photo/3D only):
       - Inject: "properly exposed subject, balanced dynamic range, controlled highlights, soft realistic shadows".

    5. 3D & CGI LIGHTING RULE:
       - IF Medium = "3D & CGI" → Use physically accurate lighting, global illumination, realistic soft shadows, natural color temp. Avoid extreme bloom/unrealistic beams.

    6. COMMERCIAL PRIORITY RULE:
       - IF Target Market = "Corporate" OR "Healthcare" OR "Education" → Reduce dramatic lighting. Prioritize clean, evenly lit visuals.
    `;

    // --- 4. DYNAMIC LENS & DEPTH ENGINE (v1.3) ---
    const opticsEngine = `
    DYNAMIC LENS & DEPTH ENGINE (GENERALIZED RULES):
    1. SPATIAL INTERPRETATION LOGIC:
       - IF Environment is tight/enclosed → Avoid ultra-wide distortion, use natural perspective.
       - IF Environment is wide/open → Use wider field-of-view language, reduce excessive background blur.
       - IF Subject dominates (Portrait/Mid Shot) → Use medium telephoto perspective, adjust depth based on mode.
       - IF Full-body/Scene framing → Use standard perspective, maintain spatial balance.
       - IF Product/Macro → Use close-focus clarity, emphasize texture, minimize distortion.

    2. DEPTH STRATEGY ENGINE:
       - Do NOT default to f/1.8 always.
       - Shallow Focus Mode: Subject sharp, background softly blurred (Use for Emotional/Cinematic).
       - Balanced Focus Mode: Clear subject, moderate background clarity (Use for Corporate/Healthcare).
       - Deep Focus Mode: Sharp detail across frame (Use for Product/Informational).
       - Selection Logic: Based on Depth preference, Concept intensity, and Target Market.

    3. LENS DECISION FACTORS:
       - Base decisions on: Shot Framing scale, Spatial scale (tight/medium/wide), Subject type, Depth preference, Target Market tone.

    4. AVOID NUMERIC OVER-ENGINEERING:
       - Do NOT rely on numeric aperture unless explicitly cinematic.
       - Prefer: "soft background separation", "balanced depth of field", "sharp clarity across frame".

    5. MEDIUM AWARENESS:
       - Photography: Apply realistic perspective language.
       - 3D: Apply lens simulation language (No real camera brand unless DSLR mode active).
       - Illustration: Compositional perspective only (No camera physics).
    `;

    // --- 5. COMMERCIAL SAFETY BLOCK ---
    const nonHumanSubjects = [
      'Background / Landscape only',
      'No person',
      'Still life',
      'Abstract Shape',
      'Icon / Logo',
      'Domestic Pet',
      'Wild Animal'
    ];
    const isHumanSubject = !nonHumanSubjects.some(key => options.subject?.includes(key));
    
    let NEGATIVE_BLOCK = "no artificial symmetry, no obvious AI look, no floating objects, no visible studio lights, no light stands, no softboxes, no reflectors, no photography equipment, no text overlay, no logos, no watermarks, no brand elements,";
    if (isHumanSubject) {
      NEGATIVE_BLOCK = "no extra fingers, no distorted hands, no plastic skin texture, no staged unnatural pose, no blurry eyes, " + NEGATIVE_BLOCK;
    }
    const SAFETY_BLOCK = "no copyright elements, no signature, no labels, no UI overlay, no visible trademarks, no studio equipment visible, brand-neutral environment, clean commercial stock image";

    // --- 6. BACKGROUND MODE ENGINE (v1.4) ---
    let backgroundModeEngine = "";
    if (options.subject === 'Background / Landscape only') {
      backgroundModeEngine = `
      BACKGROUND COMPOSITION MODE (ACTIVE):
      1. COMPOSITION BEHAVIOR:
         - The visual must behave as a background, not a single isolated object.
         - Avoid centered product-like subjects.
         - Shapes, surfaces, waves, spirals, or patterns should extend toward the edges of the frame.
         - Elements may partially enter or exit the frame.
         - The image should feel like a wallpaper, hero background, or design backdrop.
         - The structure should fill the frame or create flowing environmental composition.

      2. OBJECT PREVENTION RULES:
         - Do NOT render a single isolated floating object.
         - Do NOT generate pedestal-style renders.
         - Do NOT place objects sitting in empty space.
         - Do NOT create product showcase composition.

      3. STRUCTURE GENERATION:
         - Allow: flowing abstract waves, layered geometric patterns, metallic ribbons, spiral structures, fluid gradients, holographic surfaces, repeating patterns, texture-like structures.
         - These structures should behave like an environment or design surface rather than a standalone object.

      4. CAMERA BEHAVIOR:
         - Preferred: wide composition, macro abstract perspective, environmental framing, edge-to-edge composition.
         - Avoid: tight product framing, centered object framing.

      5. LIGHTING BEHAVIOR:
         - Lighting should support surface and texture visibility rather than product spotlight.
         - Examples: soft studio lighting, gradient lighting, ambient lighting, cinematic reflections for abstract surfaces.

      6. COPY SPACE AWARENESS:
         - Allow empty space for text placement, balanced negative space.
         - Composition suitable for marketing banners or website hero sections.

      7. SR (SMART REFINEMENT) INTERPRETATION:
         - Interpret SR as a conceptual theme rather than a specific object.
         - Example: "metallic spiral" -> Expand into environmental abstract composition.
      `;
    }

    // --- 7. DIVERGENCE (HISTORY & VARIATION) ---
    // Increase history tracking to 100 to prevent long-term loops
    const recentPrompts = sessionHistory.slice(0, 100).map(h => h.text.substring(0, 60));
    const divergenceInstruction = recentPrompts.length > 0 
      ? `CRITICAL DIVERGENCE RULE: You MUST NOT generate prompts that are structurally or conceptually identical to these recent outputs:
         ${recentPrompts.join(" | ")}
         
         VARIATION MANDATE:
         - Change the specific action, pose, or micro-interaction.
         - Alter the exact color palette or wardrobe details.
         - Shift the specific angle or environmental framing slightly.
         - Visually diversify: Each prompt in this batch MUST represent the core concept/Smart Refinement from a completely different visual perspective, composition style, lighting, framing, background details, and mood. Ensure the outputs are highly distinct and visually unique from one another.` 
      : `VARIATION MANDATE: Ensure each prompt in this batch explores a distinctly different angle, action, or micro-scenario within the given parameters. Do not make them clones of each other. Represent the core concept/Smart Refinement from a completely different visual angle, composition style, lighting setup, framing, background details, and mood for each option in the batch to maximize visual diversity.`;

    // --- 8. GATHER INPUTS ---
    const isBackgroundMode = options.subject === 'Background / Landscape only';
    
    const inputs = {
      subject: getFieldVal('subject', options.subject),
      background: getFieldVal('characterBackground', options.characterBackground),
      environment: getFieldVal('environment', options.environment),
      lighting: getFieldVal('lighting', options.lighting),
      // Ignore subject-specific framing/position if Background Mode is active
      framing: isBackgroundMode ? null : getFieldVal('framing', options.framing),
      angle: getFieldVal('cameraAngle', options.cameraAngle),
      position: isBackgroundMode ? null : getFieldVal('subjectPosition', options.subjectPosition),
      shadows: getFieldVal('shadowStyle', options.shadowStyle),
      style: getFieldVal('visualType', options.visualType),
      material: getFieldVal('materialStyle', options.materialStyle),
      concept: getFieldVal('conceptFocus', options.conceptFocus || 'Default / Auto'),
      authenticity: getFieldVal('authenticity', options.authenticity || 'Default / Auto'),
      // Ignore interaction if Background Mode is active
      interaction: isBackgroundMode ? null : getFieldVal('interaction', options.interaction || 'Default / Auto'),
      target: getFieldVal('targetMarket', options.targetMarket || 'Default / Auto'),
      season: options.useCalendar ? `${options.calendarMonth} (${options.calendarEvent})` : null,
      smartRefinement: options.activeFields?.smartRefinement ? options.smartRefinementText : null,
      ageRange: getFieldVal('ageRange', options.ageRange || 'Default / Auto'),
      colorMood: getFieldVal('colorMood', options.colorMood || 'Default / Auto')
    };

    console.log("Final smartRefinement being used:", inputs.smartRefinement);

    const systemPrompt = `
    ROLE: RULE-BASED PROMPT ASSEMBLY ENGINE.
    TASK: Generate ${options.quantity} structured commercial stock prompts strictly based on configuration.
    
    INPUT CONFIGURATION:
    ${JSON.stringify(inputs, null, 2)}

    DIVERSITY & VARIATION RULES FOR INPUTS (CRITICAL FOR VISUAL VARIETY):
    - The 'INPUT CONFIGURATION' above shows the base settings selected by the user.
    - If quantity is greater than 1 (generating a batch of prompts), you MUST NOT apply the exact same values for lighting, framing, camera angle, subject position, shadow style, and color mood to every option in the batch! This is extremely important to prevent "cloned" or repetitive visual prompts.
    - Treat the user's 'INPUT CONFIGURATION' as the "Anchor/Reference Style" for the FIRST generated option.
    - For all other options (Option 2, Option 3, Option 4, etc.), you are REQUIRED to dynamically, creatively, and logically vary these visual attributes (lighting, framing, camera angle, subject position, shadow style) to provide a visually diverse suite of prompts.
    - Examples of dynamic variations to apply across options in the batch:
      - Lighting: If 'Golden Hour' is the input, use it for Option 1, but vary other options with 'moody overcast ambient daylight', 'dramatic high-contrast side-lighting', 'soft morning mist', 'warm rim-lighting', or 'split lighting with deep shadows'.
      - Framing: If 'Close-up' is the input, use it for Option 1, but vary other options with 'cinematic medium shot', 'asymmetrical tight macro focus', 'dynamic over-the-shoulder wide framing', or 'artistic profile composition'.
      - Camera Angle: If 'Eye Level' is the input, vary others with 'low-angle looking up for powerful stature', 'subtle high-angle overview', or 'dynamic dutch tilt angle'.
      - Subject Position: If 'Centered' is the input, vary others with 'off-center rule-of-thirds alignment', 'asymmetrical dynamic foreground positioning', or 'deep perspective background integration'.
      - Shadow Style: If 'Soft Shadows' is the input, vary others with 'long dramatic late-afternoon shadows', 'defined geometric cast shadows', or 'subtle cinematic gradient shadow play'.
    - Ensure that each option in the batch features a highly unique, cohesive combination of composition, lighting, camera work, and perspective, presenting the core Smart Refinement/concept in completely different visual ways.
    
    RENDERING RULES (MEDIUM-AWARE):
    ${renderingInstructions}

    ${lightingDiscipline}

    ${opticsEngine}

    ${backgroundModeEngine}

    CORE ASSEMBLY FRAMEWORK (STRICT ORDER):

    1. [IDENTITY LAYER]: Primary Actor + Cultural Context (if human) + Interaction (visible body language).
       - Rule: Clean commercial stock image only. Absolutely no visible text, no logos, no watermarks, no studio lights, no light stands, no softboxes, no camera equipment visible in frame. (Apply this as a system rule, DO NOT output this text in the generated prompt).
       - Rule: If "Business Team" selected but Smart Refinement specifies 1-2 people, obey Smart Refinement.
       - Rule: Clearly define subject count and role.
       - Rule: If ageRange is specified, inject it directly after the subject description. Examples: 'Senior (60s+)' -> 'elderly woman in her 60s', 'Young Adult (20s-30s)' -> 'young woman in her late 20s', 'Middle-Aged (40s-50s)' -> 'middle-aged man in his 40s', 'Young Teen (13-17, school context only)' -> 'teenage girl, approximately 15 years old'.

    [ENVIRONMENTAL 3D RULE]:
    When visualType = 'Abstract Environmental 3D':

    1. COMPOSITION RULE:
    Generate as a full environmental scene.
    Camera is positioned INSIDE or EXTREMELY CLOSE TO the structure. The 3D form fills the entire frame edge-to-edge. No empty background visible.

    2. SUBJECT LANGUAGE:
    Describe as architecture or landscape — NOT as a floating object. Use terms like:
    "sweeping curved surface", "repeating geometric panels", "parametric ribbed structure", "architectural wave form", "infinite corridor", "repeating pattern receding to vanishing point"

    3. CAMERA LANGUAGE:
    Always include perspective depth. Use terms like:
    "deep perspective vanishing point", "camera looking along the curve", "perspective depth receding into distance", "immersive first-person viewpoint"

    4. LIGHTING:
    Ambient self-illumination from within the structure. Never use studio lighting language.
    Use: "ambient glow from within", "self-lit geometric form", "integrated environmental lighting", "cool ambient fill"

    5. NEVER USE for this visual type:
    "isolated", "white background", "studio setting", "floating object", "product shot", "softbox", "three-point lighting"

    6. LENGTH: 50-70 words for core prompt body.

    2. [CONCEPT LAYER]: Smart Refinement + Concept Focus + Target Market.
       - CRITICAL RULE: If Smart Refinement is provided, it is the core conceptual foundation. You MUST use its core subject and action as the basis, but you are forbidden from copying it identically across options. You MUST visually expand and present this same concept differently in each generated prompt by altering the composition, setting, background, color theme, perspective, and framing. Each prompt must feel like a unique visual representation.
       - Rule: Concept Focus must influence tone (emotional/functional/aspirational).
    3. [ENVIRONMENT LAYER]: Environment + Seasonality (if enabled).
       - Rule: Replace vague wording with specific spatial descriptions.
    3.5 [COLOR LAYER]: If colorMood is active, inject the dominant color palette:
       - 'Warm & Golden' → warm golden amber tones, rich warm color temperature
       - 'Cool & Clinical' → cool blue-white tones, clinical sterile color palette
       - 'Soft Pastel' → soft muted pastel palette, gentle desaturated tones
       - 'Neutral & Earthy' → neutral earthy tones, warm beige and natural brown palette
       - 'Vibrant & Bold' → vibrant saturated colors, high energy bold palette
       - 'Moody & Dark' → deep rich dark tones, dramatic low-key color grade
       - 'Monochromatic' → single color family palette, tonal variation only
    4. [RENDERING LAYER]: Image Medium language + Visual Style + Material Finish + Authenticity.
       - Rule: Candid = natural interaction; Posed = structured; Documentary = observational.
    5. [OPTICS LAYER]: Quality/Camera + Framing + Elevation + Placement + Atmosphere + Shadows.
       - Rule: Atmosphere = lighting description (do not stack multiple types).
       - Rule: Shadows = realistic behavior.
    6. [COMMERCIAL INTENT]: "High detail commercial stock photograph" or equivalent.
    7. [SAFETY BLOCK]: You MUST append the exact string "${NEGATIVE_BLOCK} ${SAFETY_BLOCK}" to the very end of EVERY generated prompt text. Do not omit this.

    PROMPT HYGIENE RULES:
    - Remove redundant adjectives.
    - Avoid repeating "premium", "high-end", "quality".
    - Avoid lighting conflicts (e.g., studio vs outdoor).
    - Max 2 lighting descriptors.
    - Maintain natural sentence flow.
    - RENDER ENGINE RULE: Never mention specific 3D render engine names anywhere in the generated prompt. Banned terms: Octane Render, Unreal Engine 5, V-Ray, Arnold Render, Redshift, Cinema 4D, Cycles, Blender, KeyShot, Maxwell Render. These are irrelevant for AI image generators. Replace with generic terms only: '3D render', '3D CGI', 'high quality 3D'.
    - BANNED LIGHTING TERMS FOR 3D: Never use 'physically accurate global illumination', 'global illumination', 'ray tracing', 'physically accurate lighting', 'balanced dynamic range', 'controlled highlights', 'balanced exposure'. For 3D & CGI medium, replace lighting description with: 'soft even lighting' or 'clean studio light' — maximum 4 words for lighting description.
    - LENGTH: Photography medium: 90-120 words. 3D & CGI or Art & Illustration medium: 40-60 words maximum for core prompt body. Short focused description works better for abstract and 3D content in AI generators. The NEGATIVE_BLOCK and SAFETY_BLOCK are appended after — do not count them toward word limit.
    - CONFLICT HANDLING: Prioritize Image Medium logic. Reset incompatible vocabulary.

    ${divergenceInstruction}

    Generate JSON with "prompts" array containing "text" and "qualityScore".
    `;

    let rawText = "";

    if (provider === 'gemini') {
      const response = await ai.models.generateContent({
        model: options.model, 
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.95, // Increased slightly for more creativity
          topP: 0.95, // Added topP for better variation
        }
      });
      rawText = response.text?.trim() || '{"prompts":[]}';
    } else if (provider === 'groq') {
      // Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.95,
          top_p: 0.95
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`Groq API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || '{"prompts":[]}';
    } else if (provider === 'mistral') {
      // Mistral
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.95,
          top_p: 0.95
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`Mistral API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || '{"prompts":[]}';
    } else if (provider === 'openrouter') {
      // OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.95,
          top_p: 0.95
        })
      });
      if (!response.ok) { let errText = await response.text(); try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {} throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`); }
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || '{"prompts":[]}';
    }

    let jsonString = rawText;
    const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = rawText.substring(firstBrace, lastBrace + 1);
      }
    }
    
    const result = JSON.parse(jsonString.trim());
    const finalSafetyString = `${NEGATIVE_BLOCK} ${SAFETY_BLOCK}`;
    return result.prompts.map((p: any) => {
      let text = p.text.trim();
      if (!text.includes("no copyright elements")) {
        if (!text.endsWith(".") && !text.endsWith(",")) {
          text += ", ";
        } else {
          text += " ";
        }
        text += finalSafetyString;
      }
      return { text };
    });
  } catch (error: any) {
    console.warn("Gemini Error:", error);
    // Provide a more user-friendly error message if possible
    let msg = error.message || "An unknown error occurred.";
    try {
      // Try to parse if it's a JSON string from GoogleGenAI
      const parsed = JSON.parse(msg.replace(/^\[.*?\]\s*/, ''));
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message;
      }
    } catch(e) {}
    
    if (msg.includes('API key not valid')) {
      throw new Error("Invalid API Key. Please check your settings.");
    } else if (msg.includes('quota') || msg.includes('429')) {
      throw new Error("API Quota exceeded. Please try again later or use a different key.");
    } else if (msg.includes('Unterminated string in JSON') || msg.includes('Unexpected end of JSON')) {
      throw new Error("The AI model returned an incomplete or massive response that could not be parsed. Please try generating again or use a smaller image.");
    }
    throw new Error(msg);
  }
};
