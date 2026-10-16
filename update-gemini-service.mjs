import fs from 'fs';

let content = fs.readFileSync('services/geminiService.ts', 'utf-8');

const target1 = `        \${isProductPreservation ? \`
        - [PRODUCT PRESERVATION & ULTRA-REALISTIC RENDERING DIRECTIVE]:
          * If human model / beauty / haircare campaign: Explicitly describe authentic epidermal skin micro-texture, visible micro-pores, natural fine creases around eyelids and smile lines, dewy hydration sheen with natural specular highlights on cheekbones, and delicate, natural specular catchlights in the pupils. NEVER describe skin as plastic, airbrushed, or overly smoothed. Individual glossy hair strands with natural texture and dynamic volume (no plastic wig clumping). Wardrobe and accessories (e.g. knit top, halter top, lace top, gold arm cuffs) harmonized with the extracted brand palette. Authentic spontaneous radiant smile or intense haute-couture gaze. Delicate zero-occlusion fingertip grip supporting the product without covering the front logo.
          * If hand holding product / luxury bottle interaction: Explicitly describe delicate manicured hand anatomy, natural knuckle skin creases, clean polished fingernails, authentic skin translucency (subsurface scattering), zero-occlusion grip supporting the bottle, heavy crystal glass flacon base, liquid refraction, and luminous caustics.
          * If Product / Object Only or Still-life (NO human model): Explicitly describe pristine commercial still-life photography, 100% packaging and typography fidelity, tactile material finish, crystal-clear glass refraction, micro condensation droplets or dew mist on packaging, authentic ground reflections, and grounded contact shadows on podium/water/stone surfaces.\` : \`
        - [COMMERCIAL LUXURY REALISM DIRECTIVE (PRESERVATION OFF)]:
          * If human model / beauty / haircare campaign: Authentic epidermal skin micro-texture, visible micro-pores, natural dewy glow, individual glossy hair strands with realistic sheen, and studio catchlights in eyes, avoiding artificial airbrushing or plastic smoothing. Coordinated wardrobe and styling (e.g. matching knit top, lace dress, gold cuff jewelry). Radiant open smile or commanding haute-couture gaze.
          * If hand holding product / luxury bottle: Explicitly describe delicate manicured hand anatomy, natural knuckle skin creases, clean polished nails, zero-occlusion grip, luxury crystal glass bottle with thick heavy base, optical liquid refraction and luminous caustics, with creative freedom for natural colors and styling.
          * If Product / Object Only or Still-life: Pristine commercial product photography, realistic materials, crystal glass refraction, tactile surfaces (marble, silk, travertine), and grounded contact shadows.\`}`;

const replacement1 = `        \${isProductPreservation ? \`
        - [PRODUCT PRESERVATION & ULTRA-REALISTIC RENDERING DIRECTIVE]:
          * If human model / beauty / haircare campaign: Explicitly describe authentic epidermal skin micro-texture, visible micro-pores, natural fine creases around eyelids and smile lines, dewy hydration sheen with natural specular highlights on cheekbones, and delicate, natural specular catchlights in the pupils. NEVER describe skin as plastic, airbrushed, or overly smoothed. Individual glossy hair strands with natural texture and dynamic volume (no plastic wig clumping). Wardrobe and accessories (e.g. knit top, halter top, lace top, gold arm cuffs) harmonized with the extracted brand palette. Authentic spontaneous radiant smile or intense haute-couture gaze. Delicate zero-occlusion fingertip grip supporting the product without covering the front logo.
          * If hand holding product / luxury bottle interaction: Explicitly describe delicate manicured hand anatomy, natural knuckle skin creases, clean polished fingernails, authentic skin translucency (subsurface scattering), zero-occlusion grip supporting the bottle, heavy crystal glass flacon base, liquid refraction, and luminous caustics.
          * If Product / Object Only or Still-life (NO human model): Explicitly describe pristine commercial still-life photography, 100% packaging and typography fidelity, tactile material finish, crystal-clear glass refraction, micro condensation droplets or dew mist on packaging, authentic ground reflections, and grounded contact shadows on podium/water/stone surfaces.\` : isHumanPreservation ? \`
        - [HUMAN IDENTITY PRESERVATION & ULTRA-REALISTIC PORTRAIT DIRECTIVE]:
          * Explicitly describe authentic epidermal skin micro-texture, visible micro-pores, natural fine creases around eyelids and smile lines, healthy dewy skin glow with natural specular highlights on cheekbones, and delicate specular catchlights in the pupils.
          * Faithfully preserve the exact same facial landmarks, eye shape, nose structure, lip profile, skin undertone, hairstyle, and body proportions shown in the reference image.
          * ZERO identity drift: The subject across every option must be unequivocally identified as the person in the reference photo.
          * NEVER describe skin as plastic, airbrushed, or overly smoothed.\` : \`
        - [COMMERCIAL LUXURY REALISM DIRECTIVE (PRESERVATION OFF)]:
          * If human model / beauty / haircare campaign: Authentic epidermal skin micro-texture, visible micro-pores, natural dewy glow, individual glossy hair strands with realistic sheen, and studio catchlights in eyes, avoiding artificial airbrushing or plastic smoothing. Coordinated wardrobe and styling (e.g. matching knit top, lace dress, gold cuff jewelry). Radiant open smile or commanding haute-couture gaze.
          * If hand holding product / luxury bottle: Explicitly describe delicate manicured hand anatomy, natural knuckle skin creases, clean polished nails, zero-occlusion grip, luxury crystal glass bottle with thick heavy base, optical liquid refraction and luminous caustics, with creative freedom for natural colors and styling.
          * If Product / Object Only or Still-life: Pristine commercial product photography, realistic materials, crystal glass refraction, tactile surfaces (marble, silk, travertine), and grounded contact shadows.\`}`;

const target2 = `        \${isProductPreservation ? \`
        - [EDITORIAL STUDIO OPTICS FOR PRESERVATION (HARDWARE-FREE)]:
          * If human model / beauty shot: Enforce portrait prime lens optics (e.g., 85mm portrait lens, f/2.0 soft background separation), tack-sharp focus on the product label and model's eyes/facial features, broad diffused directional key illumination with soft wraparound fill and seamless brand-harmonized backdrop falloff, clean natural specular catchlights in pupils.
          * If hand holding product / luxury bottle: 90mm or 100mm macro prime lens, f/2.8 shallow depth of field, tack-sharp focus on the bottle label and glass flacon, soft directional studio illumination with warm golden or diffused rim light, highlighting liquid clarity and metallic accents, smooth background falloff.
          * If Product / Object Only or Still-life (NO human model): Enforce commercial macro prime lens (e.g., 90mm or 100mm macro lens), edge-to-edge tack-sharp focus on packaging and label typography, sculpted vertical linear specular highlight reflections defining the container contours, grounded ambient occlusion shadows at the base, and soft atmospheric depth-of-field falloff in the background.\` : \`
        - [COMMERCIAL STUDIO OPTICS (PRESERVATION OFF)]:
          * Professional prime lens optics (85mm-100mm macro/portrait prime lens), tack-sharp focus across the hero subject and label, clean directional studio key and fill illumination, authentic physical contact shadows, and natural creamy depth-of-field bokeh.\`}`;

const replacement2 = `        \${isProductPreservation ? \`
        - [EDITORIAL STUDIO OPTICS FOR PRESERVATION (HARDWARE-FREE)]:
          * If human model / beauty shot: Enforce portrait prime lens optics (e.g., 85mm portrait lens, f/2.0 soft background separation), tack-sharp focus on the product label and model's eyes/facial features, broad diffused directional key illumination with soft wraparound fill and seamless brand-harmonized backdrop falloff, clean natural specular catchlights in pupils.
          * If hand holding product / luxury bottle: 90mm or 100mm macro prime lens, f/2.8 shallow depth of field, tack-sharp focus on the bottle label and glass flacon, soft directional studio illumination with warm golden or diffused rim light, highlighting liquid clarity and metallic accents, smooth background falloff.
          * If Product / Object Only or Still-life (NO human model): Enforce commercial macro prime lens (e.g., 90mm or 100mm macro lens), edge-to-edge tack-sharp focus on packaging and label typography, sculpted vertical linear specular highlight reflections defining the container contours, grounded ambient occlusion shadows at the base, and soft atmospheric depth-of-field falloff in the background.\` : isHumanPreservation ? \`
        - [EDITORIAL PORTRAIT OPTICS FOR HUMAN IDENTITY PRESERVATION (HARDWARE-FREE)]:
          * 85mm or 105mm portrait prime lens, f/2.0 or f/2.8 soft background separation, tack-sharp focus on the subject's eyes, facial features, and hair texture.
          * Broad diffused directional key illumination with soft wraparound fill, clean natural specular catchlights in pupils, and smooth background depth-of-field falloff.\` : \`
        - [COMMERCIAL STUDIO OPTICS (PRESERVATION OFF)]:
          * Professional prime lens optics (85mm-100mm macro/portrait prime lens), tack-sharp focus across the hero subject and label, clean directional studio key and fill illumination, authentic physical contact shadows, and natural creamy depth-of-field bokeh.\`}`;

const target3 = `        "preserve exact reference product packaging",
        "no copyright elements"`;

const replacement3 = `        "preserve exact reference product packaging",
        "preserve exact reference human facial identity",
        "preserve exact reference facial identity",
        "face distortion,",
        "no copyright elements"`;

if (!content.includes(target1)) throw new Error("target1 not found");
if (!content.includes(target2)) throw new Error("target2 not found");
if (!content.includes(target3)) throw new Error("target3 not found");

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);

// Also update extractPromptParts splitMarkers if present
content = content.replace(
  `    "preserve exact reference product packaging",
    "no copyright elements"`,
  `    "preserve exact reference product packaging",
    "preserve exact reference human facial identity",
    "preserve exact reference facial identity",
    "face distortion,",
    "no copyright elements"`
);

fs.writeFileSync('services/geminiService.ts', content);
console.log('Update completed successfully');
