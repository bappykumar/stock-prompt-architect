# Product Preservation & Brand Color Harmonization

Seamlessly generate commercial studio and lifestyle product prompts where referenced real-world products retain authentic packaging, label typography, and original colors, while the brand's referenced color palette is dynamically extracted and harmonized across the scene backdrop, props, wardrobe, and ambient lighting.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product behaviors have been aligned based on your feedback:

- **Confirmed: Reference-Driven Brand Color Palette (Zero Manual Data Entry)**:
  - Users do not need to enter hex codes or configure color swatches in the tool.
  - When *Product Preservation Mode* is toggled ON, the AI image generation prompt instructs Midjourney / Flux / SD to automatically extract and sample the brand color palette directly from the attached reference images (product packaging, logo, and brand color guide/swatches).
- **Confirmed: Strategic Color Application Scope**:
  - The brand color palette is applied to the **scene backdrop**, **studio props**, **model wardrobe/attire**, and **ambient lighting accents / rim highlights**.
- **Confirmed: Product Color Integrity & Lighting Adjustment**:
  - The physical product itself retains its original authentic colors, packaging material, and label typography. It is never recolored or altered into unrelated hues.
  - The product is adjusted for physically accurate lighting, contact shadows, and ambient reflections to blend naturally into the environment without appearing like an artificial digital cutout.
- **Confirmed: Commercial Cleanliness**:
  - Complete elimination of extraneous text, random watermarks, or studio gear in the environment, while authentic typography on the hero product remains pristine.

---

### 1. Overview & Core Concept

- **What It Does**: Enhances the existing **Product Preservation Mode** inside *Advanced Settings* to generate comprehensive multi-layer prompts that:
  1. Tell the image generator to treat the attached image as an exact product and brand color reference.
  2. Keep the physical product geometry, materials, labels, and exact colors 100% faithful to the reference.
  3. Extract the brand's signature colors from the reference assets and organically distribute them across the scene environment (cyclorama/backdrop walls, podium/tabletop surfaces, interior styling, model clothing, and ambient rim light tones).
  4. Blend hands, skin contact, and realistic lighting so the product looks naturally held or placed in a high-end commercial photoshoot.
- **Target Audience**: Brand marketers, e-commerce designers, creative directors, and Midjourney/Flux prompt engineers producing real product mockups.
- **Key Value**: Eliminates color clashing and manual prompt drafting while ensuring the real product remains the hero, perfectly on-brand and physically integrated.

---

### 2. User Experience & Visual Design

#### User Journey
1. **Open Advanced Settings**: The user clicks "Advanced Settings" in the prompt builder.
2. **Toggle Product Preservation Mode**: Under *Optics & Technicals*, the user toggles on **Product Preservation Mode**.
3. **Helper Note & Visual Indication**:
   - The card clearly highlights: *"Strict packaging & typography lock. Prompts will instruct AI generators to sample the brand color palette from your attached references (product/logo/swatches) and harmonize them across backdrop, props, wardrobe, and ambient light accents without altering the product's authentic colors."*
4. **Generate / Re-Roll**: The user generates the prompt. The resulting prompt explicitly instructs the image generator to extract the brand color palette from the reference and harmonize the environment, backdrop, wardrobe, and lighting around the preserved hero product.

#### Visual Hierarchy & Styling
- **Card Styling**: Consistent slate dark-mode styling with emerald/cyan accent glows indicating high-fidelity preservation.
- **Badge Indicators**: Visual tags for *"Reference Lock Active"* and *"Brand Palette Harmonization"*.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Prompt-Driven Color Sampling vs. In-App Color Pickers
- **Chosen Approach**: Prompt-driven sampling where the prompt explicitly tells the generative model to pull palette tones directly from the reference image(s).
- **Why**: Image generators like Midjourney v6/v7 and Flux with IP-Adapter / Reference control take user-supplied reference images directly. Asking users to re-enter color codes in the web UI adds friction and fails to capture subtle tonal gradients that exist in actual brand guidelines.
- **Trade-off**: Requires clear, authoritative language in the system prompt so the image generator knows exactly where to apply those colors (backdrop, props, wardrobe) and where NOT to mutate them (the product itself).

#### Decision 2: Product Lighting Adaptation vs. Color Shift
- **Chosen Approach**: Allow photometric adaptation (ambient light bounce, specular highlights, contact shadows) while strictly locking pigment and label identity.
- **Why**: If a product has zero interaction with ambient light, it looks flat and fake. By distinguishing between *lighting adaptation* (allowed) and *product recoloring* (forbidden), the image attains photorealistic commercial quality.

---

### 4. Technical Architecture & Prompt Engineering Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (App.tsx)                 │
│  - Advanced Settings: Product Preservation Mode (Toggle)    │
│  - Clear description of Reference Lock & Brand Color Sync   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               State Layer (options: PromptOptions)          │
│  - productPreservation: boolean                             │
│  - Synced to localStorage & preset states                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Gemini Prompt Engine (services/geminiService.ts)   │
│                                                             │
│  1. NEGATIVE & SAFETY BLOCK:                                │
│     - Preserve authentic packaging, logos & brand typography│
│     - Banish extraneous text, fake UI, and watermark artifacts│
│                                                             │
│  2. PRODUCT PRESERVATION & BRAND PALETTE HARMONIZATION:      │
│     - [Section A]: Exact Packaging & Label Typography Lock  │
│     - [Section B]: Reference Brand Color Extraction         │
│     - [Section C]: Scene Application (Backdrop/Props/Attire)│
│     - [Section D]: Model & Hand Interaction Realism         │
│     - [Section E]: Environmental Photometric Blending       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Final Commercial AI Image Generation Prompt       │
│  (Ready for Midjourney, Flux, SD with image references)     │
└─────────────────────────────────────────────────────────────┘
```

#### Detailed Prompt Rules to Implement:
1. **Brand Color Palette Extraction Directive**:
   - Instruct the AI generator to analyze the attached reference image(s) (product, packaging, logo, or color swatches) and extract the primary and secondary brand color palette.
2. **Environmental & Wardrobe Color Mapping**:
   - Explicitly guide the distribution of these extracted brand colors:
     - **Backdrop**: Studio cyclorama, interior wall accents, or environmental tones aligned with brand colors.
     - **Props & Staging**: Pedestals, surfaces, textured fabrics, and supporting items tinted in complementary brand palette shades.
     - **Model Wardrobe**: If human models or hands are present, dress the model in clothing that complements the brand color scheme.
     - **Ambient Lighting Accents**: Subtle edge lighting, rim highlights, and ambient reflections tinted with harmonious brand accents.
3. **Hero Product Invariance**:
   - Strict rule that the hero product's original physical colors, typography, and packaging must remain authentic and un-mutated, receiving only realistic physical illumination from the scene.
