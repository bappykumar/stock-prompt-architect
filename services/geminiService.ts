import { PromptOptions, HistoricalPrompt } from "../types";

export function formatApiErrorMessage(error: any, provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini'): string {
  let msg = String(error?.message || error || 'Verification failed');
  
  // Try to parse nested JSON error if present
  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    }
  } catch (e) {}

  const lower = msg.toLowerCase();

  // 1. Specific HTTP Referrer / Domain restriction
  if (lower.includes('referer') || lower.includes('referrer') || lower.includes('ip_referer_blocked')) {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'this preview domain';
    return `Google Cloud Domain Restriction: Requests from ${currentOrigin} are blocked. In Google Cloud Console (APIs & Services > Credentials), edit this API Key and set 'Application restrictions' to 'None' or add this website's URL.`;
  }

  // 2. Invalid API Key
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('invalid api key') || lower.includes('unauthorized') || lower.includes('401')) {
    return `Invalid API Key: The key entered for ${provider.toUpperCase()} is incorrect, inactive, or unauthorized. Please verify and re-enter your key.`;
  }

  // 3. Quota exceeded / Rate limit
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit') || lower.includes('429')) {
    return `Quota Exceeded: The rate limit or token quota for this ${provider.toUpperCase()} key has been reached. Please wait a moment or use a paid/different key.`;
  }

  // 4. API not enabled
  if (lower.includes('service_disabled') || lower.includes('has not been used in project') || lower.includes('api is not enabled')) {
    return `API Not Enabled: Generative Language API is not enabled for this Google Cloud project. Enable it in Google Cloud Console.`;
  }

  // 5. Project deleted / Key entity not found vs Model not found
  if (lower.includes('project') && (lower.includes('not found') || lower.includes('deleted') || lower.includes('inactive'))) {
    return `Project Deleted / Inactive: The Google Cloud project linked to this key was deleted or disabled. Create a new key in an active project.`;
  }
  if (lower.includes('requested entity was not found') || lower.includes('api key not found')) {
    return `Key / Project Not Found: This API key or its Google Cloud project is no longer active or lacks access to this endpoint.`;
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return `Model / Endpoint Not Found: The selected model or endpoint is not enabled for this key.`;
  }

  // 6. Generic 403 Forbidden (distinguish Gemini from others)
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission_denied')) {
    if (provider === 'gemini') {
      return `Google Cloud 403 Forbidden: Request was rejected. Common causes: (1) Key is restricted to your Vercel website domain in Google Cloud Console, (2) Country/region restriction, or (3) Billing/IAM permission issue on your Google account.`;
    }
    return `Access Denied (403): ${provider.toUpperCase()} rejected the request. Please check your account permissions and tier limits.`;
  }

  return msg;
}

export const testApiKey = async (apiKey: string, provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini'): Promise<boolean> => {
  try {
    const cleanKey = apiKey.trim();
    if (provider === 'gemini') {
      let serverOk = false;
      let serverErrMsg = '';
      try {
        const response = await fetch('/api/gemini/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanKey })
        });
        if (response.ok) {
          return true;
        }
        const errData = await response.json().catch(() => ({}));
        serverErrMsg = errData.error || `Gemini API test failed (${response.status})`;
      } catch (e: any) {
        serverErrMsg = e?.message || 'Server test route unreachable';
      }

      if (!cleanKey) {
        throw new Error(serverErrMsg || 'No Gemini API key provided.');
      }

      const isVertexKey = cleanKey.startsWith('AQ.');
      if (isVertexKey) {
        const vertexModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const vm of vertexModels) {
          const vertexRes = await fetch(
            `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${vm}:countTokens?key=${encodeURIComponent(cleanKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
            }
          );
          if (vertexRes.ok) return true;
        }
      }

      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
      );
      if (directRes.ok) {
        return true;
      }
      const errText = await directRes.text();
      if (!isVertexKey) {
        const vertexModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const vm of vertexModels) {
          const vertexRes = await fetch(
            `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${vm}:countTokens?key=${encodeURIComponent(cleanKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
            }
          );
          if (vertexRes.ok) return true;
        }
      }
      let parsedMsg = errText;
      try { parsedMsg = JSON.parse(errText).error?.message || errText; } catch (e) {}
      throw new Error(`Gemini API test failed: ${directRes.status} - ${parsedMsg}`);
    } else if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try { parsedMsg = JSON.parse(errText).error?.message || errText; } catch(e) {}
        throw new Error(`Groq API test failed: ${response.status} - ${parsedMsg}`);
      }
      return true;
    } else if (provider === 'mistral') {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try { parsedMsg = JSON.parse(errText).message || errText; } catch(e) {}
        throw new Error(`Mistral API test failed: ${response.status} - ${parsedMsg}`);
      }
      return true;
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        let parsedMsg = errText;
        try { parsedMsg = JSON.parse(errText).error?.message || errText; } catch(e) {}
        throw new Error(`OpenRouter API test failed: ${response.status} - ${parsedMsg}`);
      }
      return true;
    }
    return false;
  } catch (error: any) {
    console.warn("API Key Test Failed:", error);
    const formatted = formatApiErrorMessage(error, provider);
    throw new Error(formatted);
  }
};

export function stripColorDescriptors(text: string): string {
  if (!text) return text;
  let sanitized = text;
  
  // Neutralize overly specific dispenser mechanic words that cause generators to hallucinate wrong caps/nozzles
  // while preserving the scene, surface, pose, and background context needed for Prompt #1 exact cloning
  sanitized = sanitized.replace(/\b(a|an|the)\s+(cosmetic|skincare|serum|lotion|shampoo|perfume|beverage|soda|energy drink)?\s*(pump\s+bottle|dropper\s+bottle|spray\s+bottle|squeeze\s+tube|dispenser\s+bottle)\b/gi, 'the referenced product');
  sanitized = sanitized.replace(/\b(holding|gripping|carrying|presenting|showcasing|displaying)\s+(a|an)\s+(bottle|can|jar|tube|box|pouch|container)\b/gi, '$1 the referenced product');
  sanitized = sanitized.replace(/\b(with\s+(a\s+)?pump(\s+dispenser)?|with\s+(a\s+)?dropper|with\s+(a\s+)?spray\s+nozzle)\b/gi, '');

  return sanitized.replace(/\s{2,}/g, ' ').replace(/\s+([,.\?!])/g, '$1').trim();
}

export function stripBiometricDescriptors(text: string): string {
  if (!text) return text;
  let sanitized = text;

  // 1. Specific hairstyle, hair cut, length, and hair color phrases
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(short|long|medium|shoulder-length|curly|wavy|straight|slicked-back|tapered|buzzcut|fade|messy|glossy|sleek)?\s*(dark|black|brown|blonde|blond|brunette|red|auburn|grey|gray|silver)?\s*(hair|hairstyle|haircut|curls|waves|locks|ponytail|bun)\b/gi, '');

  // 2. Specific facial hair / beard phrases
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(full\s+|thick\s+|light\s+|heavy\s+|trimmed\s+)?(beard|goatee|mustache|stubble)\b/gi, '');
  sanitized = sanitized.replace(/\bclean-shaven\b/gi, '');

  // 3. Specific skin tone / complexion phrases
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(warm|cool|neutral)?\s*(fair|pale|tan|tanned|olive|golden|bronze|dark|brown|light|deep)\s*(skin|skin\s+tone|complexion|undertone)\b/gi, '');

  // 4. Specific eye colors
  sanitized = sanitized.replace(/\b(with|having)?\s*(blue|brown|green|hazel|dark|amber)\s+eyes\b/gi, '');

  // 5. Specific jawline / cheekbone / bone structure descriptors
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(defined|square|sharp|chiseled)\s*(jawline|jaw|cheekbones|facial\s+structure)\b/gi, '');

  // 6. Clean up orphaned prepositions, conjunctions, extra commas and spaces
  sanitized = sanitized.replace(/\bwith\s*,/gi, ',');
  sanitized = sanitized.replace(/\bwith\s+and\b/gi, 'and');
  sanitized = sanitized.replace(/\bwith\s*\./gi, '.');
  sanitized = sanitized.replace(/\bwith\s*$/gi, '');
  sanitized = sanitized.replace(/\s*,\s*,\s*/g, ', ');
  sanitized = sanitized.replace(/\s*,\s*\./g, '.');
  sanitized = sanitized.replace(/,\s*and\s*wearing/gi, ', wearing');
  sanitized = sanitized.replace(/\b(A\s+man|A\s+woman|A\s+person)\s*,\s*/gi, '$1 ');
  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/\s+([,.\?!])/g, '$1').trim();

  return sanitized;
}

export function sanitizeGeneratedPrompt(text: string): string {
  if (!text) return text;
  let cleaned = text.trim();

  // Strip any accidental trailing negative/safety keyword blocks if an LLM outputs them
  const negativeBlockTriggers = [
    /\bno background,\s*no environment[\s\S]*$/i,
    /\bno extra fingers,\s*no distorted hands[\s\S]*$/i,
    /\bno plastic skin texture,\s*no waxy doll face[\s\S]*$/i,
    /\bface distortion,\s*distorted facial features[\s\S]*$/i,
    /\bstudio equipment,\s*light stands,\s*softboxes[\s\S]*$/i,
    /\bno copyright elements,\s*no signature,\s*no labels[\s\S]*$/i,
    /\bcheckerboard background,\s*transparency grid[\s\S]*$/i,
  ];

  for (const pattern of negativeBlockTriggers) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Strip standalone banned hardware / artifact terms that cause image generators to hallucinate equipment, paper rolls, or grids
  cleaned = cleaned.replace(/\b(studio equipment|light stands?|softbox(es)?|octabox(es)?|c-stands?|lighting umbrellas?|reflector panels?|backdrop lights?|production hardware|studio clutter|behind the scenes|checkerboard background|transparency grid|pristine seamless cyclorama|paper cyclorama|studio cyclorama|infinity cove)\b[,\s]*/gi, '');
  cleaned = cleaned.replace(/\bminimalist studio setting\b/gi, 'clean minimalist composition');
  cleaned = cleaned.replace(/\bgradient studio backdrop\b/gi, 'seamless gradient background');
  cleaned = cleaned.replace(/\bstudio backdrop\b/gi, 'seamless background');

  // Clean up trailing commas or periods
  cleaned = cleaned.replace(/,\s*$/, '.').replace(/\s{2,}/g, ' ').replace(/\s+([,.\?!])/g, '$1').trim();
  return cleaned;
}


export async function analyzeReferenceAndSuggestSettings(
  input: { type: 'image', data: string, mimeType: string } 
       | { type: 'text', description: string },
  availableOptions: any,
  apiKey: string,
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini',
  isProductPreservation: boolean = false,
  preservationType: 'product' | 'human' = 'product'
): Promise<any> {
  const isPreservationActive = !!isProductPreservation;
  const isProdPreservation = isPreservationActive && preservationType === 'product';
  const isHumanPreservation = isPreservationActive && preservationType === 'human';
  
  const finalKey = apiKey ? apiKey.trim() : '';
  if (provider !== 'gemini' && !finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }

  let analysisPrompt = '';

  if (input.type === 'image') {
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
- Food, Beverage & Culinary:
  * ISOLATED FOOD / INGREDIENT CUTOUTS ON WHITE (CRITICAL): If food ingredients, fruit/vegetable slices (e.g., overlapping tomato slices), scattered herbs/basil leaves, spices, or food items are floating or arranged directly on a 100% pure white cutout background with NO plate, NO bowl, NO table surface texture, and NO cast ground shadows (PNG cutout asset style): You MUST set 'subject' to "Isolated Object (PNG Ready)", 'environment' to "White Background", 'shadowStyle' to "No Shadow / Flat", and 'framing' to "Full shot (full body)". In 'smartRefinement', explicitly state if the slices/items are overlapping in the center (e.g., "two overlapping round cross-section red tomato slices in the center surrounded by floating basil leaves, black peppercorns, and seeds") with uncropped white margins.
  * PLATED / TABLETOP FOOD & STILL LIFE: If the food/dish is served in a bowl, on a plate, banana leaf, or tabletop surface: Set 'subject' to "Still life / Food & Drink". Set 'characterBackground', 'ageRange', 'interaction' to FALSE in 'activeFields'.
  * ENVIRONMENT RULE FOR FOOD & TABLETOP: If the food/dish is shot close-up on a tabletop, wooden board, plate, or banana leaf against a clean, white, or softly blurred neutral background with NO actual restaurant room interior (no tables, chairs, bar counters, or waiters) visible, you MUST set 'environment' to "White Background" (if white cutout/backdrop) or "Solid Color / Studio" (if clean tabletop/studio surface). NEVER set 'environment' to "Cafe / Restaurant" or "Modern Kitchen" unless a real room interior is clearly visible in the background!
- Physical Products, Isolated Objects, Cutouts, Frames & Podiums Differentiation:
  * If the object is a standalone cutout, 3D asset, decorative border/frame, vintage plaque, wooden podium/lectern, trophy, or isolated item on a plain white, transparent, or flat solid background with NO room interior and NO floor horizon: Set 'subject' to "Isolated Object (PNG Ready)", 'environment' to "White Background" (or "Solid Color / Studio"), 'framing' to "Full shot (full body)", 'cameraAngle' to "Eye Level", and 'shadowStyle' to "No Shadow / Flat" or "Minimal Base Shadow".
  * ORNAMENTAL FRAMES, VINTAGE BORDERS & PLAQUES RULE: If the image shows an empty decorative border, vintage carnival frame with bulb lights around the rim, badge, or plaque with a blank copy-space center, describe it in 'smartRefinement' as an "ornate vintage decorative frame border with a blank center" (NEVER call it a "marquee sign" or "letterboard", because "marquee sign" causes AI image generators to draw horizontal letter-track slots across the center!).
  * SPLIT-SCREEN / DUAL-BACKGROUND ASSET PREVIEW RULE: If the image is a split-screen or two-tone comparison preview showing the SAME glowing asset or overlay (such as a string of warm fairy lights, glowing garland, or light effect) across a dark half and a light half to demonstrate transparency, DO NOT describe a split or contrasting dark-and-light background! Instead, describe ONLY the core asset itself (e.g., "a string of warm glowing fairy lights arranged in a gentle hanging curve on a clean solid background"), set 'subject' to "Isolated Object (PNG Ready)", and 'framing' to "Full shot (full body)".
  * If the product/object is resting on a real environmental surface (table, desk, counter, floor) with intentional scene styling or cast shadows: Set 'subject' to "No person (product)".
  * In all non-human object cases, set human/demographic fields ('characterBackground', 'ageRange', 'interaction') strictly to FALSE in 'activeFields'.
- Robotic Hands, Prosthetics & Non-Human Figures:
  * If the subject is a robotic hand, mechanical arm, mannequin, or statue (not a living flesh-and-blood human): Set 'subject' to "No person (product)", and set 'characterBackground', 'ageRange', 'interaction', and 'authenticity' strictly to FALSE in 'activeFields'.
- Landscapes, Stages, Botanical Foregrounds & Copy-Space Backdrops (without people):
  * If the image shows an empty theatrical stage with curtains/spotlights, architectural interior, nature, or cityscape with no people: Set 'subject' to "Background / Landscape only" (or "No person (product)" if centered on a specific stage/structure), set all human fields ('characterBackground', 'ageRange', 'interaction', 'authenticity') strictly to FALSE.
  * FOREGROUND TERRAIN / MOSSY HILL WITH GRADIENT SKY/BACKGROUND RULE: If the image shows a continuous natural foreground (such as a lush green mossy hill/ground adorned with small flowers and driftwood) spanning edge-to-edge across the bottom of the frame with a smooth gradient sky/background above (copy space): Set 'subject' to "Background / Landscape only". In 'smartRefinement', explicitly describe the foreground as "a continuous lush green moss hill spanning edge-to-edge across the entire bottom foreground, adorned with small flowers and driftwood, with a seamless warm peach-to-cream gradient sky above" — NEVER call it a small isolated "mound resting against a studio backdrop" (because "studio backdrop" causes AI generators to draw a physical studio paper roll and metal stands on the sides!).
- Color Mood Restraint Rule:
  * ONLY set 'colorMood' to an active value if the image has a strong, deliberate stylistic color grade across the entire scene.
  * For isolated objects on white backgrounds (even if the object itself has gold/red/warm colors) or natural outdoor blue skies, set 'colorMood' to "Default / Auto" and FALSE in 'activeFields' so the generator does not tint neutral white backgrounds yellow or turn natural blue skies into a "clinical sterile color palette".
- Abstract Metadata Restraint Rule (CRITICAL FOR CLEAN IMAGE RECREATION):
  * For image analysis, always set abstract marketing fields ('conceptFocus', 'targetMarket', 'authenticity', 'qualityCamera') to "Default / Auto" in 'settings' and FALSE in 'activeFields'. Visual prompts should be driven purely by physical, optical, and compositional attributes, not abstract marketing labels.
- Framing & Camera Angle:
  * Head / Face focus -> 'framing': "Portrait"
  * Waist-up human view -> 'framing': "Mid shot (waist-up)"
  * Full human body OR full uncropped standalone object/stage -> 'framing': "Full shot (full body)"
  * Human hands, cropped human gestures or tight macro detail -> 'framing': "Close-up / Cropped Action (Faceless)"
  * Overhead 90-degree tabletop view -> 'cameraAngle': "Top View / Flat Lay"
  * Straight-on front view -> 'cameraAngle': "Eye Level"
  * Looking upwards -> 'cameraAngle': "Low Angle"
- Environment & Background:
  * Pure white or transparent cutout -> 'environment': "White Background"
  * Clean tabletop or solid studio backdrop -> 'environment': "Solid Color / Studio"
  * Black background -> 'environment': "Pitch Black / Void"
  * Office / workplace -> 'environment': "Modern Office"
  * Outdoor / nature / sky -> 'environment': "Nature / Outdoor"

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
${isProdPreservation ? `STRICT PRODUCT PRESERVATION DIRECTIVE (PRODUCT PRESERVATION ACTIVE):
- PRODUCT REFERENCE RULE (STRICTLY NO DISPENSER OR PACKAGING MECHANIC BIAS):
  You MUST refer to the hero item as "the referenced product" or "the product" (e.g. write "A woman holding the referenced product near her cheek", "the referenced product resting on a travertine stone slab", "a manicured hand holding the referenced product").
  CRITICAL & STRICTLY FORBIDDEN: DO NOT specify packaging mechanics or dispenser types like "pump bottle", "pump", "dropper bottle", "dropper", "spray bottle", "squeeze tube", or "twist cap" because naming dispenser mechanics causes AI generators to mutate the cap/packaging instead of copying the exact reference product!
- SCENE, SURFACE & POSE FIDELITY FOR PROMPT #1 CLONING:
  Accurately describe the exact surface/podium, model/hand pose, wardrobe, and seamless background tone visible in the reference image so Prompt #1 can recreate the reference scene 100% same-to-same while locking the product packaging. NEVER use the phrase "studio backdrop" or "cyclorama" (use "seamless background" or "clean surface" instead).
- CAMPAIGN & STILL-LIFE DETECTION:
  * If a human model is holding/showcasing the product: describe the model's gender, expression, hair/skin interaction, wardrobe, and zero-occlusion hand placement holding "the referenced product". Map 'visualType' to "Ultra Realistic", 'lighting' to "Soft Studio Lighting" or "Dramatic Studio Lighting", 'framing' to "Portrait" or "Mid shot (waist-up)".
  * If NO human model is present (standalone product): map 'subject' to "No person (product)", set ALL human fields ('characterBackground', 'ageRange', 'interaction', 'authenticity') strictly to FALSE, and describe ONLY the product's placement, surface material (e.g., marble slab, wooden surface, water ripples, minimalist pedestal, or pure white cutout), and lighting. NEVER mention any human, hand, or face!
  * If ONLY a faceless hand/fingers are holding the product: map 'subject' to "No person (product)", set 'characterBackground' and 'ageRange' to FALSE, set 'framing' to "Close-up / Cropped Action (Faceless)", and describe a manicured hand holding "the referenced product" with a zero-occlusion grip.` : isHumanPreservation ? `STRICT HUMAN IDENTITY & POSE TRANSFER PRESERVATION DIRECTIVE (HUMAN PRESERVATION ACTIVE - IDENTITY LOCK + EXACT POSE CLONE FOR #1):
- PURPOSE & WORKFLOW: The user is preserving the exact human/person from the reference photo. The visual reference supplies 100% of the authentic facial identity, facial structure, skin tone, and hair.
- In 'smartRefinement':
  * Accurately describe the subject's GENDER ("man", "woman", "person"), EXACT POSE & BODY POSTURE from the reference (e.g., "leaning against a neutral wall", "arms crossed comfortably", "seated at a modern desk"), EXACT WARDROBE & STYLING (e.g., "wearing an olive-green button-up shirt and watch", "in a tailored charcoal blazer"), NATURAL GAZE/EXPRESSION (e.g., "looking forward with a relaxed smile"), and the setting/background so Prompt #1 is a 100% exact clone of the reference shot!
  * STRICT BIOMETRIC-NEUTRAL RULE (PREVENTING FACE/HAIR TEXT CONFLICTS):
    1. DO NOT write specific haircut, hairstyle, hair length, or hair color words (e.g., no "short dark hair", "tapered fade", "blonde curls").
    2. DO NOT write specific skin tone or complexion words (e.g., no "warm olive skin", "fair pale skin").
    3. DO NOT write permanent facial bone landmarks or eye color (e.g., no "square jawline", "blue eyes").
    REASON: Biometric text overrides the reference face in AI generators. By omitting biometric text and describing the exact pose, outfit, expression, and scene, the reference photo locks 100% of the face/hair while Prompt #1 clones the exact reference shot!
- In 'settings':
  * Map 'subject' to "Solo person (Adult)" or best matching human category, and set 'interaction' to the visible body language or pose.` : `FLEXIBLE COLOR & CONTAINER RULE:
Describe the subject, attire, container, or setting naturally as seen in the reference (e.g. "person wearing a blue shirt", "smiling woman in a magenta top holding a cosmetic bottle while touching her sleek hair", "woman in red lace holding a ruby perfume flacon near her face", "amber glass bottle on travertine slab"). You may include natural visual colors and container descriptions as observed in the image.
- BEAUTY & HAIRCARE CAMPAIGN DIRECTIVE (PRESERVATION OFF):
  If the image is a beauty/haircare campaign: describe model's expression (radiant smile or haute-couture gaze), wardrobe color keyed to product (e.g. "in magenta knit top", "in olive halter top with gold cuffs", "in red lace dress"), the product held near face/hair, and any tabletop product lineup present.
- HAND-HELD LUXURY PRODUCT & BOTTLE INTERACTION (FACELESS HAND & BOTTLE):
  If the image shows a hand holding a perfume or cosmetic bottle: map 'subject' to "Product / Object Only" or "Still life / Food & Drink", set 'interaction' to "Holding" or "Showcasing", set 'characterBackground' and 'ageRange' to FALSE (faceless crop), and describe the elegant hand holding the bottle with natural colors and luxury finishes.`}
AVOID specifying race, ethnicity, or age IN THIS FIELD. Focus on gender, notable body build (if any), core action, key props, and expression (if face is visible). No technical camera terms or lighting terms.

3. "activeFields": A boolean map of the fields. Set to true if the field is RELEVANT to the visual scene, even if not explicitly the main focus. Set to false ONLY if the field is completely irrelevant to the visual context. Include keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
IMPORTANT LOGIC: If there are people or characters shown in the image, 'characterBackground', 'ageRange', and 'interaction' MUST be true (EXCEPT when Human Preservation Mode is active: set 'characterBackground' to false so ethnic text tags do not conflict with the reference face). If there are NO people/characters, 'characterBackground', 'ageRange', and 'interaction' MUST be false, and 'subject' MUST be mapped to a non-human category (like "No person", "Isolated Object", "Background"). If the image is a flat illustration or vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.
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
  
  2. "smartRefinement": A concise core description of the main subject and their specific action/appearance based on the input. Maximum 25 words. If a person/human is described, observe and explicitly state their GENDER (e.g., "man", "woman", "boy", "girl", "baby"). If the gender is completely unspecified or neutral, use "person". DO NOT specify age categories (like "young adult" or "senior") in this field, as age is mapped to the 'settings' object separately. For BODY BUILD, ONLY mention it if they are distinctly outside the average/standard norm (e.g., "plus-size", "heavy-set", "muscular"). If they have an average/slim body, DO NOT mention their body type at all. FACELESS & ACTION CROP RULE: If the concept focuses on hands, gestures, or cropped body parts without showing a face (e.g. holding a product, typing, wrist pain, cleaning surface), describe this framing clearly (e.g. "close-up on hands and torso, faceless composition") and omit eye gaze direction. CONCEPTUAL FLAT-LAY & TABLETOP STILL LIFE RULE: If the concept is a conceptual business/abstract tabletop still life (wooden blocks, tokens, magnifying glasses, puzzle pieces, checklists, or progress bars with minimalist 2D line icons/symbols on a solid pastel or studio background, with or without a cropped hand/fingers interacting), focus on the physical props, minimalist 2D icons, and clean composition with ample copy space. Do NOT invent full-body characters or business suits. CAMERA DIRECTION RULE: If the face is visible and the text mentions looking at the camera, rephrase it to "looking forward" or "making eye contact"; DO NOT use the word "camera". ${isProdPreservation ? `STRICT PRODUCT PRESERVATION DIRECTIVE (PRODUCT PRESERVATION ACTIVE): Refer to the hero item as "the referenced product" without specific dispenser mechanic words like "pump bottle" or "dropper". Preserve the scene, surface, and pose context accurately.` : isHumanPreservation ? `STRICT HUMAN IDENTITY & POSE TRANSFER PRESERVATION DIRECTIVE (HUMAN PRESERVATION ACTIVE): Describe the subject's gender, exact pose, posture, wardrobe, and natural expression. STRICTLY DO NOT write specific hair cut, hair style, hair color, skin tone, or permanent facial landmarks, so that visual reference face photos retain 100% identity without conflicting text overrides.` : `FLEXIBLE COLOR & CONTAINER RULE: Describe the subject, attire, container, or setting naturally based on the input text. You may include colors if specified in the concept.`} AVOID specifying race, ethnicity, or age IN THIS FIELD. Focus on gender, notable body build, core action, and props. No technical camera or lighting terms.
  
  3. "activeFields": A boolean map of the fields. Set to true if the field is RELEVANT to the scene, even if not explicitly described. Set to false ONLY if the field is completely irrelevant to the scene context. You MUST provide a boolean value for ALL of these keys: subject, characterBackground, ageRange, interaction, targetMarket, imageMedium, visualType, materialStyle, conceptFocus, authenticity, environment, colorMood, qualityCamera, framing, cameraAngle, lighting, shadowStyle.
  IMPORTANT LOGIC: If there are people or characters in the scene, 'characterBackground', 'ageRange', and 'interaction' MUST be true (EXCEPT when Human Preservation is active: set 'characterBackground' to false). If there are NO people/characters, 'characterBackground', 'ageRange', and 'interaction' MUST be false, and 'subject' MUST be mapped to a non-human category (like "No person", "Isolated Object", "Background"). If the concept is a flat illustration or 2D vector art, you MUST set photographic fields (qualityCamera, framing, cameraAngle, lighting, shadowStyle, authenticity) to false, as they do not apply to flat graphics.
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
      let directSuccess = false;
      let lastDirectErr: any = null;

      // Fast-path: When user has their own API key, call Google directly first to skip serverless cold-start double-hop
      if (finalKey) {
        const isVertexKey = finalKey.startsWith('AQ.');
        const restParts = contents.map((item: any) => {
          if (item.inlineData) {
            return { inline_data: { mime_type: item.inlineData.mimeType, data: item.inlineData.data } };
          }
          return { text: item.text };
        });
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
        const standardEndpoint = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(finalKey)}`;
        const vertexEndpoint = (m: string) => `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(finalKey)}`;
        const endpoints = isVertexKey ? [vertexEndpoint, standardEndpoint] : [standardEndpoint, vertexEndpoint];

        for (const buildUrl of endpoints) {
          for (const m of candidateModels) {
            try {
              const generationConfig: Record<string, any> = { responseMimeType: 'application/json' };
              if (m.includes('2.5-flash') || m === 'gemini-flash-latest') {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }
              const directRes = await fetch(
                buildUrl(m),
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts: restParts }],
                    generationConfig
                  })
                }
              );
              if (directRes.ok) {
                const directData = await directRes.json();
                rawText = directData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (rawText) {
                  directSuccess = true;
                  break;
                }
              } else {
                const errText = await directRes.text();
                let parsedMsg = errText;
                try { parsedMsg = JSON.parse(errText).error?.message || errText; } catch (e) {}
                lastDirectErr = new Error(parsedMsg || `Gemini analysis failed (${directRes.status})`);
                const errLower = parsedMsg.toLowerCase();
                if (errLower.includes('api key not valid') || errLower.includes('api_key_invalid')) break;
                if (directRes.status === 404 || directRes.status === 400 || directRes.status === 401 || directRes.status === 403 || directRes.status === 503) continue;
                break;
              }
            } catch (networkErr: any) {
              lastDirectErr = networkErr;
              break;
            }
          }
          if (directSuccess) break;
        }
      }

      if (!directSuccess) {
        let serverSucceeded = false;
        let serverErrMsg = '';
        try {
          const response = await fetch('/api/gemini/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, apiKey: finalKey })
          });
          if (response.ok) {
            const data = await response.json();
            rawText = data.text || "";
            if (rawText) serverSucceeded = true;
          } else {
            const errData = await response.json().catch(() => ({}));
            serverErrMsg = errData.error || `Gemini analysis failed (${response.status})`;
          }
        } catch (e: any) {
          serverErrMsg = e?.message || 'Gemini analysis route unreachable';
        }

        if (!serverSucceeded) {
          throw lastDirectErr || new Error(serverErrMsg || 'No Gemini API key found. Please add your Gemini API key in Config.');
        }
      }
    } else if (provider === 'groq') {
      const isImageInput = input.type === 'image';
      const groqModels = isImageInput
        ? ['meta-llama/llama-4-scout-17b-16e-instruct']
        : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      const groqMessages = isImageInput
        ? [{
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.data.replace(/^data:(.*,)?/, '')}` } }
            ]
          }]
        : [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${input.description}` }];

      let groqSuccess = false;
      let lastGroqErr: any = null;
      for (const m of groqModels) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: groqMessages,
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || "";
          groqSuccess = true;
          break;
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {}
          lastGroqErr = new Error(`Groq API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 429 || response.status === 503) continue;
          throw lastGroqErr;
        }
      }
      if (!groqSuccess && lastGroqErr) throw lastGroqErr;
    } else if (provider === 'mistral') {
      const isImageInput = input.type === 'image';
      const mistralModels = isImageInput
        ? ['pixtral-12b-2409', 'mistral-small-latest']
        : ['mistral-small-latest', 'mistral-large-latest'];
      const mistralMessages = isImageInput
        ? [{
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image_url', image_url: `data:${input.mimeType};base64,${input.data.replace(/^data:(.*,)?/, '')}` }
            ]
          }]
        : [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${input.description}` }];

      let mistralSuccess = false;
      let lastMistralErr: any = null;
      for (const m of mistralModels) {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: mistralMessages,
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || "";
          mistralSuccess = true;
          break;
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || parsed.message || errText; } catch(e) {}
          lastMistralErr = new Error(`Mistral API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 429 || response.status === 503) continue;
          throw lastMistralErr;
        }
      }
      if (!mistralSuccess && lastMistralErr) throw lastMistralErr;
    } else if (provider === 'openrouter') {
      const isImageInput = input.type === 'image';
      const orModels = isImageInput
        ? ['google/gemma-3-27b-it:free', 'openrouter/free']
        : ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'openrouter/free'];
      const orMessages = isImageInput
        ? [{
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.data.replace(/^data:(.*,)?/, '')}` } }
            ]
          }]
        : [{ role: 'user', content: `${analysisPrompt}\n\nDescription: ${input.description}` }];

      let orSuccess = false;
      let lastOrErr: any = null;
      for (const m of orModels) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: orMessages,
            temperature: 0.2
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || "";
          if (rawText) {
            orSuccess = true;
            break;
          }
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {}
          lastOrErr = new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 429 || response.status === 503) continue;
          throw lastOrErr;
        }
      }
      if (!orSuccess && lastOrErr) throw lastOrErr;
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
    
    const parsed = JSON.parse(jsonString.trim());
    if (isProdPreservation && parsed && typeof parsed.smartRefinement === 'string') {
      parsed.smartRefinement = stripColorDescriptors(parsed.smartRefinement);
    } else if (isHumanPreservation && parsed && typeof parsed.smartRefinement === 'string') {
      parsed.smartRefinement = stripBiometricDescriptors(parsed.smartRefinement);
    }
    return parsed;
  } catch (error: any) {
    console.warn("Analysis Error:", error);
    const formatted = formatApiErrorMessage(error, provider);
    throw new Error(formatted);
  }
}

export const generateStockPrompts = async (
  options: PromptOptions, 
  apiKey: string,
  sessionHistory: HistoricalPrompt[] = [],
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini',
  isSubBatchContinuation: boolean = false,
  subBatchIndex: number = 0
): Promise<{text: string}[]> => {
  
  const finalKey = apiKey ? apiKey.trim() : '';

  if (provider !== 'gemini' && !finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }

  // Parallel chunking for large batch requests (e.g., 30 to 100 prompts in 1 click)
  // Running chunks in parallel cuts 50-100 prompt generation time from ~45s down to ~10s!
  const MAX_CHUNK_SIZE = 25;
  if (!isSubBatchContinuation && options.quantity > MAX_CHUNK_SIZE) {
    const totalRequested = options.quantity;
    const chunkSizes: number[] = [];
    let remaining = totalRequested;
    while (remaining > 0) {
      const size = Math.min(remaining, MAX_CHUNK_SIZE);
      chunkSizes.push(size);
      remaining -= size;
    }

    const chunkPromises = chunkSizes.map((chunkCount, idx) => {
      const isFirstChunk = idx === 0;
      const chunkOptions: PromptOptions = {
        ...options,
        quantity: chunkCount,
        isFromImageReference: isFirstChunk ? options.isFromImageReference : false,
      };
      return generateStockPrompts(
        chunkOptions,
        apiKey,
        sessionHistory,
        provider,
        !isFirstChunk,
        idx
      );
    });

    const chunkResults = await Promise.all(chunkPromises);
    return chunkResults.flat().slice(0, totalRequested);
  }

  // Helper to check if a field is active and not default (respects Multi-Lock pools)
  const getFieldVal = (key: keyof PromptOptions, val: string) => {
    if (options.activeFields && options.activeFields[key] === false) return null;
    if (options.lockedFields?.[key]) {
      const rawPool = ((options as any).lockedPools?.[key] || []) as string[];
      const cleanPool = rawPool.filter(v => v && v !== 'Default / Auto');
      if (cleanPool.length > 1) {
        return `MULTI-LOCK POOL (ALL ${cleanPool.length} ACTIVE — rotate evenly across prompts): ${cleanPool.join(' | ')}`;
      }
      if (cleanPool.length === 1) {
        return cleanPool[0];
      }
    }
    if (val === 'Default / Auto') return null;
    return val;
  };

  try {

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
        cameraGear = `commercial photography`; 
      }

      renderingInstructions = `
      - MODE: REALISTIC PHOTOGRAPHY
      - VOCABULARY: Use natural photographic language (${cameraGear}). Never capitalize "Professional Photography" in the middle of a sentence.
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
       - Enforce: Even exposure, natural colors, single dominant light direction.
       - Avoid: Mixed conflicting light sources, blown highlights, stacked lighting types.

    2. ENVIRONMENT-BASED AUTO LIGHT MAPPING:
       - IF Environment = "Modern Office" → Use "soft diffused window daylight, balanced indoor ambient fill".
       - IF Environment = "White Background" → Use "bright even illumination, clean shadowless white background".
       - IF Environment = "Outdoor" → Use "natural daylight, soft natural shadows".
       - IF Environment = "Neon City" → Use "neon glow as dominant light, controlled secondary fill".
       - Rule: Never mix incompatible lighting sources automatically.

    3. ATMOSPHERE CONFLICT RESOLUTION:
       - IF "Golden Hour" + "Studio" → Prioritize Golden Hour, remove studio language.
       - IF "Cinematic Lighting" + "Corporate Target" → Reduce dramatic contrast, maintain professional clarity.
       - IF "Volumetric Lighting" + "Clean Commercial" → Soften volumetric intensity, avoid extreme beams.
       - Rule: Ensure only one dominant lighting mood remains active.

    4. SHADOW & BACKGROUND HYGIENE:
       - Do NOT write the cliché phrase "properly exposed subject with balanced dynamic range, controlled highlights, and soft realistic shadows" in every prompt.
       - NEVER write the phrases "studio backdrop" or "minimalist studio setting", because AI image generators literally draw a physical studio room with a curling paper roll and metal backdrop stands on the left and right edges! Instead, write "seamless [color] background" or "clean [color] background".
       - If subject is 'Isolated Object (PNG Ready)' or shadowStyle is 'No Shadow / Flat', strictly enforce ZERO cast shadows on the pure white background.

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
    const isEnvironmental3D = options.visualType === 'Abstract Environmental 3D';
    const isHumanSubject = !nonHumanSubjects.some(key => options.subject?.includes(key));
    const isPreservationActive = !!options.productPreservation;
    const preservationType = options.preservationType || 'product';
    const isProductPreservation = isPreservationActive && preservationType === 'product';
    const isHumanPreservation = isPreservationActive && preservationType === 'human';

    // --- PRESERVATION ENGINE (PRODUCT & HUMAN IDENTITY) ---
    let productPreservationEngine = "";
    if (isProductPreservation) {
      productPreservationEngine = `
      [PRODUCT PRESERVATION & BRAND COLOR HARMONIZATION MODE: ACTIVE]
      CRITICAL PRODUCT & PACKAGING FIDELITY DIRECTIVE:
      1. STRICT HERO PRODUCT & PACKAGING LOCK (ZERO RECOLORING OR MUTATION):
         - The physical packaging, container structure, geometry, material finish, exact label typography, font family, logo placement, and original authentic colors of the referenced hero product MUST be preserved 100% identically from the reference image across all prompts.
         - NEVER invent alternative brand names, mutate letters, alter packaging proportions, or change the hero product's original colors.
         - NEVER specify conflicting dispenser mechanics (do NOT write "pump bottle", "dropper bottle", "twist cap", "squeeze tube"); always refer to it as "the referenced hero product in its authentic original packaging and label design as shown in the reference image".

      2. PROMPT #1 (SAME-TO-SAME REFERENCE CLONE) vs PROMPTS #2–#${options.quantity} (COMMERCIAL SHOOT VARIATIONS):
         - In Prompt #1 (Option 1): Recreate the EXACT scene, surface/podium, model/hand interaction, camera angle, lighting, and background from the reference image 100% same-to-same while locking the referenced product identically.
         - In Prompts #2 to #${options.quantity}: Keep the referenced hero product 100% locked and identical, while varying the commercial staging, surface/podium, camera angle, and brand-harmonized lighting so the user gets a complete multi-shot commercial product portfolio!

      3. SEAMLESS MODEL / HAND INTERACTION & ZERO-OCCLUSION GRIP (WHEN HUMAN/HAND IS PRESENT):
         - IF held by a person or manicured hand: Fingers must hold the product delicately by the outer side edges or base—NEVER covering or obscuring the front-facing brand logo or key label typography (100% unobstructed label).
         - Enforce realistic skin micro-texture, natural 5-finger anatomy, and realistic contact shadows between fingers and container.
         - IF NO human or hand is present in the reference: Keep the product standalone on a grounded surface (marble slab, travertine podium, natural wood, water ripples, or clean seamless surface) with natural contact shadows. NEVER invent humans or hands!

      4. HARDWARE-FREE SEAMLESS BACKGROUNDS (ZERO STUDIO EQUIPMENT OR PAPER ROLLS):
         - NEVER write "studio backdrop", "studio cyclorama", "paper cyclorama", "infinity cove", "softbox", "light stand", or "c-stand" (which cause AI generators to draw curling paper rolls and metal stands).
         - Always write "seamless brand-harmonized background", "smooth gradient background", or "clean minimalist surface".
      `;
    } else if (isHumanPreservation) {
      productPreservationEngine = `
      [HUMAN IDENTITY LOCK & POSE TRANSFER PRESERVATION MODE: ACTIVE]
      CRITICAL HUMAN IDENTITY LOCK & POSE TRANSFER FIDELITY DIRECTIVES:
      1. 100% FACIAL IDENTITY & LIKENESS LOCK FROM REFERENCE IMAGE:
         - The person's exact facial features, bone structure, facial contours, jawline, eye shape, nose structure, lip profile, natural skin tone, and hairstyle from the attached reference photo MUST be preserved 100% identically across all prompt variations.
         - ZERO IDENTITY DRIFT: Every prompt in the batch must depict the exact same individual shown in the reference image.

      2. BIOMETRIC-NEUTRAL TEXT PROMPTING (PREVENTING FACE/HAIR TEXT CONFLICTS):
         - Do NOT hardcode conflicting facial biometric words in text (no specific haircut names, hair colors, eye colors, or skin undertone labels).
         - Explicitly delegate facial identity, skin tone, and hair directly to the reference image:
           "the exact same [man/woman/person] shown in the reference image, preserving their authentic facial identity, facial structure, natural skin tone, and hairstyle identically..."

      3. PROMPT #1 (SAME-TO-SAME REFERENCE CLONE) vs PROMPTS #2–#${options.quantity} (CONSISTENT MODEL PORTFOLIO):
         - In Prompt #1 (Option 1): Recreate the EXACT pose, body posture, expression, wardrobe/outfit, camera framing, lighting, and setting from the reference image 100% same-to-same with the preserved person!
         - In Prompts #2 to #${options.quantity}: Keep the exact same preserved person (100% identical face, hair, skin tone, age, and body build) and vary their commercial poses, camera framings (Mid-shot, Close-up portrait, Wide environmental with copy space, Candid action), coordinated wardrobe, and lighting setups.

      4. AUTHENTIC EPIDERMAL MICRO-TEXTURE:
         - Enforce visible high-resolution natural skin texture (micro-pores, natural skin grain, lifelike catchlights in the eyes) with zero plastic/airbrushed smoothing and zero studio equipment in frame.
      `;
    } else {
      productPreservationEngine = `
      [STANDARD COMMERCIAL REALISM & FIDELITY MODE]
      - NATURAL SUBJECT & MATERIAL FIDELITY: Describe only the actual subject, materials, and environment specified in the configuration or Smart Refinement. Do NOT inject cosmetic bottles, glass flacons, marble slabs, or human models unless the subject explicitly calls for them.
      - HARDWARE-FREE LIGHTING DESCRIPTIONS: Describe only the light quality on the subject (e.g., "soft diffused lighting", "warm directional sunlight", "even studio illumination"). NEVER mention photography equipment nouns (never write "softbox", "light stand", "c-stand", "tripod", "umbrella", "reflector", or "studio equipment"), because AI image generators literally draw those objects into the scene!
      - CLEAN COMMERCIAL FRAMING: Frame only the intended subject and environment cleanly with crisp focus and natural textures.
      `;
    }

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
    const recentPrompts = sessionHistory.slice(0, 25).map(h => h.text.substring(0, 55));
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
      culturalContext: !isHumanSubject || isHumanPreservation ? null : getFieldVal('characterBackground', options.characterBackground),
      environment: isIsolatedPngMode ? 'Pure flat solid color (White or contrasting, NO environment details)' : getFieldVal('environment', options.environment),
      lighting: getFieldVal('lighting', options.lighting),
      // Ignore subject-specific framing/position if Background Mode is active
      framing: isBackgroundMode ? null : (isIsolatedPngMode ? 'Full Object in Frame (Centered, Uncropped)' : getFieldVal('framing', options.framing)),
      angle: getFieldVal('cameraAngle', options.cameraAngle),
      position: isBackgroundMode ? null : (isIsolatedPngMode ? 'Perfectly Centered' : getFieldVal('subjectPosition', options.subjectPosition)),
      shadows: isBackgroundMode ? null : (isIsolatedPngMode ? 'No Shadow / Flat (No cast shadows on ground)' : getFieldVal('shadowStyle', options.shadowStyle)),
      style: getFieldVal('visualType', options.visualType),
      material: getFieldVal('materialStyle', options.materialStyle),
      concept: getFieldVal('conceptFocus', options.conceptFocus || 'Default / Auto'),
      authenticity: !isHumanSubject ? null : getFieldVal('authenticity', options.authenticity || 'Default / Auto'),
      // Ignore interaction if Background Mode, Isolated PNG Mode, or Non-Human Subject is active
      interaction: (!isHumanSubject || isBackgroundMode || isIsolatedPngMode) ? null : getFieldVal('interaction', options.interaction || 'Default / Auto'),
      target: getFieldVal('targetMarket', options.targetMarket || 'Default / Auto'),
      season: options.useCalendar ? `${options.calendarMonth} (${options.calendarEvent})` : null,
      smartRefinement: options.activeFields?.smartRefinement ? (isProductPreservation ? stripColorDescriptors(options.smartRefinementText) : options.smartRefinementText) : null,
      ageRange: (!isHumanSubject || isHumanPreservation) ? null : getFieldVal('ageRange', options.ageRange || 'Default / Auto'),
      colorMood: isProductPreservation ? null : getFieldVal('colorMood', options.colorMood || 'Default / Auto'),
      preservationMode: isProductPreservation 
        ? 'PRODUCT PRESERVATION ENABLED (Prompt #1 = 100% Exact Reference Clone; Prompts #2+ = 100% Locked Reference Product Packaging & Label + Commercial Shoot Variations)' 
        : isHumanPreservation 
        ? 'HUMAN IDENTITY PRESERVATION ENABLED (Prompt #1 = 100% Exact Reference Clone; Prompts #2+ = 100% Locked Reference Person Facial Identity & Hair + Commercial Pose/Scene Variations)' 
        : null
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
        imageMedium: 'Image Medium',
        materialStyle: 'Material Finish',
        qualityCamera: 'Quality & Camera',
        ageRange: 'Age',
        interaction: 'Interaction',
        authenticity: 'Authenticity',
        targetMarket: 'Target Market',
        conceptFocus: 'Concept Focus'
      };

      const lockedPools = (options as any).lockedPools || {};

      for (const [key, isLocked] of Object.entries(options.lockedFields || {})) {
        if (!isLocked || !map[key]) continue;
        // CRITICAL: If a locked section is turned OFF (activeFields[key] === false), skip it!
        if (options.activeFields && options.activeFields[key] === false) continue;
        // Also skip human-only locks if the current subject is non-human
        if (!isHumanSubject && ['characterBackground', 'ageRange', 'interaction', 'authenticity'].includes(key)) continue;
        if (isBackgroundMode && ['framing', 'subjectPosition', 'shadowStyle', 'interaction'].includes(key)) continue;
        if (isIsolatedPngMode && ['environment', 'shadowStyle', 'interaction'].includes(key)) continue;
        if ((is3D || isArt) && key === 'qualityCamera') continue;
        if (isProductPreservation && key === 'colorMood') continue;
        if (isHumanPreservation && ['characterBackground', 'ageRange'].includes(key)) continue;

        const rawPool: string[] = lockedPools[key] || [];
        const pool = rawPool.filter(v => v && v !== 'Default / Auto');
        if (pool.length > 1) {
          lockedRules.push(`${map[key]} has MULTI-LOCK ACTIVE with ${pool.length} EQUALLY ACTIVE options: [ ${pool.join(', ')} ]. You MUST distribute and rotate evenly across ALL ${pool.length} selected options across the prompts in this batch (do NOT fixate on only 1 option), and NEVER use any option outside this pool.`);
        } else {
          const singleVal = pool[0] || (options as any)[key];
          if (singleVal && singleVal !== 'Default / Auto') {
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

    // Determine if Smart Refinement is a broad 1-3 word category seed (e.g. "healthcare", "food", "business") vs a specific visual scene/reference
    const broadCategorySeeds = [
      'healthcare', 'medical', 'food', 'restaurant', 'business', 'corporate',
      'technology', 'tech', 'travel', 'tourism', 'fitness', 'wellness',
      'education', 'real estate', 'icon set', 'icons', 'lifestyle', 'finance',
      'cybersecurity', 'e-commerce', 'social media'
    ];
    const srTrimmed = (inputs.smartRefinement || '').trim().toLowerCase();
    const isBroadCategorySeed = !options.isFromImageReference &&
      !isPreservationActive &&
      srTrimmed.length > 0 &&
      srTrimmed.split(/\s+/).length <= 3 &&
      broadCategorySeeds.some(cat => srTrimmed === cat || srTrimmed === `${cat} photography` || srTrimmed === `${cat} icons`);

    // Master Anchor Mode applies to Option 1 whenever Preservation Mode is active, or an Image Reference / specific Text Reference is provided (and this is the first chunk)
    const isMasterAnchorMode = !isSubBatchContinuation && (isPreservationActive || !!options.isFromImageReference || (!!inputs.smartRefinement && !isBroadCategorySeed));

    console.log("Final smartRefinement being used:", inputs.smartRefinement, "isMasterAnchorMode:", isMasterAnchorMode);

    const subBatchAngleMandates = [
      '',
      '\n    [PARALLEL SUB-BATCH #2 DIVERSITY FOCUS]: Focus distinctly on elevated 45-degree perspectives, dynamic candid angles, and alternate clean background tones so none of these prompts overlap with batch #1.',
      '\n    [PARALLEL SUB-BATCH #3 DIVERSITY FOCUS]: Focus distinctly on wide copy-space editorial framing, side-lit natural glow, and macro/close detail angles so every prompt is fresh and unique.',
      '\n    [PARALLEL SUB-BATCH #4 DIVERSITY FOCUS]: Focus distinctly on minimal geometric negative-space layouts, crisp natural daylight variations, and distinct surface/setting compositions.'
    ];
    const subBatchFocusDirective = subBatchAngleMandates[subBatchIndex % subBatchAngleMandates.length] || '';

    const activeCategoryBlock = isProductPreservation
      ? `* CATEGORY P — PRODUCT PRESERVATION COMMERCIAL SHOOT VARIATIONS (ACTIVE FOR PROMPTS #2 TO #${options.quantity}):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 TO #${options.quantity}):
          1. 100% identical referenced hero product packaging, container shape, label typography, logo, and original brand colors.
          2. Zero-occlusion rule: Nothing (no fingers, props, or shadows) may ever block or cover the front brand label/logo.
          3. If the reference has NO person/hand, keep Prompts #2–#${options.quantity} strictly product-only (NEVER invent humans or hands).
        - SAFE COMMERCIAL VARIATIONS TO CYCLE ACROSS PROMPTS #2 TO #${options.quantity}:
          * If Standalone Product: Cycle marble slab, warm travertine stone podium, natural light oak flat-lay, shallow water ripples, minimalist matte pedestals, dark slate, and brand-harmonized seamless backgrounds.
          * If Model or Hand Holding Product: Keep the zero-occlusion grip and cycle close-up cheek/collarbone showcase, open palm/fingertips crop, waist-up vanity lifestyle shot, and varied brand-toned styling.`
      : isHumanPreservation
      ? `* CATEGORY H — HUMAN IDENTITY PRESERVATION PORTFOLIO VARIATIONS (ACTIVE FOR PROMPTS #2 TO #${options.quantity}):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 TO #${options.quantity}):
          1. 100% identical facial identity, bone structure, eye shape, nose/lip contour, natural skin tone, and hairstyle ("the exact same person shown in the reference image").
          2. Zero biometric text conflicts (never write hair color, haircut, skin tone, or eye color words that fight the reference photo).
          3. Authentic epidermal skin micro-pores and natural 5-finger hand anatomy.
        - SAFE COMMERCIAL VARIATIONS TO CYCLE: Mid waist-up shot with copy space, close-up eye-level editorial portrait, 3/4 environmental lifestyle activity, candid over-the-shoulder angle, varied coordinated wardrobe and lighting.`
      : isIsolatedPngMode
      ? `* CATEGORY A — ISOLATED PNG / CUTOUT ASSETS (ACTIVE FOR ALL PROMPTS):
        - STRICTLY LOCKED: Pure 100% flat white/solid background with ZERO table texture, ZERO horizon line, ZERO cast ground shadows, and 100% full uncropped margins on all sides.
        - SAFE STOCK VARIATIONS: Rotate balanced triangular clusters, circular wreaths with center copy space, diagonal cascades, symmetrical knolling grids, glistening water droplets, or subtle ornamental finish/lighting highlights (always shadowless on pure white).`
      : isBackgroundMode
      ? `* CATEGORY B — COPY-SPACE BACKDROPS & FOREGROUNDS (ACTIVE FOR ALL PROMPTS):
        - STRICTLY LOCKED: Continuous edge-to-edge foreground (never a small isolated mound), 50%–65% clean open copy space, zero "studio backdrop/paper roll/metal stand" terms, keep front horizon perspective.
        - SAFE STOCK VARIATIONS: Rotate seamless sky/background gradients (peach-to-cream, sage-to-ivory, golden morning amber, pastel lavender, sky-blue), varied floral/botanical accents, and gentle terrain contours.`
      : !isHumanSubject
      ? `* CATEGORY C — PLATED FOOD & COMMERCIAL STILL-LIFE (ACTIVE FOR ALL PROMPTS):
        - STRICTLY LOCKED: Exact core dish or product, appetizing clarity, uncluttered background. NEVER invent humans or hands if none exist in Smart Refinement.
        - SAFE STOCK VARIATIONS: Cycle 90-degree flat-lay, 45-degree dining angle, eye-level close-up, and rule-of-thirds copy space; vary natural oak wood, white marble, travertine stone, dark slate, and linen surfaces.`
      : `* CATEGORY D — HUMAN, LIFESTYLE & CORPORATE STOCK (ACTIVE FOR ALL PROMPTS):
        - STRICTLY LOCKED: Authentic epidermal skin micro-texture, natural 5-finger anatomy, specified gender, body build, age range, or cultural locks.
        - SAFE STOCK VARIATIONS: Cycle medium waist-up, close-up portrait, wide environmental copy-space framing, and over-the-shoulder action angles with varied natural poses, wardrobe tones, and lighting.`;

    const isFlatLineIcon = options.visualType === 'Flat Line Icon';

    const isolatedPngRuleBlock = isIsolatedPngMode ? `
    [ISOLATED PNG MODE RULE]:
    When subject = 'Isolated Object (PNG Ready)': Centered uncropped object with clear padding on pure flat shadowless background, ZERO horizon line, ZERO cast ground shadows, razor-sharp cutout silhouette. Never generate checkerboard PNG grids.` : '';

    const environmental3DRuleBlock = isEnvironmental3D ? `
    [ENVIRONMENTAL 3D RULE]:
    When visualType = 'Abstract Environmental 3D': Edge-to-edge full-frame architectural/ribbed/fluted glass texture receding in perspective depth, ambient self-illumination/neon gradients, razor-sharp edge-to-edge focus (ZERO bokeh/blur), 50-70 words.` : '';

    const flatLineIconRuleBlock = isFlatLineIcon ? `
    [FLAT LINE ICON RULE]:
    Bold black outline strokes (3-4px), flat solid pastel/teal/mint fill (no gradient), white/transparent background, centered rounded icon, 2D flat with zero 3D/shadows. Format: "single [chosen concept] flat line icon, bold black outline, light [color] fill, no gradient, transparent background".` : '';

    const categoryPoolsBlock = isBroadCategorySeed ? `
    [CATEGORY AUTO-EXPAND RULE]:
    Treat broad Smart Refinement seeds as a category and auto-select a unique specific concept for each prompt (never repeat twice in a batch) across healthcare, food, business, tech, travel, fitness, education, real estate, or icons while keeping key diversity/setting/mood words consistent.` : `
    [SPECIFIC SCENE LOCK]: Since a specific scene/reference is provided, keep the core subject 100% faithful across all ${options.quantity} prompts.`;

    const systemPrompt = `
    ROLE: COMMERCIAL MICROSTOCK PROMPT ARCHITECT (ADOBE STOCK, FREEPIK, SHUTTERSTOCK STANDARD).
    TASK: Generate ${options.quantity} structured commercial stock prompts based strictly on configuration.${subBatchFocusDirective}

    INPUT CONFIGURATION:
    ${JSON.stringify(inputs)}
    ${lockedFieldsRule}
    ${isMasterAnchorMode ? `
    [RULE 1 — PROMPT #1 MUST BE A 100% EXACT SAME-TO-SAME MASTER CLONE OF REFERENCE]:
    - Option 1 MUST faithfully clone the exact Smart Refinement reference and Input Configuration: exact camera angle, pose/arrangement, lighting, colors, and surface/background with pristine stock clarity (${isProductPreservation ? '100% locked product packaging, typography & original colors — refer to "the referenced hero product" without guessing pump/dropper mechanics' : isHumanPreservation ? '100% locked facial identity, bone structure, skin tone & hair — avoid biometric text overrides' : 'zero text, watermarks, or studio hardware'}).` : ''}
    [RULE 2 — PROMPTS #${isMasterAnchorMode ? '2' : '1'} TO #${options.quantity}: COMMERCIAL STOCK VARIATIONS]:
    - Keep every prompt 100% commercially usable and visually distinct from others in the batch:
    ${activeCategoryBlock}

    RENDERING & LIGHTING RULES:
    ${renderingInstructions}
    ${lightingDiscipline}
    ${opticsEngine}
    ${backgroundModeEngine}
    ${productPreservationEngine}
    ${categoryPoolsBlock}
    1. [IDENTITY]: Subject + Cultural Context (only if human; South Asian = authentic Indian/South Asian features unless specific nationality noted) + Age + Gender/Body Build preservation + Faceless crop discipline when head out of frame.
    ${isolatedPngRuleBlock}
    ${environmental3DRuleBlock}
    ${flatLineIconRuleBlock}
    2. [CONCEPT LAYER]: Smart Refinement.
       - CRITICAL RULE: If Smart Refinement is provided, it is the core conceptual foundation. ${isMasterAnchorMode ? `Option 1 MUST faithfully recreate the exact subject, arrangement, details, and scene described in Smart Refinement. For Option 2 onwards, present this EXACT SAME SUBJECT using the Category-Safe Commercial Stock Variations defined above without inventing unrelated objects or humans.` : `Present the core subject cleanly and naturally in each prompt using the Category-Safe Commercial Stock Variations.`}
       - NO META-MARKETING BUZZWORDS: NEVER write robotic meta-phrases like "This emotional concept for a modern brand", "captured in a posed commercial style", "for retail and e-commerce", or "clinical sterile color palette". Translate any mood or style purely into natural visual descriptions.
    3. [ENVIRONMENT LAYER]: Environment + Seasonality (if enabled).
       - Rule: Replace vague wording with specific, clean spatial descriptions.
    3.5 [COLOR LAYER]:
       ${isProductPreservation ? `
       - [BRAND COLOR PALETTE HARMONIZATION DIRECTIVE]: Since Product Preservation Mode is ACTIVE, prompt MUST explicitly instruct the generator to sample and extract the brand color palette directly from the attached reference images (product packaging, logo, and brand color palette/swatches). The prompt must strategically distribute and harmonize these brand colors across the scene backdrop, stage props, model wardrobe/styling, and ambient lighting accents. The hero product's original physical colors, packaging materials, and labels must remain authentic and untouched, receiving only realistic environmental lighting adjustment to blend seamlessly into the scene without color clashing or muddiness.` : `If colorMood is active, weave the color tone naturally into the lighting or scene description without overriding the natural colors of the subject or tinting a pure white background:
       - 'Warm & Golden' → warm golden tones
       - 'Cool & Clinical' → crisp cool daylight tones
       - 'Soft Pastel' → soft muted pastel tones
       - 'Neutral & Earthy' → natural earthy neutral tones
       - 'Vibrant & Bold' → vibrant rich colors
       - 'Moody & Dark' → deep dramatic low-key tones
       - 'Monochromatic' → harmonious single-hue tonal palette`}
    4. [RENDERING LAYER]: Image Medium language + Visual Style + Material Finish.
       ${isProductPreservation ? `
       - [PRODUCT PRESERVATION & ULTRA-REALISTIC RENDERING DIRECTIVE]:
         * If human model / beauty / haircare campaign: Explicitly describe authentic epidermal skin micro-texture, visible micro-pores, natural fine creases around eyelids and smile lines, dewy hydration sheen with natural specular highlights on cheekbones, and delicate, natural specular catchlights in the pupils. NEVER describe skin as plastic, airbrushed, or overly smoothed. Individual glossy hair strands with natural texture and dynamic volume. Wardrobe and accessories harmonized with the extracted brand palette. Delicate zero-occlusion fingertip grip supporting the product without covering the front logo.
         * If hand holding product / luxury bottle interaction: Explicitly describe delicate manicured hand anatomy, natural knuckle skin creases, clean polished fingernails, authentic skin translucency, zero-occlusion grip supporting the bottle, heavy crystal glass flacon base, liquid refraction, and luminous caustics.
         * If Product / Object Only or Still-life (NO human model): Explicitly describe pristine commercial still-life photography, 100% packaging and typography fidelity, tactile material finish, crystal-clear glass refraction, micro condensation droplets or dew mist on packaging, authentic ground reflections, and grounded contact shadows on podium/water/stone surfaces.
` : isHumanPreservation ? `
       - [HUMAN IDENTITY LOCK & POSE TRANSFER PRESERVATION DIRECTIVE]:
         * Explicitly describe authentic epidermal skin micro-texture, visible micro-pores, natural fine creases around eyelids and smile lines, healthy natural skin glow with specular highlights on cheekbones, and delicate specular catchlights in the pupils.
         * Faithfully preserve the exact same facial landmarks, eye shape, nose structure, lip profile, skin undertone, and hairstyle shown in the reference image with ZERO identity drift.
         * The prompt describes pose, wardrobe, expression, and environment cleanly, while commanding the AI generator to lock 100% of the face, hair, and identity to the reference image without conflicting biometric text.
` : `
       - [CLEAN MEDIUM-APPROPRIATE RENDERING]:
         * Match materials and surface textures naturally to the subject (e.g., realistic wood grain, crisp culinary texture, smooth 3D surfaces, or authentic human skin texture when a person is present).`}
    5. [OPTICS LAYER]: Framing + Elevation + Placement + Atmosphere + Shadows.
       - Rule: Atmosphere = lighting description (do not stack multiple types).
       - Rule: Shadows = realistic behavior matching the background.
       ${isProductPreservation ? `
       - [EDITORIAL STUDIO OPTICS FOR PRESERVATION (HARDWARE-FREE)]:
         * If human model / beauty shot: 85mm portrait lens perspective, tack-sharp focus on the product label and model's eyes/facial features, broad diffused directional key illumination with soft wraparound fill and seamless brand-harmonized backdrop falloff.
         * If hand holding product / luxury bottle: 90mm macro prime lens perspective, tack-sharp focus on the bottle label and glass flacon, soft directional studio illumination.
         * If Product / Object Only or Still-life (NO human model): Edge-to-edge tack-sharp focus on packaging and label typography, sculpted linear specular highlight reflections defining the container contours, grounded contact shadows at the base.
` : isHumanPreservation ? `
       - [EDITORIAL PORTRAIT OPTICS FOR HUMAN IDENTITY PRESERVATION (HARDWARE-FREE)]:
         * 85mm portrait lens perspective, tack-sharp focus on the subject's eyes, facial features, and hair texture, broad diffused directional key illumination with soft wraparound fill.
` : `
       - [NATURAL OPTICS & FOCUS DISCIPLINE]:
         * For Isolated Objects (PNG Ready), 3D Renders, Flat-Lays, Stages, and Cutouts: Enforce edge-to-edge tack-sharp focus across the entire subject with clean, even illumination and ZERO bokeh or lens blur. Do NOT inject "85mm-100mm macro prime lens" or "creamy depth-of-field bokeh" on isolated objects, 3D renders, or full-frame subjects!
         * For Photography Portraits or Close-up Still Life: Use natural lens perspective with tack-sharp focus on the main subject and gentle, natural background separation.`}
    6. [COMMERCIAL INTENT]: End cleanly with a concise positive quality phrase (e.g., "Razor-sharp focus, crisp details, ultra-high resolution." or for preservation modes: "${isHumanPreservation ? 'Preserve exact reference human facial identity, facial structure, natural skin tone, and hairstyle identically.' : isProductPreservation ? 'Preserve exact reference product packaging, label typography, and authentic product colors identically.' : 'Razor-sharp focus, crisp details, ultra-high resolution.'}").

    PROMPT HYGIENE RULES (CRITICAL — READ CAREFULLY):
    - STRICT BAN ON NEGATIVE KEYWORD LISTS: NEVER append negative prompt lists, "no X, no Y" lists, or banned noun lists to the prompt! Modern AI image generators (Seedream 4.5, Google Nano Banana, Flux, DALL-E 3) interpret every noun in the prompt as a positive instruction to draw that object.
    - BANNED PHOTOGRAPHY HARDWARE & ARTIFACT NOUNS: NEVER write any of these words anywhere in the prompt (not even preceded by "no" or "without"): "studio equipment", "light stands", "softboxes", "softbox", "lighting fixtures", "backdrop lights", "c-stands", "tripods", "umbrellas", "reflectors", "cables", "wires", "clamps", "behind the scenes", "production hardware", "studio clutter", "checkerboard background", "transparency grid", "pristine seamless cyclorama". Writing these words causes AI image generators to draw tripods, softboxes, and PNG checkerboards inside the image!
    - Describe ONLY what SHOULD be visible in the final image using positive, concrete visual language.
    - Remove redundant adjectives and avoid repeating sharpness phrases twice in the same prompt.
    - RENDER ENGINE RULE: Never mention specific 3D render engine names (Octane Render, Unreal Engine 5, V-Ray, Blender, Cinema 4D). Use generic terms only: '3D render', '3D CGI'.
    - LENGTH: Photography medium: 55-85 words. 3D & CGI, Isolated Objects, or Art & Illustration medium: 35-55 words maximum. Concise, focused positive prompts produce dramatically cleaner results in AI image generators.
    - CONFLICT HANDLING: Prioritize Image Medium logic. Reset incompatible vocabulary.

    ${divergenceInstruction}

    Generate JSON with "prompts" array containing "text".
    `;

    let rawText = "";

    if (provider === 'gemini') {
      let directSuccess = false;
      let lastDirectErr: any = null;

      // Fast-path: When user has their own API key, call Google directly first with thinkingBudget: 0 (avoids serverless cold start & 5-15s thinking delay)
      if (finalKey) {
        const isVertexKey = finalKey.startsWith('AQ.');
        const normalizedModel = options.model === 'gemini-3.8-flash' ? 'gemini-2.5-flash' : options.model;
        const candidateModels = Array.from(
          new Set([normalizedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'].filter(Boolean))
        );
        const standardEndpoint = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(finalKey)}`;
        const vertexEndpoint = (m: string) => `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(finalKey)}`;
        const endpoints = isVertexKey ? [vertexEndpoint, standardEndpoint] : [standardEndpoint, vertexEndpoint];

        for (const buildUrl of endpoints) {
          for (const m of candidateModels) {
            try {
              const generationConfig: Record<string, any> = {
                responseMimeType: 'application/json',
                temperature: 0.95,
                topP: 0.95
              };
              if (m.includes('2.5-flash') || m === 'gemini-flash-latest') {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }
              const directRes = await fetch(
                buildUrl(m),
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
                    generationConfig
                  })
                }
              );
              if (directRes.ok) {
                const directData = await directRes.json();
                rawText = directData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{"prompts":[]}';
                if (rawText && rawText !== '{"prompts":[]}') {
                  directSuccess = true;
                  break;
                }
              } else {
                const errText = await directRes.text();
                let parsedMsg = errText;
                try { parsedMsg = JSON.parse(errText).error?.message || errText; } catch (e) {}
                lastDirectErr = new Error(parsedMsg || `Gemini generation failed (${directRes.status})`);
                const errLower = parsedMsg.toLowerCase();
                if (errLower.includes('api key not valid') || errLower.includes('api_key_invalid')) break;
                if (directRes.status === 404 || directRes.status === 400 || directRes.status === 401 || directRes.status === 403 || directRes.status === 503) continue;
                break;
              }
            } catch (networkErr: any) {
              lastDirectErr = networkErr;
              break;
            }
          }
          if (directSuccess) break;
        }
      }

      if (!directSuccess) {
        let serverSucceeded = false;
        let serverErrMsg = '';
        try {
          const response = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: options.model,
              systemPrompt,
              apiKey: finalKey
            })
          });
          if (response.ok) {
            const data = await response.json();
            rawText = data.text?.trim() || '{"prompts":[]}';
            if (rawText && rawText !== '{"prompts":[]}') {
              serverSucceeded = true;
            }
          } else {
            const errData = await response.json().catch(() => ({}));
            serverErrMsg = errData.error || `Gemini generation failed (${response.status})`;
          }
        } catch (e: any) {
          serverErrMsg = e?.message || 'Gemini generation route unreachable';
        }

        if (!serverSucceeded) {
          throw lastDirectErr || new Error(serverErrMsg || 'No Gemini API key found. Please add your Gemini API key in Config.');
        }
      }
    } else if (provider === 'groq') {
      // Groq with automatic fallback for deprecated models (e.g. mixtral-8x7b-32768)
      const requestedGroq = options.model === 'mixtral-8x7b-32768' ? 'llama-3.3-70b-versatile' : options.model;
      const groqCandidates = Array.from(new Set([requestedGroq, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'].filter(Boolean)));
      let groqSuccess = false;
      let lastGroqErr: any = null;
      for (const m of groqCandidates) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.9,
            top_p: 0.95,
            response_format: { type: 'json_object' }
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || '{"prompts":[]}';
          groqSuccess = true;
          break;
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {}
          lastGroqErr = new Error(`Groq API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 503) continue;
          throw lastGroqErr;
        }
      }
      if (!groqSuccess && lastGroqErr) throw lastGroqErr;
    } else if (provider === 'mistral') {
      // Mistral with fast JSON mode and fallback
      const mistralCandidates = Array.from(new Set([options.model, 'mistral-small-latest', 'mistral-large-latest'].filter(Boolean)));
      let mistralSuccess = false;
      let lastMistralErr: any = null;
      for (const m of mistralCandidates) {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.9,
            top_p: 0.95,
            response_format: { type: 'json_object' }
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || '{"prompts":[]}';
          mistralSuccess = true;
          break;
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || parsed.message || errText; } catch(e) {}
          lastMistralErr = new Error(`Mistral API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 503) continue;
          throw lastMistralErr;
        }
      }
      if (!mistralSuccess && lastMistralErr) throw lastMistralErr;
    } else if (provider === 'openrouter') {
      // OpenRouter with automatic fallback across free/fast models
      const requestedOR = options.model === 'google/gemma-4-31b-it:free' ? 'google/gemma-3-27b-it:free' : options.model;
      const orCandidates = Array.from(
        new Set([requestedOR, 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'openrouter/free'].filter(Boolean))
      );
      let orSuccess = false;
      let lastOrErr: any = null;
      for (const m of orCandidates) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.9,
            top_p: 0.95
          })
        });
        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content || '{"prompts":[]}';
          if (rawText && rawText !== '{"prompts":[]}') {
            orSuccess = true;
            break;
          }
        } else {
          let errText = await response.text();
          try { const parsed = JSON.parse(errText); errText = parsed.error?.message || errText; } catch(e) {}
          lastOrErr = new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
          if (response.status === 404 || response.status === 400 || response.status === 429 || response.status === 503) continue;
          throw lastOrErr;
        }
      }
      if (!orSuccess && lastOrErr) throw lastOrErr;
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

    return result.prompts.map((p: any) => {
      let rawPText = (p.text || '').trim();
      rawPText = rawPText.replace(/^["']|["']$/g, '');

      const cleanedText = sanitizeGeneratedPrompt(rawPText);

      return {
        text: cleanedText
      };
    });
  } catch (error: any) {
    console.warn("Generation Error:", error);
    const formatted = formatApiErrorMessage(error, provider);
    throw new Error(formatted);
  }
};
