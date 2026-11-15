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

  // 5. Model not found
  if (lower.includes('not found') || lower.includes('404')) {
    return `Model Not Found: The selected model is not available for this key. Try switching the model in settings.`;
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
      const response = await fetch('/api/gemini/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Gemini API test failed (${response.status})`);
      }
      return true;
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
  
  // 1. Container & dispenser mechanics to generic product reference (prevent hallucinating packaging types)
  // e.g. "a cosmetic pump bottle" -> "the product", "a pump bottle" -> "the product", "a cosmetic bottle" -> "the product"
  sanitized = sanitized.replace(/\b(a|an|the)\s+(cosmetic|skincare|serum|lotion|shampoo|perfume|beverage|soda|energy drink)?\s*(pump\s+bottle|dropper\s+bottle|spray\s+bottle|squeeze\s+tube|dispenser\s+bottle)\b/gi, 'the product');
  sanitized = sanitized.replace(/\b(a|an|the)\s+(cosmetic|skincare|serum|lotion|shampoo|perfume|beverage|soda)\s+(bottle|can|jar|tube|container)\b/gi, 'the product');
  sanitized = sanitized.replace(/\b(holding|gripping|carrying|presenting|showcasing|displaying)\s+(a|an)\s+(bottle|can|jar|tube|box|pouch|container)\b/gi, '$1 the product');
  sanitized = sanitized.replace(/\b(cosmetic|skincare|serum|lotion|shampoo|perfume)?\s*(pump\s+bottle|dropper\s+bottle|spray\s+bottle|squeeze\s+tube|dispenser\s+bottle)\b/gi, 'product');
  sanitized = sanitized.replace(/\b(with\s+(a\s+)?pump(\s+dispenser)?|with\s+(a\s+)?dropper|with\s+(a\s+)?spray\s+nozzle)\b/gi, '');

  // 2. Specific phrases: background / backdrop / wall / surface
  sanitized = sanitized.replace(/\b(on a|against a|in a)\s+(white|black|dark|light|blue|red|green|yellow|gray|grey|pink|purple|orange|cream|beige|brown)\s+(background|backdrop|wall|surface|floor|setting)\b/gi, '$1 studio backdrop');
  sanitized = sanitized.replace(/\b(white|black|dark|light|blue|red|green|yellow|gray|grey|pink|purple|orange|cream|beige|brown)\s+(studio\s+backdrop|backdrop|background|surface)\b/gi, '$2');
  
  // 3. Specific phrases: attire / clothes
  sanitized = sanitized.replace(/\b(wearing a|in a)\s+(white|black|dark|light|blue|red|green|yellow|gray|grey|pink|purple|orange|cream|beige|brown)\s+(shirt|t-shirt|top|suit|dress|outfit|hoodie|jacket|clothing|blazer)\b/gi, '$1 studio attire');

  // 4. Adjective colors right before nouns (e.g. "red can", "blue bottle", "white box", "yellow packaging")
  const colorAdjPattern = /\b(red|blue|green|yellow|orange|purple|pink|violet|crimson|scarlet|cyan|magenta|turquoise|teal|beige|brown|maroon|navy|gold|silver|golden|white|black|grey|gray)\b\s+(bottle|can|box|jar|packaging|container|product|tube|dropper|flacon|pouch|label|cap|lid|liquid|soda|drink|serum|cream|cosmetic|perfume|podium|pedestal|table|riser|backdrop|background|shirt|t-shirt|top|dress|clothing|attire|suit|fabric|blazer|hoodie|jacket|pants|trousers)/gi;
  sanitized = sanitized.replace(colorAdjPattern, '$2');

  return sanitized.replace(/\s{2,}/g, ' ').replace(/\s+([,.\?!])/g, '$1').trim();
}

export function stripBiometricDescriptors(text: string): string {
  if (!text) return text;
  let sanitized = text;

  // 1. Specific hairstyle, hair cut, length, and hair color phrases
  // e.g. "with short dark hair", "with short tapered fade haircut", "with long wavy brown hair", "short dark hair", "curly black hair", "with a buzzcut", "with glossy hair"
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(short|long|medium|shoulder-length|curly|wavy|straight|slicked-back|tapered|buzzcut|fade|messy|glossy|sleek)?\s*(dark|black|brown|blonde|blond|brunette|red|auburn|grey|gray|silver)?\s*(hair|hairstyle|haircut|curls|waves|locks|ponytail|bun)\b/gi, '');

  // 2. Specific facial hair / beard phrases
  // e.g. "with a thick beard", "with light stubble", "clean-shaven"
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(full\s+|thick\s+|light\s+|heavy\s+|trimmed\s+)?(beard|goatee|mustache|stubble)\b/gi, '');
  sanitized = sanitized.replace(/\bclean-shaven\b/gi, '');

  // 3. Specific skin tone / complexion phrases
  // e.g. "with warm olive skin tone", "with fair skin", "with dark skin tone", "warm olive skin tone"
  sanitized = sanitized.replace(/\b(with|having)?\s*(a\s+)?(warm|cool|neutral)?\s*(fair|pale|tan|tanned|olive|golden|bronze|dark|brown|light|deep)\s*(skin|skin\s+tone|complexion|undertone)\b/gi, '');

  // 4. Specific eye colors
  // e.g. "with blue eyes", "with dark brown eyes"
  sanitized = sanitized.replace(/\b(with|having)?\s*(blue|brown|green|hazel|dark|amber)\s+eyes\b/gi, '');

  // 5. Specific jawline / cheekbone / bone structure descriptors
  // e.g. "with defined square jawline", "defined cheekbones"
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
  cleaned = cleaned.replace(/\b(studio equipment|light stands?|softbox(es)?|octabox(es)?|c-stands?|lighting umbrellas?|reflector panels?|backdrop lights?|production hardware|studio clutter|behind the scenes|checkerboard background|transparency grid|pristine seamless cyclorama)\b[,\s]*/gi, '');
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
- PRODUCT REFERENCE RULE (STRICTLY NO DISPENSER OR PACKAGING CLASSIFICATION):
  You MUST refer to the hero item simply as "the product" or "the referenced product" (e.g. write "A woman holding the product near her face", "applying the product", "the product resting on a clean studio surface", "hand interacting with the product").
  CRITICAL & STRICTLY FORBIDDEN: DO NOT specify packaging mechanics, dispenser types, or structural bottle classifications like "pump bottle", "pump", "dropper bottle", "dropper", "spray bottle", "squeeze tube", "jar", "flacon", "can", "carton", or "twist cap".
  REASON: The user uploads the authentic hero product in reference images. Naming specific container types like "pump" or "dropper" in text biases or distorts AI image generators into hallucinating alternative packaging instead of preserving the exact packaging in the reference. Always refer to it simply as "the product" or "the referenced product"!
- STRICT COLOR-NEUTRAL RULE FOR OBJECTS, ATTIRE, PRODUCTS & BACKGROUND:
  You are STRICTLY FORBIDDEN from mentioning specific color names in 'smartRefinement' (e.g. NEVER write "blue", "red", "yellow", "green", "white shirt", "black pants", "white background", "dark background", "blue can", "green bottle", "pink jar"). Describe items by their generic category, material texture, and geometric form ONLY (e.g. "person wearing casual studio clothing", "commercial studio backdrop"). NEVER lock in color words in smartRefinement! This is critical so image generators can extract the real brand color palette from reference assets without conflicting color text locks.
- BEAUTY, HAIRCARE & COSMETIC CAMPAIGN DIRECTIVE (MODEL WITH PRODUCT):
  If the reference image is a commercial beauty, cosmetics, perfume, or haircare advertising campaign with a human model (e.g., model with glowing skin holding a product, woman touching glossy hair while holding a bottle, or high-fashion model holding a perfume flacon near her face):
  * POSE & INTERACTION ARCHETYPES:
    - Haircare / Skincare Efficacy: If model touches/showcases hair or skin while holding the product, describe this action (e.g., "holding the product while touching her hair strand").
    - Face-Framing Product Placement: Note placement near cheek, eye, forehead, or chin with a zero-occlusion grip.
    - Tabletop Lineup Synergy: If matching brand products are neatly arranged on a table in front of the model, note the foreground product lineup.
    - Expression: Distinguish between spontaneous joyful smile (open smile, teeth visible, real eye crinkle) vs intense haute-couture editorial gaze (sculpted cheekbones, commanding eye contact).
  * In 'settings': map 'visualType' to "Ultra Realistic", 'lighting' to "Soft Studio Lighting" or "Dramatic Studio Lighting", 'framing' to "Portrait" or "Mid shot (waist-up)".
  * In 'smartRefinement': describe the model, expression, hair/skin interaction, and face-framing hand placement holding "the product", wearing studio wardrobe harmonized with the brand palette (e.g., "A smiling woman with glossy hair holding the product near her cheek while touching her hair, against a studio backdrop"). STRICTLY obey container-neutral and color-neutral rules (no color names, no dispenser mechanics)!
- STILL-LIFE & OBJECT-ONLY HERO PRODUCT DIRECTIVE (NO MODEL / PRODUCT STANDALONE):
  If the reference image has NO human model/person and shows ONLY the product (e.g., product resting on a stone podium, marble slab, reflective water surface with ripples, micro condensation droplets, liquid splash, or clean studio cyclorama):
  * In 'settings': map 'subject' to "Product / Object Only" or "Still life / Food & Drink", set ALL human fields ('characterBackground', 'ageRange', 'interaction', 'authenticity') strictly to FALSE. Map 'visualType' to "Hyper Detailed", 'environment' to "Studio Setting" or "Minimalist Pedestal", 'lighting' to "Dramatic Studio Lighting" or "Soft Studio Lighting".
  * In 'smartRefinement': describe ONLY the still-life arrangement, surface material texture (e.g., travertine pedestal, polished wet glass, water ripples with subtle reflection, fine micro-condensation droplets on packaging), and commercial studio lighting. STRICTLY DO NOT mention any human, woman, man, model, skin, hand, or face!
- HAND-HELD LUXURY PRODUCT & BOTTLE INTERACTION DIRECTIVE (FACELESS HAND & BOTTLE):
  If the reference image shows a hand or fingers holding/showcasing a product (e.g. perfume, fragrance flacon, skincare serum, cosmetic bottle, luxury item) with NO face visible:
  * In 'settings': map 'subject' to "Product / Object Only" or "Still life / Food & Drink", set 'interaction' to "Holding" or "Showcasing", and set 'authenticity' to "Ultra Realistic / Candid Commercial". Set 'characterBackground' and 'ageRange' strictly to FALSE (and 'Default / Auto') because faceless hand shots do not require full-body demographic casting. Set 'framing' to "Close-up / Cropped Action (Faceless)" or "Macro", and 'lighting' to "Soft Studio Lighting" or "Dramatic Studio Lighting".
  * In 'smartRefinement': describe a delicate manicured hand holding the product with elegant fingertips against an aesthetic studio backdrop (STRICTLY obey container-neutral and color-neutral rules, no color names, simply "the product", zero-occlusion grip).` : isHumanPreservation ? `STRICT HUMAN IDENTITY & POSE TRANSFER PRESERVATION DIRECTIVE (HUMAN PRESERVATION ACTIVE - IDENTITY LOCK + FACE-NEUTRAL POSE & STYLE TRANSFER):
- PURPOSE & WORKFLOW: The user is utilizing reference photos for human generation where the visual reference image supplies 100% of the authentic facial identity, facial structure, skin tone, and hair. The Smart Refinement text description MUST supply the pose, posture, body action, attire/wardrobe, expression, and environment cleanly WITHOUT conflicting with the reference face!
- In 'smartRefinement':
  * Describe the subject's GENDER ("man", "woman", "person"), POSE & BODY POSTURE (e.g., "leaning against a neutral wall", "arms crossed comfortably", "seated at a wooden desk"), WARDROBE & STYLING (e.g., "wearing an olive-green button-up shirt and watch", "in a tailored charcoal blazer"), and NATURAL GAZE/EXPRESSION (e.g., "looking forward with a relaxed smile", "confident candid expression").
  * STRICT BIOMETRIC-NEUTRAL & ZERO-FACIAL-LOCK RULE (CRITICAL FOR IDENTITY RETENTION & CLEAN POSE TRANSFER):
    1. STRICTLY DO NOT describe specific haircut, hairstyle, hair length, or hair color (e.g., NEVER write "short dark hair", "tapered fade haircut", "long wavy blonde hair", "buzzcut").
    2. STRICTLY DO NOT describe specific skin tone, skin undertone, or ethnic complexion (e.g., NEVER write "warm olive skin", "fair pale skin", "deep bronze skin").
    3. STRICTLY DO NOT describe permanent facial bone landmarks or facial hair (e.g., NEVER write "defined square jawline", "chiseled cheekbones", "thick beard", "blue eyes").
    REASON: Specific biometric words in text directly conflict with reference photos (such as user selfies or target models), causing AI generators to create warped hybrid faces or ignore the reference photo entirely. The reference photo controls 100% of the face, hair, and identity, while the text controls 100% of the pose, clothing, and scene!
  * Example of correct SR text: "A man leaning against a neutral wall, wearing an olive-green button-up shirt and watch, looking forward with a relaxed smile."
- In 'settings':
  * Map 'subject' to "Solo person (Adult)" or best matching human category.
  * Set 'interaction' to the visible body language or pose.
- In 'activeFields':
  * Ensure 'subject' and 'interaction' are set to TRUE.` : `FLEXIBLE COLOR & CONTAINER RULE:
Describe the subject, attire, container, or setting naturally as seen in the reference (e.g. "person wearing a blue shirt", "smiling woman in a magenta top holding a cosmetic bottle while touching her sleek hair", "woman in red lace holding a ruby perfume flacon near her face", "amber glass bottle on travertine slab"). You may include natural visual colors and container descriptions as observed in the image.
- BEAUTY & HAIRCARE CAMPAIGN DIRECTIVE (PRESERVATION OFF):
  If the image is a beauty/haircare campaign: describe model's expression (radiant smile or haute-couture gaze), wardrobe color keyed to product (e.g. "in magenta knit top", "in olive halter top with gold cuffs", "in red lace dress"), the product held near face/hair, and any tabletop product lineup present.
- HAND-HELD LUXURY PRODUCT & BOTTLE INTERACTION (FACELESS HAND & BOTTLE):
  If the image shows a hand holding a perfume or cosmetic bottle: map 'subject' to "Product / Object Only" or "Still life / Food & Drink", set 'interaction' to "Holding" or "Showcasing", set 'characterBackground' and 'ageRange' to FALSE (faceless crop), and describe the elegant hand holding the bottle with natural colors and luxury finishes.`}
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
  
  2. "smartRefinement": A concise core description of the main subject and their specific action/appearance based on the input. Maximum 25 words. If a person/human is described, observe and explicitly state their GENDER (e.g., "man", "woman", "boy", "girl", "baby"). If the gender is completely unspecified or neutral, use "person". DO NOT specify age categories (like "young adult" or "senior") in this field, as age is mapped to the 'settings' object separately. For BODY BUILD, ONLY mention it if they are distinctly outside the average/standard norm (e.g., "plus-size", "heavy-set", "muscular"). If they have an average/slim body, DO NOT mention their body type at all. FACELESS & ACTION CROP RULE: If the concept focuses on hands, gestures, or cropped body parts without showing a face (e.g. holding a product, typing, wrist pain, cleaning surface), describe this framing clearly (e.g. "close-up on hands and torso, faceless composition") and omit eye gaze direction. CONCEPTUAL FLAT-LAY & TABLETOP STILL LIFE RULE: If the concept is a conceptual business/abstract tabletop still life (wooden blocks, tokens, magnifying glasses, puzzle pieces, checklists, or progress bars with minimalist 2D line icons/symbols on a solid pastel or studio background, with or without a cropped hand/fingers interacting), focus on the physical props, minimalist 2D icons, and clean composition with ample copy space. Do NOT invent full-body characters or business suits. CAMERA DIRECTION RULE: If the face is visible and the text mentions looking at the camera, rephrase it to "looking forward" or "making eye contact"; DO NOT use the word "camera". ${isProdPreservation ? `STRICT PRODUCT PRESERVATION DIRECTIVE (PRODUCT PRESERVATION ACTIVE): - PRODUCT REFERENCE RULE: Refer to the item simply as "the product" or "the referenced product" (e.g., "A woman holding the product near her face", "the product on a clean studio surface"). DO NOT write container/dispenser mechanics like "pump bottle", "pump", "dropper", "spray bottle", "jar", or "can". - STRICT COLOR-NEUTRAL RULE: You are STRICTLY FORBIDDEN from mentioning specific color names in 'smartRefinement'. Describe items neutrally without color locks so image generators can extract brand colors from reference images.` : isHumanPreservation ? `STRICT HUMAN IDENTITY & POSE TRANSFER PRESERVATION DIRECTIVE (HUMAN PRESERVATION ACTIVE): Describe the subject's gender, pose, posture, wardrobe, and natural expression. STRICTLY DO NOT write specific hair cut, hair style, hair color, skin tone, or permanent facial landmarks, so that visual reference face photos retain 100% identity without conflicting text overrides.` : `FLEXIBLE COLOR & CONTAINER RULE: Describe the subject, attire, container, or setting naturally based on the input text. You may include colors if specified in the concept.`} AVOID specifying race, ethnicity, or age IN THIS FIELD. Focus on gender, notable body build, core action, and props. No technical camera or lighting terms.
  
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
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, apiKey: finalKey })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Gemini analysis failed (${response.status})`);
      }
      const data = await response.json();
      rawText = data.text || "";
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
  isSubBatchContinuation: boolean = false
): Promise<{text: string}[]> => {
  
  const finalKey = apiKey ? apiKey.trim() : '';

  if (provider !== 'gemini' && !finalKey) {
    throw new Error("No API Key found. Please configure your key in settings.");
  }

  // Automatic chunking for large batch requests (e.g., 30 to 100 prompts in 1 click)
  // Ensures every prompt maintains full length, rich detail, and zero JSON truncation
  const MAX_CHUNK_SIZE = 25;
  if (!isSubBatchContinuation && options.quantity > MAX_CHUNK_SIZE) {
    const totalRequested = options.quantity;
    const accumulatedPrompts: { text: string }[] = [];
    let currentHistory = [...sessionHistory];
    let remaining = totalRequested;
    let isFirstChunk = true;

    while (remaining > 0) {
      const chunkCount = Math.min(remaining, MAX_CHUNK_SIZE);
      const chunkOptions: PromptOptions = {
        ...options,
        quantity: chunkCount,
        // Only the very first chunk in a multi-chunk batch produces the Option #1 Master Clone;
        // subsequent chunks produce Option #2..#N Category-Safe Variations
        isFromImageReference: isFirstChunk ? options.isFromImageReference : false,
      };
      const chunkResult = await generateStockPrompts(
        chunkOptions,
        apiKey,
        currentHistory,
        provider,
        !isFirstChunk
      );
      accumulatedPrompts.push(...chunkResult);
      currentHistory = [
        ...chunkResult.map(p => ({ text: p.text })),
        ...currentHistory
      ];
      remaining -= chunkCount;
      isFirstChunk = false;
    }

    return accumulatedPrompts.slice(0, totalRequested);
  }

  // Helper to check if a field is active and not default
  const getFieldVal = (key: keyof PromptOptions, val: string) => {
    if (options.activeFields && options.activeFields[key] === false) return null;
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
      1. STRICT HERO PRODUCT & PACKAGING LOCK (ZERO RECOLORING):
         - The physical packaging, container structure, bottle/can/box geometry, material finish (glass clarity, metallic sheen, matte paper, embossed foil), exact label typography, font family, text alignment, and original authentic colors of the referenced hero product MUST be preserved 100% identically from the reference image.
         - The AI image generator MUST NOT invent alternative brand names, mutate letters, alter packaging proportions, or change the hero product's original colors. The referenced product must remain the authentic hero item.
         - Lighting Adaptation vs Recoloring: The product's original colors must only be photometrically adjusted for physically accurate lighting, realistic ambient light reflections, specular highlights, and contact shadows to blend organically into the scene (NEVER an artificial digital cutout or sticker, and NEVER repainted into unrelated colors).

      2. REFERENCE-DRIVEN BRAND COLOR PALETTE EXTRACTION & HARMONIZATION:
         - The user attaches reference images that include the hero product, brand logo, and brand color palette swatches/guide.
         - The generated prompt MUST explicitly instruct the AI image generator to sample and extract the primary and secondary brand colors directly from the attached reference assets.
         - Strategic Brand Color Distribution across the Environment:
           * SCENE BACKDROP & ENVIRONMENT: Studio cyclorama, painted backdrop wall, room interior, or scenic environment keyed in the harmonious brand palette hues.
           * STAGE PROPS & SET STYLING: Pedestals, podiums, geometric risers, decorative styling objects, organic elements, or tabletop surfaces tinted in complementary brand palette tones.
           * MODEL WARDROBE & FASHION STYLING: If a human model or hands are featured, their attire, wardrobe fabric, nail tone, or accessories should be curated in complementary brand color tones that flatter the product.
           * AMBIENT LIGHTING ACCENTS & REFLECTIONS: Subtle edge rim lighting, soft diffuse fill, and environmental light bounce tinted with subtle brand accent hues.
         - Contrast & Separation: Ensure the backdrop and props provide clean contrast so the hero product immediately pops and remains the focal point without color clashing or muddiness.

      3. SEAMLESS MODEL / HAND INTERACTION & ERGONOMIC BLEND:
         - IF held by a person / model: Depict a natural, ergonomic hand grip. Fingers must wrap realistically around the container with anatomical authenticity and accurate finger-to-product scale.
         - Occlusion Rule: Hand/fingers should support the product naturally without obscuring or covering the primary front-facing brand logo and key product label typography.
         - Skin Contact & Physicality: Realistic contact shadows between skin and product surface, subtle finger compression/grip pressure, and authentic skin-tone light bounce onto reflective product surfaces.

      4. SEAMLESS ENVIRONMENTAL & LIGHTING INTEGRATION:
         - Lighting Unity: The preserved product MUST fully participate in the scene's ambient lighting setup (e.g., warm golden hour rim light, soft diffuse window fill, or sleek minimalist studio lighting). It must receive the same light direction, specular highlights, and ambient reflections as the rest of the scene so it looks organically captured in-camera.
         - Grounding & Contact Shadows: Whether placed on a tabletop, marble vanity, podium, or held in hands, enforce physically accurate contact shadows and grounded perspective depth.

      5. COMMERCIAL STOCK HYGIENE COMPATIBILITY:
         - While the authentic typography, text, and logo on the referenced product are strictly preserved, NO extraneous random text, background signs, UI elements, or fake watermarks are permitted in the surrounding environment. Keep the surrounding scene completely clean.

      6. COLOR TEXT SANITIZATION & OVERRIDE (CRITICAL):
         - If the input text, Smart Refinement, or user parameters contain any specific color adjectives (e.g., "blue bottle", "red can", "white backdrop", "black dress", "amber tones", etc.), you MUST STRIP and OVERRIDE them in the generated prompt!
         - NEVER let arbitrary color words in the prompt text override the visual reference images.
         - The prompt MUST describe the product as "the hero product in its authentic original packaging colors and finish as shown in the reference image", and describe the environment/wardrobe/backdrop as "styled in the brand's extracted color palette against a brand-harmonized studio backdrop".

      7. CONTAINER & DISPENSER CLASSIFICATION BAN (PREVENT HALLUCINATING PACKAGING):
         - NEVER describe or prescribe specific container mechanics or dispenser types in the generated prompt (e.g., do NOT write "pump bottle", "dropper bottle", "twist cap", "squeeze tube", "spray can").
         - ALWAYS refer to the item as "the referenced hero product in its authentic original packaging as shown in the reference image" or "the authentic packaged product".
         - This prevents text tokens from conflicting with or mutating the exact physical packaging container visible in the reference image.

      8. ULTRA-REALISTIC BEAUTY & EPIDERMAL MICRO-TEXTURE (ANTI-AI PLASTIC SKIN):
         - VISIBLE MICRO-PORE & EPIDERMAL TEXTURE: The human model's skin MUST display authentic high-resolution epidermal texture—visible natural pores, fine skin grain, natural microscopic creases around smile lines and eyelids, and natural skin translucency (subsurface scattering). ABSOLUTELY FORBIDDEN: airbrushed mannequin finish, overly smoothed plastic AI skin, waxy blur, or uncanny CGI porcelain smoothing.
         - DEWY HYDRATION & GLASS-SKIN GLOW: Render healthy, radiant dewy skin with natural specular highlights on high facial points (cheekbones, nose bridge, cupid's bow, temples, and collarbones) that looks like real topical skincare/serum hydration. Specular highlights must reflect ambient studio light naturally without looking greasy or oily.
         - LIFELIKE EYES & STUDIO CATCHLIGHTS: Eyes must have authentic depth, realistic iris color gradients, delicate moisture sheen, and subtle, natural specular catchlights in pupils for lifelike vitality. Facial expressions must feel genuine and spontaneous (e.g., radiant joyful laugh, natural crinkle around the eyes, or calm confident dewy gaze).

      9. BEAUTY EDITORIAL FACE-FRAMING & UNBLOCKED LOGO GRIP (COMMERCIAL POSE DISCIPLINE):
         - FACE-FRAMING PLACEMENT: When held by a person / model, position the product in the upper frame near the model's cheek, temple, chin, or collarbone. This beauty editorial composition visually connects the product to healthy, radiant skin results.
         - ZERO-OCCLUSION FINGERTIP GRIP: Fingers must hold the product delicately by the outer side edges, base, or cap seam—never covering or obscuring the front brand logo or label typography. 100% of the front-facing label must remain crisp and unobstructed.
         - PHYSICAL CONTACT SHADOWS & SPECULAR BOUNCE: Enforce authentic contact shadows where fingers meet the product container, and realistic specular bounce between skin and packaging surfaces (e.g., subtle skin tone reflections on glass/plastic containers).

      10. EDITORIAL CYCLORAMA & LIGHTING FIDELITY (HARDWARE-FREE DESCRIPTIONS):
         - STUDIO CYCLORAMA GRADING: Studio backdrop should be an immaculate seamless paper cyclorama or soft two-tone gradient wall keyed in the extracted reference brand palette (e.g., pastel lavender-to-peach, soft warm pink, or clean high-key studio white), providing clean contrast so the hero product and glowing model pop beautifully.
         - COMMERCIAL BEAUTY STUDIO LIGHTING: Broad diffused directional key illumination with velvety wraparound fill light, crisp edge definition without harsh unflattering shadows, and an 85mm/105mm portrait lens perspective with tack-sharp focus on the product and model's features.
         - NEVER NAME PHYSICAL HARDWARE: Describe only light behavior and surface illumination. Strictly do NOT name physical lighting gear (no "softbox", "octabox", "light stand", "umbrella", "diffuser").

      11. COMMERCIAL STILL-LIFE & STANDALONE PRODUCT REALISM (NO HUMAN MODEL / PRODUCT-ONLY):
         - GROUNDED TACTILE SURFACE & PODIUM INTEGRATION: When no human model is featured, the product MUST rest grounded on a realistic tactile surface—such as a polished marble slab, travertine stone block, wet reflective dark glass, tranquil shallow water pool with delicate ripples, or minimalist geometric podium. Enforce physically accurate ambient occlusion contact shadows directly under the product base and natural ground reflections.
         - PACKAGING MICRO-DETAIL, CONDENSATION & FRESHNESS DETAILS: Render crisp tactile physical details—such as fine micro-condensation droplets or mist beads clinging to the bottle/container surface, crystal-clear liquid transparency and refraction through glass walls, embossed metallic foil accents, or dynamic fluid ripples.
         - SCULPTED COMMERCIAL PRODUCT ILLUMINATION: Sculpted vertical linear highlight reflections along the cylindrical container curvature to define its three-dimensional form, gentle directional rim illumination, and subtle transmitted backlight passing through translucent liquids to illuminate rich interior colors.
         - MACRO OPTICS & TACK-SHARP CLARITY: 90mm or 100mm macro prime lens, edge-to-edge tack-sharp focus across the hero product, crisp label typography readability, and smooth natural depth-of-field falloff in the distant background.

      12. LUXURY HAND-HELD PRODUCT & OPTICAL GLASS PHYSICS (FACELESS HAND & BOTTLE):
         - DELICATE MANICURED HAND & EPIDERMAL ANATOMY: Authentic high-resolution hand skin anatomy—natural micro-creases at knuckles, subtle fingernail cuticles, clean manicured nails (almond or oval shape with subtle gloss or neutral tone harmonizing with the brand aesthetic), and natural skin translucency (subsurface scattering). ABSOLUTELY FORBIDDEN: plastic AI hands, distorted knuckles, rubbery skin, or missing/extra fingers.
         - ZERO-OCCLUSION COMMERCIAL GRIP: The hand must grip or cradle the bottle gently by the lower base or outer side edges, ensuring that 100% of the front brand typography, emblem, and label face directly toward the camera completely unblocked.
         - PHYSICAL GLASS & LIQUID REFRACTION: Render heavy luxury crystal/glass base thickness, optical glass refraction, realistic liquid meniscus, luminous chromatic liquid transparency (e.g., warm golden amber, blush rose, or crystal clear), and realistic caustic light patterns projected onto surrounding backdrops. Metallic atomizer collar and spray nozzle must feature crisp specular highlights.
         - LUXURY EDITORIAL ATMOSPHERE: Set against softly draped silk/satin, warm porous travertine stone, or a minimalist studio cyclorama with gentle depth-of-field falloff.

      13. COMMERCIAL BEAUTY & HAIRCARE CAMPAIGN ARCHETYPES (BRAND-HARMONIZED WARDROBE & EFFICACY DEMONSTRATION):
         - BRAND-HARMONIZED WARDROBE & JEWELRY STYLING: The model's wardrobe (e.g. ribbed knit top, high-neck halter top, lace top, metallic knit) and accessories (e.g. chunky gold arm cuffs, statement floral earrings, delicate chain bracelets) MUST be deliberately keyed to and harmonized with the extracted reference brand palette.
         - PRODUCT EFFICACY & HAIR DEMONSTRATION POSES: When featuring hair or skincare products, the model should hold the hero product in one hand near shoulder/cheek while the other hand gracefully interacts with hair (running fingers through glossy, voluminous, textured strands) or lightly touches glowing skin to communicate genuine product efficacy.
         - TABLETOP LINEUP SYNERGY: When complementary product variations are present, ground them neatly in the foreground tabletop arrangement (e.g., tubs, bottles, droppers, cosmetic jars) with realistic contact shadows, while the hero product is held prominently in the model's hand.
         - AUTHENTIC SPONTANEOUS EXPRESSION VS HAUTE-COUTURE GAZE: Support both radiant spontaneous joy (open laugh, teeth visible, natural eye crinkles around smile lines) and intense haute-couture editorial gaze (sculpted cheekbone highlighter, bold lip, commanding eye contact).

      14. SEAMLESS BACKGROUND PURITY & PRODUCTION HARDWARE EXCLUSION DIRECTIVE (ZERO STUDIO EQUIPMENT):
         - STRICT PROHIBITION ON EQUIPMENT NOUNS: Generated prompts MUST NOT describe or mention physical photography equipment (strictly forbidden words: "softbox", "octabox", "strip softbox", "light stand", "C-stand", "tripod", "backdrop light", "lighting umbrella", "diffuser panel", "reflector disc", "boom arm", "camera rig"). Describe ONLY the quality and distribution of light on the subject (e.g., "broad diffused illumination", "sculpted specular highlights", "gentle rim glow").
         - AFFIRMATIVE SEAMLESS CYCLORAMA FRAMING: The scene MUST be framed against an immaculate, unbroken seamless cyclorama backdrop (infinity cove), pristine smooth wall, or styled architectural surface. 
         - STRICT EXCLUSION OF BEHIND-THE-SCENES HARDWARE: The camera strictly frames the finished, published advertising campaign composition. Absolutely zero light stands, zero backdrop fixtures, zero power cables, zero clamps, and zero behind-the-scenes production clutter in the frame.
      `;
    } else if (isHumanPreservation) {
      productPreservationEngine = `
      [HUMAN IDENTITY LOCK & POSE TRANSFER PRESERVATION MODE: ACTIVE]
      CRITICAL HUMAN IDENTITY LOCK & POSE TRANSFER FIDELITY DIRECTIVES:
      1. 100% FACIAL IDENTITY LOCK FROM REFERENCE IMAGE:
         - The person's exact facial features, bone structure, facial contours, jawline, eye shape, nose structure, lip profile, and authentic facial likeness from the attached reference photo MUST be preserved 100% identically across all prompt variations.
         - ZERO IDENTITY DRIFT: The AI image generator MUST NOT genericize, swap, morph, or "beautify away" the person's real facial features. The generated person MUST be unequivocally identified as the exact individual in the reference image across all generated prompt variations.

      2. BIOMETRIC-NEUTRAL TEXT PROMPTING (PREVENTING FACE/HAIR TEXT CONFLICTS):
         - The prompt text MUST NOT hardcode permanent facial biometric traits (such as specific hair cuts/colors, specific eye colors, or fixed skin undertones) that could conflict with the user's reference photo.
         - Instead, the prompt explicitly delegates all facial identity, skin tone, and hair texture directly to the visual reference asset:
           "A [man/woman/person] preserving the authentic facial identity, facial structure, natural skin tone, and hairstyle identically from the reference image, [pose/action], [attire/wardrobe]..."
         - This allows seamless Face ID / reference image transfer whether using a selfie for identity lock OR borrowing pose/composition from a reference photo.

      3. AUTHENTIC NATURAL SKIN TONE & EPIDERMAL MICRO-TEXTURE:
         - Faithfully retain the person's authentic natural skin tone and undertone as seen in the reference photo without artificial alteration.
         - Enforce visible high-resolution epidermal texture: natural micro-pores, fine skin grain, natural microscopic creases around smile lines and eyelids, and natural skin translucency (subsurface scattering).
         - STRICTLY FORBIDDEN: airbrushed mannequin skin, overly smoothed plastic AI skin, waxy blur, or uncanny CGI porcelain smoothing.

      4. NATURAL POSE, ATTIRE & SCENE DYNAMICS:
         - The person's facial identity remains strictly locked to the reference photo, while their body posture, pose, wardrobe, and scene interaction are driven cleanly by the prompt.
         - Physical Illumination Unity: The person receives realistic ambient lighting, directional key/fill light, edge rim illumination, and specular catchlights in the pupils consistent with the chosen environment.
         - Natural Expressions: Retain natural facial expressions and authentic emotional warmth (e.g., genuine confident smile, relaxed candid gaze, thoughtful engagement) while keeping defining facial landmarks intact.

      5. PROMPT DESCRIPTOR DIRECTIVE:
         - The prompt MUST explicitly describe the subject as: "the exact same person shown in the reference image, preserving their authentic facial identity, facial structure, natural skin tone, and hairstyle as the reference subject".
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
      smartRefinement: options.activeFields?.smartRefinement ? (isProductPreservation ? stripColorDescriptors(options.smartRefinementText) : options.smartRefinementText) : null,
      ageRange: getFieldVal('ageRange', options.ageRange || 'Default / Auto'),
      colorMood: getFieldVal('colorMood', options.colorMood || 'Default / Auto'),
      preservationMode: isProductPreservation 
        ? 'PRODUCT PRESERVATION ENABLED (Strict Reference & Packaging Lock, Reference Brand Color Extraction across Backdrop/Props/Wardrobe/Lighting, Seamless Model/Hand Blend)' 
        : isHumanPreservation 
        ? 'HUMAN IDENTITY PRESERVATION ENABLED (Strict Facial Identity & Likeness Lock, Face Shape, Skin Tone, Hairstyle & Body Structure Fidelity, Zero Likeness Drift)' 
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

    // Determine if Smart Refinement is a broad 1-3 word category seed (e.g. "healthcare", "food", "business") vs a specific visual scene/reference
    const broadCategorySeeds = [
      'healthcare', 'medical', 'food', 'restaurant', 'business', 'corporate',
      'technology', 'tech', 'travel', 'tourism', 'fitness', 'wellness',
      'education', 'real estate', 'icon set', 'icons', 'lifestyle', 'finance',
      'cybersecurity', 'e-commerce', 'social media'
    ];
    const srTrimmed = (inputs.smartRefinement || '').trim().toLowerCase();
    const isBroadCategorySeed = !options.isFromImageReference &&
      srTrimmed.length > 0 &&
      srTrimmed.split(/\s+/).length <= 3 &&
      broadCategorySeeds.some(cat => srTrimmed === cat || srTrimmed === `${cat} photography` || srTrimmed === `${cat} icons`);

    // Master Anchor Mode applies to Option 1 whenever the user provided an Image Reference OR a specific Text Reference (and this is the first chunk)
    const isMasterAnchorMode = !isSubBatchContinuation && (!!options.isFromImageReference || (!!inputs.smartRefinement && !isBroadCategorySeed));

    console.log("Final smartRefinement being used:", inputs.smartRefinement, "isMasterAnchorMode:", isMasterAnchorMode);

    const systemPrompt = `
    ROLE: PROFESSIONAL COMMERCIAL MICROSTOCK PROMPT ARCHITECT (ADOBE STOCK, FREEPIK, SHUTTERSTOCK, VECTEEZY STANDARD).
    TASK: Generate ${options.quantity} structured, high-converting commercial stock prompts strictly based on configuration.
    
    INPUT CONFIGURATION:
    ${JSON.stringify(inputs, null, 2)}

    ================================================================================
    UNIVERSAL STOCK ARCHITECTURE: MASTER CLONE (#1) + CATEGORY-SAFE VARIATIONS (#2–#${options.quantity})
    ================================================================================
    - The 'INPUT CONFIGURATION' above defines the anchor parameters selected by the user.${lockedFieldsRule}
    ${isMasterAnchorMode ? `
    [RULE 1 — PROMPT #1 (OPTION 1) MUST BE A 100% EXACT MASTER CLONE OF THE REFERENCE]:
    - CRITICAL REQUIREMENT FOR PROMPT #1: The VERY FIRST prompt in this batch (Option 1) MUST be a 100% faithful, exact, literal recreation of the Smart Refinement reference and the provided Input Configuration!
    - Do NOT alter the camera angle, do NOT change the item count or spatial arrangement (e.g. if two tomato slices are overlapping in the center, keep them overlapping in the center), do NOT change the lighting or color palette, and do NOT modify the background in Option 1.
    - Option 1 must produce an image that looks like a twin/exact match of the user's reference concept while maintaining pristine commercial stock quality (${isProductPreservation ? 'preserve authentic product packaging and labels identically, ' : isHumanPreservation ? 'preserve exact reference human facial identity, facial structure, skin tone, and hairstyle identically without biometric text conflicts, ' : 'no text, no watermarks, no studio hardware, '}razor-sharp clarity).
    ${isProductPreservation ? `
    * [CRITICAL COLOR & CONTAINER DE-CONFLICTING OVERRIDE FOR OPTION 1 & BATCH]:
      1. YOU ARE STRICTLY FORBIDDEN from outputting literal color words or container/dispenser mechanics (like "pump bottle", "dropper bottle", "red can") that could conflict with the attached reference product!
      2. Describe the hero item as "the referenced hero product in its authentic original packaging colors, label typography, and finish as shown in the reference image".
      3. Describe the scene backdrop, props, and wardrobe as "harmonized in the brand color palette extracted directly from the attached reference assets".` : isHumanPreservation ? `
    * [CRITICAL HUMAN IDENTITY LOCK & POSE TRANSFER FOR OPTION 1 & BATCH]:
      1. Describe the human subject across all prompts as: "the exact same person shown in the reference image, preserving their authentic facial identity, facial structure, natural skin tone, and hairstyle as the reference subject".
      2. Do NOT output conflicting facial biometrics (no explicit hair colors/cuts, skin undertones, or eye colors) in the text. Keep 100% zero identity drift across all prompts!` : ''}
    ` : ''}
    [RULE 2 — PROMPTS #${isMasterAnchorMode ? '2' : '1'} TO #${options.quantity}: 4-CATEGORY COMMERCIAL MICROSTOCK VARIATION MATRIX]:
    - Microstock platforms (Adobe Stock, Freepik, Shutterstock) require every image in a portfolio batch to be:
      (A) 100% Commercially Usable (never crop off an isolated PNG cutout, never destroy copy space on a background, never add studio C-stands/paper rolls, and never invent unwanted body parts), AND
      (B) Distinct Enough Not To Be Rejected As "Similar/Duplicate Spam".
    - Therefore, for ${isMasterAnchorMode ? 'Option 2 onwards (Prompts #2 to #' + options.quantity + ')' : 'every prompt in the batch'}, you MUST keep the EXACT SAME core subject/theme from Smart Refinement, and apply ONLY the **Category-Safe Commercial Stock Variations** matching the subject's category below (unless a field is explicitly LOCKED above):

      * CATEGORY A — ISOLATED PNG / CUTOUT ASSETS (When subject = 'Isolated Object (PNG Ready)', OR floating food/fruit/vegetable slices, herbs, spices, 3D icons, vintage frames/plaques, wooden podiums, or standalone objects on a pure white/solid background):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 to #${options.quantity}):
          1. Pure 100% flat white (or solid) background with ZERO table texture, ZERO horizon line, and ZERO cast ground shadows ('No Shadow / Flat').
          2. 100% full uncropped margins around all elements so the asset is ready for instant background removal.
          3. NEVER switch an isolated cutout into a 45-degree tabletop angle with cast shadows or a cropped close-up!
        - SAFE STOCK VARIATIONS TO CYCLE ACROSS PROMPTS #2 TO #${options.quantity}:
          - If Food / Botanical / Ingredient Cutouts (e.g., tomato slices, basil leaves, fruits, spices): Keep the top-down flat-lay shadowless white cutout view and vary the **geometric arrangement & micro-details** for each prompt:
            * Variation 2: Three slices arranged in a balanced triangular cluster surrounded by fresh leaves and spices on pure white.
            * Variation 3: Circular wreath / ring arrangement of slices and leaves with clean copy space in the center on pure white.
            * Variation 4: Dynamic diagonal cascading line of overlapping slices, leaves, and seeds across the white canvas.
            * Variation 5: Neat symmetrical knolling grid arrangement of slices, leaves, and peppercorns on pure white.
            * Variation 6: Overlapping slices and leaves adorned with glistening fresh water droplets on pure white.
            * Variation 7+: Continue rotating S-curve layouts, radial burst patterns, paired halves with whole cherry accents, and varied leaf groupings—always shadowless on pure white!
          - If Standalone 3D Objects, Frames, Plaques, Podiums, or Icons on White: Keep the full uncropped object at Eye Level or subtle 15-degree three-quarter view on a pure white shadowless background; vary subtle ornamental details, material finishes (polished wood tones, brushed gold vs silver trim, matte vs glossy), and clean lighting highlights.

      * CATEGORY B — COPY-SPACE BACKDROPS, BOTANICAL FOREGROUNDS & STAGES (When subject = 'Background / Landscape only', mossy hills, floral foregrounds, empty theatrical stages, or abstract 3D wallpapers):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 to #${options.quantity}):
          1. Continuous edge-to-edge foreground spanning uninterrupted from the far left edge to the far right edge of the frame (NEVER a small isolated clump/mound sitting in the middle of a room!).
          2. Generous 50%–65% clean open negative space (copy space) in the upper or center frame for commercial text/product placement.
          3. NEVER write "studio backdrop" or "minimalist studio setting" (which causes AI generators to draw paper rolls and metal stands); always write "seamless [color] gradient background".
          4. NEVER flip a front-facing stage or horizon backdrop into a "Top View / Flat Lay" looking down at ceiling trusses!
        - SAFE STOCK VARIATIONS TO CYCLE ACROSS PROMPTS #2 TO #${options.quantity}:
          - Vary the seamless sky/background color gradient across options (e.g., warm peach-to-cream -> soft sage-green to ivory -> golden morning amber glow -> pastel lavender-blush -> serene sky-blue to white -> warm sand-beige gradient).
          - Vary the natural foreground accents (e.g., white daisies & weathered driftwood -> pastel pink wild roses & smooth river pebbles -> lush forest ferns & sparkling morning dew drops -> yellow wildflowers & mossy bark -> delicate chamomile & flat stepping stones).
          - Vary the gentle foreground contour (gentle rolling slope, asymmetrical left-to-right rise, or soft valley cradle in the center).

      * CATEGORY C — PLATED / TABLETOP FOOD & COMMERCIAL PRODUCT STILL-LIFE (When subject = 'Still life / Food & Drink' or 'No person (product)' resting on a real table/surface):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 to #${options.quantity}):
          1. The exact core dish or product, appetizing commercial clarity, and a clean uncluttered background.
          2. STRICT BAN ON INVENTING HUMANS OR HANDS: If Option 1 / Smart Refinement has NO human or hands, NEVER add "faceless hands garnishing" or people in Option 2+!
        - SAFE STOCK VARIATIONS TO CYCLE ACROSS PROMPTS #2 TO #${options.quantity}:
          - Cycle standard commercial culinary/product angles: 90-degree Top-Down Flat Lay -> 45-degree Elevated Dining Angle -> Eye-Level Hero Close-Up -> Rule-of-Thirds Copy-Space framing.
          - Vary tasteful tabletop surfaces: light natural oak wood -> matte white Carrara marble -> warm travertine stone -> dark rustic slate -> natural linen table runner.
          - Vary subtle lighting moods: bright soft morning daylight -> warm golden side-lighting -> crisp commercial diffused illumination.

      * CATEGORY D — HUMAN, LIFESTYLE & CORPORATE STOCK (When subject involves a person or group of people):
        - STRICTLY LOCKED ACROSS ALL PROMPTS (#1 to #${options.quantity}):
          1. Authentic epidermal skin micro-texture, natural 5-finger hand anatomy, and any specified gender, body build/stature, age range, or cultural/facial identity locks.
        - SAFE STOCK VARIATIONS TO CYCLE ACROSS PROMPTS #2 TO #${options.quantity}:
          - Cycle commercial camera framings: Medium Waist-Up Shot -> Close-Up Portrait -> Wide Environmental Composition with copy space -> Over-the-shoulder action angle.
          - Vary natural micro-actions/poses, coordinated wardrobe tones, and natural daylight vs warm indoor lighting.
    - Ensure that every single prompt in the batch reads as a complete, self-contained, natural visual description ready to paste directly into an AI image generator.
    
    RENDERING RULES (MEDIUM-AWARE):
    ${renderingInstructions}

    ${lightingDiscipline}

    ${opticsEngine}

    ${backgroundModeEngine}

    ${productPreservationEngine}

    CORE ASSEMBLY FRAMEWORK (STRICT ORDER):

    [CATEGORY AUTO-EXPAND RULE]:
    ${!isBroadCategorySeed ? `*CRITICAL OVERRIDE*: Since a specific reference/scene is provided, you are STRICTLY FORBIDDEN from applying the broad Category Auto-Expand Rule. The core subject MUST remain faithful to the Smart Refinement across all ${options.quantity} prompts.` : `When smartRefinement contains a broad category phrase (e.g., "healthcare", "food", "business", "travel", "real estate", "education", "fitness", "icon set", "lifestyle", "technology"):

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
       - Rule: Clean commercial stock image only. ${isProductPreservation ? 'Preserve authentic product packaging, label typography, font styling and original product colors identically from reference. Instruct the generator to sample brand colors from attached reference swatches/assets for backdrop, props, wardrobe, and ambient light accents. No random external text, no floating watermarks, no studio equipment.' : isHumanPreservation ? 'Preserve authentic human facial identity, exact bone structure, facial contours, natural skin tone, and hairstyle identically from reference image with zero identity drift. Do not output contradictory biometric text; delegate facial features and hair to the reference asset while guiding pose, wardrobe, and environment cleanly. No random external text, no floating watermarks, no studio equipment.' : 'Absolutely no visible text, no logos, no watermarks, no studio lights, no light stands, no softboxes, no camera equipment visible in frame.'} (Apply this as a system rule, DO NOT output this text in the generated prompt).
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
    Describe as architecture, geometric texture, glass structure, or luminous landscape — NOT as a floating object. Use terms like:
    "repeating vertical ribbed slats", "fluted glass texture with luminous refraction waves", "linear architectural louvers", "sweeping curved liquid glass ribbons", "repeating geometric panels", "parametric ribbed structure", "reeded glass panels with vibrant backlight", "prismatic optical glass refraction with chromatic caustics", "infinite corridor", "repeating pattern receding to vanishing point"

    3. CAMERA LANGUAGE:
    Always include perspective depth or full edge-to-edge frame coverage:
    "full-frame edge-to-edge composition with geometric rhythm", "deep perspective vanishing point", "camera looking along the curve", "perspective depth receding into distance", "immersive first-person viewpoint"

    4. LIGHTING & MATERIALS:
    Ambient self-illumination, dual-tone neon gradients, or translucent refraction from within the structure.
    Use: "dual-tone neon gradient lighting (electric blue, vibrant orange, magenta)", "translucent luminous refraction through ribbed panels", "soft ambient backlight glow emanating through slats", "ambient glow from within", "self-lit geometric form", "integrated environmental lighting"

    5. NEVER USE for this visual type:
    "isolated", "white background", "studio setting", "floating object", "product shot", "softbox", "three-point lighting"

    6. ZERO BLUR & TACK-SHARP TEXTURE RULE (CRITICAL - NO BLUR ALLOWED):
    - Must enforce crystal-clear, edge-to-edge razor-sharp focus across the entire frame.
    - Explicitly inject: "razor-sharp edge-to-edge focus, crisp defined ridges, pristine optical glass clarity, tack-sharp geometric lines, high micro-contrast, zero depth-of-field blur".
    - ABSOLUTELY FORBIDDEN: Do NOT use "shallow depth of field", "bokeh", "blurry background", "dreamy blur", "lens blur", or "soft focus". The entire glass structure, ribbed louvers, and refraction light waves must be tack sharp from corner to corner.

    7. LENGTH: 50-70 words for core prompt body.

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
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          systemPrompt,
          apiKey: finalKey
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Gemini generation failed (${response.status})`);
      }
      const data = await response.json();
      rawText = data.text?.trim() || '{"prompts":[]}';
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
