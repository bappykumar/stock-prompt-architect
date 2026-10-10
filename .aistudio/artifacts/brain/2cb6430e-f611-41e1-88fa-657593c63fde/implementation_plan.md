# Quantum Orbital Run Button Animation Architecture

Upgrading the primary "Run Architect" action button with a unified quantum orbital motion system—featuring synchronized energy particle streams, quantum shimmer border reflections, and a high-impact completion flash that seamlessly harmonizes with the diagnostic card and overall developer studio aesthetic.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications were confirmed through the interactive design review and form the foundation of this upgrade:

- **Confirmed Decision 1 (Active Generating State)**: Quantum orbital ring with synchronized particle energy stream replacing legacy wave paths.
- **Confirmed Decision 2 (Idle & Hover State)**: Subtle quantum shimmer border with glowing hover lift and specular rim dynamics.
- **Confirmed Decision 3 (Completion & Synthesis State)**: Quantum flash expansion with glowing checkmark and status label feedback.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the prompt generation trigger from an isolated sine-wave button into an interconnected quantum energy mechanism. When clicked, the button's boundary becomes a live particle conduit with an orbiting quantum ring, transitioning upon completion into an emerald-luminescent flash before settling gracefully back into idle.
- **Target Audience / Persona**: Engineers, prompt designers, and power users executing multi-model prompt transformations who require immediate, tactile, and visually captivating feedback during asynchronous AI generation.
- **Key Value**: Synchronizes visual language across the entire application—tying the button's micro-interactions directly to the Quantum Orbital Core inside the diagnostic dialog for a cohesive, luxury developer experience.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Idle State**: Pristine frosted glass pill button with subtle specular rim light (`h-[1.5px]`), crisp typography, and an energetic sparkle icon.
2. **Hover / Focus**: A subtle quantum shimmer sweeps along the border perimeter (`border-blue-500/40`), paired with a slight elevation lift (`-translate-y-0.5`) and an intensified ambient cyan-indigo glow.
3. **Execution Trigger & Loading Phase**:
   - The label gracefully shifts downward and dissolves.
   - A dual-track quantum orbital ring activates in the center with counter-rotating nodes and a linear energy stream flowing through the pill capsule.
   - The button border shifts to a high-precision rotating conic beam matching the orbital speed of the diagnostic card.
4. **Completion Flash Phase**:
   - Upon synthesis completion, a radial quantum flash expands across the pill surface.
   - An emerald checkmark badge springs into view accompanied by the label "SYNTHESIZED" in high-contrast legible typography.
   - Smooth 1.2s dwell before easing back to the ready-to-run idle state.

#### Visual Identity & Theme
- **Color Palette**:
  - Deep Space Canvas & Surface: `slate-900 / #0b1329` (Dark), `white/95` (Light)
  - Quantum Energy Accents: Cyan (`#38bdf8`), Electric Indigo (`#6366f1`), Royal Blue (`#3b82f6`)
  - Synthesis Success: Emerald (`#10b981`), Mint Glow (`#34d399`)
- **Typography & Hierarchy**:
  - Button Action: Strict uppercase geometric sans (`tracking-[0.14em]`, `font-black`, `text-[13px]`)
  - Optical Compensation: Fine subpixel letter-spacing with tabular numeral support for any timing telemetry.
- **Interactive Feedback & Motion**:
  - Micro-interactions settle within $\le 200\text{ms}$ with smooth bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Compositor-only hardware accelerated transforms (`transform`, `opacity`, `filter`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Vector SVG Particle Engine vs. Canvas Rendering**
  - *Chosen Approach*: Inline SVG vector paths with CSS hardware-accelerated keyframe transforms (`will-change: transform`).
  - *Why*: Guarantees crisp rendering across high-DPI displays without CPU canvas drawing overhead or extra bundle dependencies.
  - *Alternatives Considered*: Canvas particle simulator (rejected due to excessive battery drain and canvas context switching).
- **Decision 2: Synchronization with the Diagnostic Card**
  - *Chosen Approach*: Harmonize orbital rotational periods (2.4s and 4.2s) with `QuantumOrbitalCore.tsx` so both widgets appear driven by the same simulated reactor.
  - *Why*: Eliminates visual discord between the active button and floating dialog.

---

### 4. Technical Architecture & Motion Strategy *(Technical Reference)*

#### System Component & Motion Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx Generation Flow                         │
│                                                                        │
│  [ isGenerating: true / false ] ───► [ apiTrackerState: status ]       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│     RunArchitectButton.tsx    │       │     QuantumOrbitalCore.tsx    │
│                               │       │                               │
│  ┌─ Idle & Shimmer Border ──┐ │       │  ┌─ Concentric Rings ───────┐ │
│  │ Specular rim + hover lift│ │       │  │ Slow CCW & rapid CW      │ │
│  └──────────────────────────┘ │       │  └──────────────────────────┘ │
│  ┌─ Active Generating State ┐ │       │  ┌─ Pulsing Neural Center ──┐ │
│  │ Dual orbital ring core   │ │       │  │ Concentric energy core   │ │
│  │ Stream particles [CSS]   │ │       │  └──────────────────────────┘ │
│  └──────────────────────────┘ │       │  ┌─ Diagnostic Card Scanner ┐ │
│  ┌─ Success Flash State ────┐ │       │  │ Sweeping laser beam      │ │
│  │ Emerald radial bloom     │ │       │  └──────────────────────────┘ │
│  └──────────────────────────┘ │       └───────────────────────────────┘
└───────────────────────────────┘
```

#### Motion Transitions & State Lifecycles

| Phase | Duration | Visual Mechanism | Key CSS Classes / Keyframes |
| :--- | :--- | :--- | :--- |
| **Idle** | Continuous | Specular top edge + subtle border sheen | `transition-all duration-300`, `hover:-translate-y-0.5` |
| **Hover** | 200ms | Quantum shimmer beam along perimeter | `hover:shadow-[0_12px_32px_rgba(59,130,246,0.22)]` |
| **Generating** | Infinite | Synchronized micro-orbital core & stream particles | `@keyframes quantum-button-orbit`, `@keyframes quantum-stream` |
| **Success** | 1200ms | Radial scale flash expansion + emerald badge | `@keyframes quantum-success-flash`, `scale-100 opacity-100` |
| **Reset** | 60ms | Seamless translation back into idle position | `translateY(-24px) -> translateY(0)` |

---

### 5. Implementation Roadmap

1. **Step 1: CSS Keyframes for Quantum Stream & Button Orbit**
   - Add `@keyframes quantum-button-orbit-cw`, `@keyframes quantum-button-orbit-ccw`, and `@keyframes quantum-stream-flow` in `index.html`.
2. **Step 2: Update `RunArchitectButton.tsx`**
   - Replace the horizontal sine-wave SVG inside the button capsule with the synchronized quantum orbital ring and high-velocity energy stream particles.
   - Add the quantum border shimmer effect on hover and active states.
   - Upgrade the success phase with the emerald quantum flash expansion.
3. **Step 3: Verification & Compilation**
   - Test idle, hover, loading, and synthesis completion states.
   - Run `compile_applet` to confirm error-free TypeScript execution.
