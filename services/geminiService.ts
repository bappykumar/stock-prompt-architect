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

CRITICAL VALUE SELECTION RULE:
For every field in "settings", you MUST pick and return the EXACT "value" string from the provided options (do NOT return the "label", and NEVER return header titles). If a field cannot be determined, set it to "Default / Auto". For 'characterBackground', carefully observe the subject's apparent ethnicity/cultural background and select the best match from the options.

COHERENCE & MEDIUM RULES:
- If the image is a real camera photo, set 'imageMedium' to "Photography".
  Then 'visualType' MUST be one of: "Standard photo", "Ultra Realistic", "Cinematic", "Cinematic Film (Kodak Portra)", "Minimalist Studio Photo", "Hyper Detailed", "Documentary / Editorial".
- If the image is a 3D render, CGI, digital render, or clay model, set 'imageMedium' to "3D & CGI".
  Then 'visualType' MUST be one of: "Premium 3D Icon", "3D Render", "3D illustration", "Isometric 3D", "Claymorphism", "Abstract Environmental 3D".
- If the image is an illustration, drawing, painting, cartoon, or vector art, set 'imageMedium' to "Art & Illustration".
  Then 'visualType' MUST be one of: "Anime Style", "Oil Painting", "Minimalist Vector", "Flat Illustration", "Flat Line Icon", "Paper Cut Art", "Line Art".

SUBJECT & CONTENT RECOGNITION RULES:
- Animals / Pets: Set 'subject' to "Domestic Pet (Cat, Dog, etc.)". Set 'characterBackground', 'ageRange', 'interaction' to FALSE in 'activeFields'.
- Food, Beverage & Culinary: Set 'subject' to "Still life / Food & Drink". Set 'characterBackground', 'ageRange', 'interaction' to FALSE in 'activeFields'.
- Physical Products, Isolated Objects & Gadgets Differentiation:
  * If the product/object is resting on a surface (table, desk, counter, floor), has environmental context, or casts a realistic ground shadow: Set 'subject' to "No person (product)".
  * If the object is a standalone cutout floating on a plain white, transparent, or flat solid background with NO floor/table surface, NO cast shadows, and NO environment details (PNG asset style): Set 'subject' to "Isolated Object (PNG Ready)".
  * In both cases, set human/demographic fields ('characterBackground', 'ageRange', 'interaction') strictly to FALSE in 'activeFields'.
- Landscapes, Nature & Cityscapes (without prominent humans): Set 'subject' to "Background / Landscape only". Set human fields to FALSE.
- Framing & Camera Angle:
  * Head / Face focus -> 'framing': "Portrait"
  * Waist-up view -> 'framing': "Mid shot (waist-up)"
  * Full human body visible -> 'framing': "Full shot (full body)"
  * Hands, cropped gestures or product detail -> 'framing': "Close-up / Cropped Action (Faceless)"
  * Overhead tabletop view -> 'cameraAngle': "Top View / Flat Lay"
  * Straight on -> 'cameraAngle': "Eye Level"
  * Looking upwards -> 'cameraAngle': "Low Angle"
- Environment & Background:
  * Pure white or transparent cutout -> 'environment': "White Background"
  * Solid studio backdrop -> 'environment': "Solid Color / Studio"
  * Black background -> 'environment': "Pitch Black / Void"
  * Office / workplace -> 'environment': "Modern Office"
  * Outdoor / nature / park -> 'environment': "Nature / Outdoor"

2. "smartRefinement": a concise core description of the main subject and their specific action/appearance. Maximum 25 words.
CRITICAL GENDER RULE: If there is a person/human in the image, you MUST explicitly state their GENDER (e.g., "man", "woman", "boy", "girl", "baby"). If the person's gender is completely indiscernible due to clothing or cropping, use "person". DO NOT specify age categories (like "young adult" or "elderly") in this field, as age is mapped to the 'settings' object separately.
BODY BUILD RULE: ONLY mention body build if they are distinctly outside the average/standard norm (e.g., "plus-size", "heavy-set", "muscular"). If they have an average/slim body, DO NOT mention their body type at all.
FACELESS & ACTION CROP RULE (CRITICAL FOR CROPPED/DETAIL SHOTS): If the person's head, face, or eyes are cropped out of frame (e.g. focused on hands cleaning, wrist pain, holding a glass, passing an envelope, typing on keyboard), you MUST explicitly describe this framing, such as: "close-up on hands and torso, head out of frame" or "faceless shot focused on hands and action". In such cases, DO NOT describe eye direction or facial gaze!
CONCEPTUAL FLAT-LAY & TABLETOP STILL LIFE RULE (CRITICAL FOR BUSINESS/METAPHOR PROPS): If the image is a conceptual business/abstract tabletop still life (such as wooden blocks/cubes, tokens, magnifying glasses, puzzle pieces, checklists, or progress bars with minimalist 2D line icons/symbols on a clean solid pastel or studio background, with or without a cropped hand/fingers interacting):
- Describe the core physical props and interaction clearly (e.g., "wooden tokens with minimalist line icons representing safety and workflow", "hand placing wooden block into progress bar on pastel blue surface", "magnifying glass focusing on a checkmark icon with ample copy space").
- DO NOT invent full-body characters, corporate business suits, or facial features when only a hand or fingers are visible!
- Mention "minimalist 2D line icons / infographic symbols" if present on the blocks/props.
- Mention "clean solid pastel background with ample copy space" to preserve commercial versatility.
ABSTRACT 3D TEXTURE, FLUTED GLASS & RIBBED BACKGROUND RULE (CRITICAL FOR 3D TEXTURES & WALLPAPERS): If the image is an abstract geometric background, texture, or wallpaper featuring vertical ribbed slats, fluted glass, linear architectural louvers, translucent acrylic panels, or dual-tone linear light gradients:
- In 'smartRefinement': Concisely describe the core 3D geometry and luminous optical effects using professional stock terms (e.g., "abstract 3D vertical ribbed slats with dual-tone neon gradient lighting and luminous refraction waves", or "symmetrical vertical architectural louvers with warm ambient center backlight glow"). Max 25 words. DO NOT invent human subjects, products, or room furniture!
- In 'settings':
  * 'subject': "Abstract Shape / Graphic Element" or "Background / Landscape only"
  * 'imageMedium': "3D & CGI"
  * 'visualType': "Abstract Environmental 3D"
  * 'materialStyle': "Glossy / Shiny" (for glass/acrylic/refractions) or "Matte / Soft" (for diffuse slats/louvers)
  * 'colorMood': "Vibrant & Bold" or "Moody & Dark"
  * 'lighting': "Cinematic Lighting"
  * 'environment': "Solid Color / Studio" or "Pitch Black / Void"
  * 'shadowStyle': "Minimal Base Shadow" or "No Shadow / Flat"
- In 'activeFields':
  * Set 'subject', 'imageMedium', 'visualType', 'materialStyle', 'colorMood', 'lighting' to TRUE.
  * Set ALL human/demographic fields ('characterBackground', 'ageRange', 'interaction', 'authenticity') strictly to FALSE.
CAMERA DIRECTION RULE: ONLY if the subject's face/eyes are visible in the frame, describe where they are looking (e.g., "looking forward", "making eye contact", "looking down", "looking away"), but DO NOT use the word "camera". If their head/eyes are cropped out or not visible, completely omit gaze descriptions.
FLEXIBLE COLOR RULE: For attire or objects, describe the item generically WITHOUT locking in specific colors (e.g., say "a sphere" instead of "a blue sphere", or "in a business suit" instead of "in a blue suit") unless that exact color is strictly central to the action or meaning. This allows the prompt generator to create diverse stock variations.
AVOID specifying race, ethnicity, or age IN THIS FIELD. Focus on gender, notable body build (if any), core action, key props, and expression (if face is visible). No technical camera terms or lighting terms.

3. "activeFields": A boolean map of the fields. Set to true if the field is RELEVANT to the visual scene, even if not explicitly the main focus. Set to false ONLY if the field is completely irrelevant to the visual context. Include keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
IMPORTANT LOGIC: If there are people or characters shown in the image, 'characterBackground', 'ageRange', and 'interaction' MUST be true. If there are NO people/characters, 'characterBackground', 'ageRange', and 'interaction' MUST be false, and 'subject' MUST be mapped to a non-human category (like "No person", "Isolated Object", "Background"). If the image is a flat illustration or vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.
SPECIAL RULE FOR HAND-ONLY CROPS & TABLETOP PROPS: If ONLY a hand, fingers, or arm is interacting with tabletop props/objects (faceless conceptual flat-lay or still life):
- Set 'subject' to "Still life / Food & Drink" or "No person (product)".
- Set 'characterBackground' and 'ageRange' to FALSE in 'activeFields' (and 'Default / Auto' in settings) because demographic casting does not apply to a faceless hand interacting with props.
- Set 'framing' to "Top View / Flat Lay" or "Close-up / Cropped Action (Faceless)".
- Set 'environment' to "Solid Color / Studio Background" or clean tabletop surface.

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
  
  1. "settings": The values for the fields. If you cannot determine a field, set it to "Default / Auto". For 'characterBackground', select the best matching cultural/ethnic background if implied by the text.
  
  2. "smartRefinement": A concise core description of the main subject and their specific action/appearance based on the input. Maximum 25 words. If a person/human is described, observe and explicitly state their GENDER (e.g., "man", "woman", "boy", "girl", "baby"). If the gender is completely unspecified or neutral, use "person". DO NOT specify age categories (like "young adult" or "senior") in this field, as age is mapped to the 'settings' object separately. For BODY BUILD, ONLY mention it if they are distinctly outside the average/standard norm (e.g., "plus-size", "heavy-set", "muscular"). If they have an average/slim body, DO NOT mention their body type at all. FACELESS & ACTION CROP RULE: If the concept focuses on hands, gestures, or cropped body parts without showing a face (e.g. holding a product, typing, wrist pain, cleaning surface), describe this framing clearly (e.g. "close-up on hands and torso, faceless composition") and omit eye gaze direction. CONCEPTUAL FLAT-LAY & TABLETOP STILL LIFE RULE: If the concept is a conceptual business/abstract tabletop still life (wooden blocks, tokens, magnifying glasses, puzzle pieces, checklists, or progress bars with minimalist 2D line icons/symbols on a solid pastel or studio background, with or without a cropped hand/fingers interacting), focus on the physical props, minimalist 2D icons, and clean composition with ample copy space. Do NOT invent full-body characters or business suits. CAMERA DIRECTION RULE: If the face is visible and the text mentions looking at the camera, rephrase it to "looking forward" or "making eye contact"; DO NOT use the word "camera". FLEXIBLE COLOR RULE: For attire or objects, describe the item generically WITHOUT locking in specific colors (e.g., say "a sphere" instead of "a blue sphere") unless strictly central to the action, to allow for diverse stock variations. AVOID specifying race, ethnicity, or age IN THIS FIELD. Focus on gender, notable body build, core action, and props. No technical camera or lighting terms.
  
  3. "activeFields": A boolean map of the fields. Set to true if the field is RELEVANT to the scene, even if not explicitly described. Set to false ONLY if the field is completely irrelevant to the scene context. You MUST provide a boolean value for ALL of these keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
  IMPORTANT LOGIC: If there are people or characters in the scene, 'characterBackground', 'ageRange', and 'interaction' MUST be true. If there are NO people/characters, 'characterBackground', 'ageRange', and 'interaction' MUST be false, and 'subject' MUST be mapped to a non-human category (like "No person", "Isolated Object", "Background"). If the concept is a flat illustration or 2D vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.
  SPECIAL RULE FOR PRODUCTS & ISOLATED OBJECTS: If describing a product in an environment, on a desk/table, or with background atmosphere, set 'subject' to "No person (product)". If the description explicitly specifies a cutout, PNG, transparent background, or isolated object on white/solid background with no environment or floor shadows, set 'subject' to "Isolated Object (PNG Ready)".
  SPECIAL RULE FOR HAND-ONLY CROPS & TABLETOP PROPS: If ONLY a hand or fingers interact with tabletop props/objects (faceless conceptual flat-lay or still life): set 'subject' to "Still life / Food & Drink" or "No person (product)", set 'characterBackground' and 'ageRange' to FALSE in 'activeFields' (and 'Default / Auto' in settings), set 'framing' to "Top View / Flat Lay" or "Close-up / Cropped Action (Faceless)", and set 'environment' to "Solid Color / Studio Background".
  ABSTRACT 3D TEXTURE, FLUTED GLASS & RIBBED BACKGROUND RULE: If describing an abstract geometric background, texture, or wallpaper with vertical ribbed slats, fluted glass, linear louvers, translucent acrylic panels, or dual-tone neon gradients: set 'subject' to "Abstract Shape / Graphic Element" or "Background / Landscape only", 'imageMedium' to "3D & CGI", 'visualType' to "Abstract Environmental 3D", 'materialStyle' to "Glossy / Shiny" or "Matte / Soft", 'lighting' to "Cinematic Lighting", 'colorMood' to "Vibrant & Bold" or "Moody & Dark", and set all human fields ('characterBackground', 'ageRange', 'interaction', 'authenticity') to FALSE.
  
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

    6. SHARPNESS & CLARITY RULE (CRITICAL FOR BLUR PREVENTION):
       - ALWAYS explicitly inject sharpness modifiers into the prompt: "razor-sharp focus on subject", "crisp details", "ultra-high resolution", "tack sharp".
       - NEVER use words that imply softness on the main subject (e.g., avoid "soft focus", "dreamy blur").
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
    const isBackgroundMode = options.subject === 'Background / Landscape only';
    const isIsolatedPngMode = options.subject === 'Isolated Object (PNG Ready)';
    const isHumanSubject = !nonHumanSubjects.some(key => options.subject?.includes(key));
    
    let NEGATIVE_BLOCK = "blurry subject, out of focus subject, poorly drawn, low resolution, no artificial symmetry, no obvious AI look, no floating objects, no visible studio lights, no light stands, no softboxes, no reflectors, no photography equipment, no text overlay, no logos, no watermarks, no brand elements,";
    if (isHumanSubject) {
      NEGATIVE_BLOCK = "no extra fingers, no distorted hands, no plastic skin texture, no staged unnatural pose, no blurry eyes, " + NEGATIVE_BLOCK;
    }
    
    if (isIsolatedPngMode) {
      NEGATIVE_BLOCK = "no background, no environment, no landscape, no floor, no shadows on ground, no ground plane, no horizon line, no scenery, no props, no reflections, checkerboard background, transparency grid, " + NEGATIVE_BLOCK;
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
    
    const inputs = {
      subject: getFieldVal('subject', options.subject),
      culturalContext: getFieldVal('characterBackground', options.characterBackground),
      environment: isIsolatedPngMode ? 'Pure flat solid color (White or contrasting, NO environment details)' : getFieldVal('environment', options.environment),
      lighting: getFieldVal('lighting', options.lighting),
      // Ignore subject-specific framing/position if Background Mode is active
      framing: isBackgroundMode ? null : (isIsolatedPngMode ? 'Full Object in Frame (Centered, Uncropped)' : getFieldVal('framing', options.framing)),
      angle: getFieldVal('cameraAngle', options.cameraAngle),
      position: isBackgroundMode ? null : (isIsolatedPngMode ? 'Perfectly Centered' : getFieldVal('subjectPosition', options.subjectPosition)),
      shadows: isIsolatedPngMode ? 'No Shadow / Flat (No cast shadows on ground)' : getFieldVal('shadowStyle', options.shadowStyle),
      style: getFieldVal('visualType', options.visualType),
      material: getFieldVal('materialStyle', options.materialStyle),
      concept: getFieldVal('conceptFocus', options.conceptFocus || 'Default / Auto'),
      authenticity: getFieldVal('authenticity', options.authenticity || 'Default / Auto'),
      // Ignore interaction if Background Mode is active
      interaction: (isBackgroundMode || isIsolatedPngMode) ? null : getFieldVal('interaction', options.interaction || 'Default / Auto'),
      target: getFieldVal('targetMarket', options.targetMarket || 'Default / Auto'),
      season: options.useCalendar ? `${options.calendarMonth} (${options.calendarEvent})` : null,
      smartRefinement: options.activeFields?.smartRefinement ? options.smartRefinementText : null,
      ageRange: getFieldVal('ageRange', options.ageRange || 'Default / Auto'),
      colorMood: getFieldVal('colorMood', options.colorMood || 'Default / Auto')
    };

    const getLockedFieldsRule = () => {
      const lockedRules: string[] = [];
      const map: Record<string, string> = {
        lighting: 'Lighting / Atmosphere',
        framing: 'Shot Framing',
        cameraAngle: 'Camera Elevation',
        subjectPosition: 'Subject Position',
        shadowStyle: 'Shadows',
        environment: 'Environment',
        colorMood: 'Color Mood',
        subject: 'Subject',
        characterBackground: 'Cultural Context',
        visualType: 'Visual Style',
        qualityCamera: 'Quality & Camera',
        ageRange: 'Age',
        conceptFocus: 'Concept Focus'
      };

      const lockedPools = (options as any).lockedPools || {};

      for (const [key, isLocked] of Object.entries(options.lockedFields || {})) {
        if (isLocked && map[key]) {
          const pool: string[] = lockedPools[key] || [];
          if (pool.length > 1) {
            lockedRules.push(`${map[key]} is RESTRICTED to ONLY these allowed options: [ ${pool.join(', ')} ] (any dynamic variation across prompts in the batch MUST choose strictly from this pool)`);
          } else {
            const singleVal = (options as any)[key] || pool[0];
            lockedRules.push(`${map[key]} is LOCKED strictly to "${singleVal}" (must not be varied across the batch)`);
          }
        }
      }

      if (lockedRules.length > 0) {
        return `\n    - [CRITICAL LOCK & RESTRICTION RULE]: The user has explicitly set field locks:\n      * ${lockedRules.join('\n      * ')}\n      You are STRICTLY FORBIDDEN from choosing options outside these locked constraints.`;
      }
      return "";
    };
    
    const lockedFieldsRule = getLockedFieldsRule();

    console.log("Final smartRefinement being used:", inputs.smartRefinement);

    const systemPrompt = `
    ROLE: RULE-BASED PROMPT ASSEMBLY ENGINE.
    TASK: Generate ${options.quantity} structured commercial stock prompts strictly based on configuration.
    
    INPUT CONFIGURATION:
    ${JSON.stringify(inputs, null, 2)}

    DIVERSITY & VARIATION RULES FOR INPUTS (CRITICAL FOR VISUAL VARIETY):
    - The 'INPUT CONFIGURATION' above shows the base settings selected by the user.${lockedFieldsRule}
    ${options.isFromImageReference ? `
    [IMAGE REFERENCE EXACT MATCH RULE]
    - The Smart Refinement text was derived directly from an uploaded reference image. 
    - CRITICAL REQUIREMENT FOR OPTION 1: The FIRST prompt in the batch (Option 1) MUST be an exact, literal translation of the Smart Refinement text and the provided Input Configuration. Do NOT add variations, do NOT change the action, and do NOT alter the scene for Option 1. It must recreate the original image as closely as possible based on the text, while strictly adhering to commercial stock rules (no text, no logos, no trademarks, clean rendering). If a person's body type/physique/stature (e.g., plus-size, heavy-set, slim, slender, athletic, tall, short, etc.) is in the Smart Refinement, you MUST faithfully preserve it in Option 1!
    - CRITICAL REQUIREMENT FOR OPTION 2 ONWARDS (if quantity > 1): You MUST KEEP THE EXACT SAME SUBJECT/OBJECT and THE EXACT SAME BODY BUILD/PHYSIQUE/STATURE from the Smart Refinement text for ALL prompts in the batch. You are STRICTLY FORBIDDEN from changing the core subject or their body build/stature to something else. You may ONLY apply the dynamic variations (lighting, framing, camera angle, subject position, shadow style) described below to provide visual diversity of the SAME subject.` : ''}
    - If quantity is greater than 1 (generating a batch of prompts), you MUST NOT apply the exact same values for lighting, framing, camera angle, subject position, shadow style, and color mood to every option in the batch (UNLESS they are explicitly LOCKED above)! This is extremely important to prevent "cloned" or repetitive visual prompts.
    - Treat the user's 'INPUT CONFIGURATION' as the "Anchor/Reference Style" for the FIRST generated option.
    - For all other options (Option 2, Option 3, Option 4, etc.), you are REQUIRED to dynamically, creatively, and logically vary these visual attributes (lighting, framing, camera angle, subject position, shadow style) to provide a visually diverse suite of prompts—ONLY FOR THE UNLOCKED FIELDS.
    - Examples of dynamic variations to apply across options in the batch:
      - Lighting: If 'Golden Hour' is the input, use it for Option 1, but vary other options with 'moody overcast ambient daylight', 'dramatic high-contrast side-lighting', 'soft morning mist', 'warm rim-lighting', or 'split lighting with deep shadows'.
      - Framing: If 'Close-up' or 'Close-up / Cropped Action (Faceless)' is the input, use it for Option 1, but vary other options with complementary tight or medium angles such as 'asymmetrical tight macro focus on hands', 'over-the-shoulder crop', 'cinematic waist-level crop', or 'profile detail composition' while keeping the core action crisp. If 'Close-up / Cropped Action (Faceless)' is active, ensure all variations maintain the cropped/faceless intent unless unlocked.
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

    [CATEGORY AUTO-EXPAND RULE]:
    ${options.isFromImageReference ? `*CRITICAL OVERRIDE*: Since IMAGE REFERENCE EXACT MATCH RULE is active, you are STRICTLY FORBIDDEN from applying this Category Auto-Expand Rule. The subject MUST remain exactly what is described in the Smart Refinement for EVERY prompt in the batch.` : `When smartRefinement contains a broad category phrase (e.g., "healthcare", "food", "business", "travel", "real estate", "education", "fitness", "icon set", "lifestyle", "technology"):

    1. TREAT IT AS A CATEGORY SEED, not a literal description. Do not repeat the same phrase in every prompt.

    2. AUTO-SELECT a unique specific concept from that category for each prompt in the batch. Never use the same concept twice in one batch.`}

    3. CONCEPT POOLS by category:

       healthcare / medical:
       doctor consulting patient, nurse checking blood pressure, caregiver with elderly, telehealth video call, hospital reception, patient in recovery, surgeon in OR, pharmacist at counter, mental health therapy, medical team discussion

       food / restaurant:
       healthy meal prep bowl, coffee shop flatlay, chef cooking in kitchen, burger close-up, smoothie bowl top view, ethnic food spread, bakery pastries, fresh vegetables market, fine dining plating, street food vendor

       business / corporate:
       team meeting discussion, solo entrepreneur laptop, video conference call, data analysis charts, startup brainstorm, client presentation, coworking space, business handshake, office rooftop meeting, executive portrait

       technology:
       developer coding dual monitors, AI hologram interface, cloud computing concept, cybersecurity dashboard, data visualization, robot automation, smart home control, VR headset user, blockchain network, digital transformation

       travel / tourism:
       airport departure lounge, beach resort, mountain hiking trail, city landmark, hotel check-in, backpacker exploring, local market shopping, train journey, sunset viewpoint, cultural festival

       fitness / wellness:
       gym workout session, outdoor yoga, running in park, healthy meal prep, meditation at home, cycling path, personal trainer session, swimming pool, stretching routine, wellness spa

       education:
       student studying library, classroom teaching, online learning laptop, graduation ceremony, science lab experiment, group study session, teacher whiteboard, child learning blocks, university campus, adult education class

       real estate:
       modern house exterior, apartment interior, property inspection, agent showing home, construction site, luxury penthouse, suburban neighborhood, home office setup, kitchen renovation, garden landscape

       icon set (any category):
       Auto-select individual objects from that category's concept pool. Each prompt = one unique object. Never repeat.

    4. SMART REFINEMENT OVERRIDE:
       When parsing smartRefinement for auto-expand:

       1. CATEGORY WORD: First word or phrase that identifies the topic/category (healthcare, food, business, travel, icon)
       
       2. STYLE/MEDIUM HINTS: Words like photography, flatlay, portrait, icon, illustration — use these to guide the visual approach
       
       3. KEY CONTEXT: Additional qualifiers that MUST be preserved in every prompt:
          - Diversity/ethnicity: "south asian", "african", "diverse"
          - Setting: "home", "office", "outdoor", "white background"
          - Mood: "warm", "emotional", "candid", "vibrant"
          - Style: "authentic", "minimal", "moody", "clean"
          
       RULE: Key context words MUST appear in every generated prompt, even when auto-expanding to different concepts.
       
       Example:
       SR: "healthcare photography, south asian, warm home, emotional"
       
       Prompt 1: doctor + patient scene, south asian characters, warm home
       Prompt 2: caregiver + elderly scene, south asian characters, warm home  
       Prompt 3: nurse + family scene, south asian characters, warm home
       
       The category changes per prompt, the context stays consistent.

    5. FINAL OUTPUT:
       Each prompt in the batch should feel like it was written with a completely different specific scene in mind — not variations of the same sentence.

    1. [IDENTITY LAYER]: Primary Actor + Cultural Context (if human) + Interaction (visible body language).
       - Rule: Clean commercial stock image only. Absolutely no visible text, no logos, no watermarks, no studio lights, no light stands, no softboxes, no camera equipment visible in frame. (Apply this as a system rule, DO NOT output this text in the generated prompt).
       - Rule: If "Business Team" selected but Smart Refinement specifies 1-2 people, obey Smart Refinement.
       - Rule: Clearly define subject count and role.
       - Rule: CULTURAL IDENTITY INJECTION (CRITICAL FOR AUTHENTICITY): If 'culturalContext' is specified AND the subject is a human/person, you MUST explicitly describe this authentic ethnic background in the subject's physical description. If the subject is an object, animal, background, or abstract concept, DO NOT inject the cultural identity, even if specified.
         * IMPORTANT SOUTH ASIAN RULE: If 'South Asian' is selected, you MUST explicitly describe the subject as 'Indian / South Asian' and prioritize authentic Indian features, skin tones, and relevant styling (e.g., "an authentic Indian woman with traditional features, wearing a subtle bindi", "an Indian male with a warm brown skin tone"). HOWEVER, if the 'Smart Refinement' input specifically mentions another nationality (e.g., Bangladeshi, Pakistani, Nepali), prioritize that specific nationality instead. Do NOT output generic "brown-washing".
       - Rule: If ageRange is specified AND the subject is a human/person, inject it directly after the subject description. Examples: 'Senior (60s+)' -> 'elderly woman in her 60s', 'Young Adult (20s-30s)' -> 'young woman in her late 20s'. If the subject is not human, ignore ageRange completely.
       - Rule: GENDER & BODY BUILD PRESERVATION: If Smart Refinement or input specifies a gender (e.g., man, woman) or a body type, physical build, or stature for human subjects (e.g., plus-size, heavy-set, slim, slender, athletic, tall, short), you MUST explicitly describe and preserve this gender, body build, and stature in the subject description for EVERY prompt in the batch. For example, if Smart Refinement mentions a plus-size woman, describe them as "a plus-size woman", NEVER alter them into an unrealistically slender generic figure or change their gender.
       - Rule: FACELESS & CROPPED ACTION SHOT RULE: If framing is 'Close-up / Cropped Action (Faceless)' OR if Smart Refinement describes a faceless/cropped composition (e.g., "close-up on hands and torso, head out of frame", "faceless shot focused on hands"):
         * You MUST enforce a tight, cropped composition focusing on the hands, action, or body gesture with the head/face deliberately excluded or out of frame (e.g., "close-up cropped shot focused on hands", "head cropped out of frame", "faceless commercial composition").
         * NEVER add facial expressions, eye contact, or gaze direction for faceless crops.
         * The focus must remain crisply on the interaction, hands, tools, or objects (e.g. cleaning cloth, painful joint, paperwork, coffee cup).
       - Rule: CONCEPTUAL STILL LIFE & FLAT-LAY RULE: When Smart Refinement describes conceptual tabletop props, business metaphors, or flat-lays (e.g., wooden blocks/tokens, magnifying glasses, progress bars, checklists, with or without cropped hands/fingers):
         * Maintain a clean tabletop flat-lay or high-angle perspective with generous negative space (copy space) on a solid pastel or studio surface.
         * Explicitly describe the minimalist 2D line icons or infographic symbols on the props (e.g., checkmarks, shields, gears, lightbulb idea icons, search symbols).
         * If a hand is interacting, describe ONLY the focused action of the hand/fingers (e.g., "hand placing wooden block", "hand holding magnifying glass"). NEVER invent full-body characters, corporate business suits, or facial features. Keep the person completely faceless and out of frame.
         * Emphasize clean, soft diffused studio lighting, authentic material textures (natural wood grain, glass clarity), and crisp commercial clarity.

    [ISOLATED PNG MODE RULE]:
    When subject = 'Isolated Object (PNG Ready)':
    1. COMPOSITION & FRAMING: The object MUST be perfectly centered on the artboard/canvas. The entire object MUST be completely visible with clear margins (padding) on all sides. ABSOLUTELY NO CROPPING or cutting off at the edges. The object must appear "floating in a void" without resting on a surface.
    2. BACKGROUND & GROUND PLANE: The background MUST be a pure, flat, uniform solid color (e.g., pure white or a solid color that heavily contrasts with the object) with NO gradients, NO textures, and NO environmental details. ABSOLUTELY NO HORIZON LINE AND NO GROUND PLANE. Do NOT generate a fake checkerboard PNG pattern.
    3. LIGHTING & SHADOWS: Lighting MUST be flat, even studio illumination. ABSOLUTELY NO CAST SHADOWS on the ground or background. No harsh directional rim lights that bleed into the background.
    4. PURPOSE & EDGES: The output is designed for instant background removal. Edge contrast must be razor-sharp with a completely clean silhouette.

    [ENVIRONMENTAL 3D RULE]:
    When visualType = 'Abstract Environmental 3D':

    1. COMPOSITION RULE:
    Generate as a full environmental scene.
    Camera is positioned INSIDE or EXTREMELY CLOSE TO the structure. The 3D form fills the entire frame edge-to-edge. No empty background visible.

    2. SUBJECT LANGUAGE:
    Describe as architecture, geometric texture, or landscape — NOT as a floating object. Use terms like:
    "repeating vertical ribbed slats", "fluted glass texture with luminous refraction waves", "linear architectural louvers", "sweeping curved surface", "repeating geometric panels", "parametric ribbed structure", "architectural wave form", "infinite corridor", "repeating pattern receding to vanishing point"

    3. CAMERA LANGUAGE:
    Always include perspective depth or full edge-to-edge frame coverage:
    "full-frame edge-to-edge composition with geometric rhythm", "deep perspective vanishing point", "camera looking along the curve", "perspective depth receding into distance", "immersive first-person viewpoint"

    4. LIGHTING & MATERIALS:
    Ambient self-illumination, dual-tone neon gradients, or translucent refraction from within the structure.
    Use: "dual-tone neon gradient lighting (electric blue, vibrant orange, magenta)", "translucent luminous refraction through ribbed panels", "soft ambient backlight glow emanating through slats", "ambient glow from within", "self-lit geometric form", "integrated environmental lighting"

    5. NEVER USE for this visual type:
    "isolated", "white background", "studio setting", "floating object", "product shot", "softbox", "three-point lighting"

    6. LENGTH: 50-70 words for core prompt body.

    [FLAT LINE ICON RULE]:
    When visualType = 'Flat Line Icon':
    Generate as a single icon or icon set with:
    - Clean bold black outline strokes (3-4px weight)
    - Flat solid light color fill (light blue, teal, or mint — no gradient)
    - White or transparent background
    - Rounded corners on shapes
    - No shadows, no depth, no 3D effect
    - Consistent stroke weight throughout
    - Simple recognizable symbol
    - Icon should be centered with equal padding on all sides

    [ICON CATEGORY AUTO-EXPAND RULE]:
    When visualType = 'Flat Line Icon' AND smartRefinement contains phrases like "icon set", "icons", or a category name (e.g., "real estate", "education", "travel"):

    1. AUTO-GENERATE CONCEPTS: Do NOT ask user for specific icons. Instead, automatically select 1 unique concept from that category for each prompt in the batch.

    2. CONCEPT SELECTION RULE: 
       Each prompt in the batch MUST use a different concept. Never repeat the same object in the same batch.
       
       Example categories and their concepts:
       
       real estate: house, apartment, key, location pin, floor plan, sold tag, moving box, fence, garage, blueprint
       
       education: book, graduation cap, pencil, certificate, globe, calculator, microscope, blackboard, backpack, ruler
       
       e-commerce: shopping cart, delivery box, price tag, barcode, return arrow, wishlist heart, wallet, receipt, store, package
       
       travel: airplane, suitcase, passport, compass, hotel bed, beach umbrella, map pin, camera, ticket, cruise ship
       
       food restaurant: chef hat, coffee cup, fork knife, cooking pot, menu, salad bowl, pizza slice, wine glass, oven, spoon
       
       cybersecurity: shield, fingerprint, padlock, eye scan, VPN, bug, firewall, password, safe, data breach
       
       fitness sports: dumbbell, running figure, trophy, stopwatch, bicycle, water bottle, yoga pose, basketball, medal, jump rope
       
       social media: chat bubble, thumbs up, notification bell, email, video call, share arrow, profile avatar, hashtag, bookmark, live stream
       
       finance: wallet, coin stack, credit card, growth chart, piggy bank, calculator, bank building, invoice, percentage, stock graph

    3. FINAL PROMPT FORMAT for each icon:
       "single [chosen concept] flat line icon, bold black outline, light [color] fill, no gradient, transparent background"
       
       Rotate fill colors across the batch:
       light blue → light teal → soft blue → light mint → sky blue → pale cyan

    2. [CONCEPT LAYER]: Smart Refinement + Concept Focus + Target Market.
       - CRITICAL RULE: If Smart Refinement is provided, it is the core conceptual foundation. ${options.isFromImageReference ? `Since IMAGE REFERENCE EXACT MATCH RULE is active, Option 1 MUST copy the Smart Refinement identically to recreate the image. For Option 2 onwards, you MUST present this EXACT SAME SUBJECT differently by altering the composition, lighting, perspective, and framing. DO NOT change the core subject.` : `You MUST use its core subject and action as the basis, but you are forbidden from copying it identically across options. You MUST visually expand and present this same concept differently in each generated prompt by altering the composition, setting, background, color theme, perspective, and framing. Each prompt must feel like a unique visual representation.`}
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
