# Automated Bulk Image Batch Processing Engine (Folder & Multi-Image Pipeline)

A robust, hands-free automated pipeline enabling creators to select an entire folder or multiple images (10, 50, 100+ images) and autonomously generate production-grade commercial stock photography prompts. For each image, the engine autonomously runs multimodal vision analysis (Smart Refinement), extracts photographic & commercial parameters, constructs optimized prompt architecture, and live-streams results directly into workspace cards with intelligent rate-limiting, auto-cooldown, and error circuit-breakers.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on user feedback:
> - **Input Flexibility**: Both entire folder selection (`webkitdirectory`) and multi-image manual selection (`multiple`) are supported seamlessly.
> - **Queue Execution**: Sequential (1-by-1) pipeline with configurable safety cooldown intervals (2-3s default) and smart exponential backoff on 429 rate limits to prevent AI overload and ensure 100% completion reliability.
> - **Live Output Stream**: Generated prompts stream directly into the active workspace cards in real-time as each image finishes, allowing immediate inspection and one-click copying.
> - **Zero Disruption to Single Mode**: Existing single-image drag-and-drop / paste / review workflow remains completely untouched and functional.

---

## 1. Overview & Core Concept

### What It Does
Empowers microstock and commercial photographers, 3D artists, and AI prompt engineers to feed entire directories of photos or illustrations into Prompt Master. The system processes the queue headlessly:
1. Dequeues image $N$.
2. Analyzes subject, style, lighting, camera optics, and commercial mood via Gemini Multimodal Vision.
3. Automatically blends visual insights with user-locked workspace parameters (or generates fresh dynamic settings).
4. Synthesizes high-conversion commercial prompts tailored for Adobe Stock, Freepik, and Midjourney.
5. Injects the prompt card into the workspace feed immediately.
6. Pauses for a smart safety cooldown before pulling image $N+1$.

### Target Audience & Value
- **Microstock Contributors & Digital Studios**: Eliminates hours of repetitive single-image prompt drafting for large photo shoots (fashion series, product shoots, architectural portfolios).
- **Commercial Efficiency**: Converts raw reference directories into structured, keyword-rich prompt datasets with zero manual intervention required per image.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR: Smart Refinement Panel                                       │
│  [ Single Mode ]  │  [ Bulk Batch Mode ]  ◄── Toggle Tabs              │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  📁 Drop Folder or Select Files                                  │  │
│  │  "Select Folder" (webkitdirectory)  │  "Select Files" (multiple) │  │
│  │  Supported: JPG, PNG, WEBP  •  Queue Limit: 150 items             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  QUEUE SUMMARY (When Loaded)                                           │
│  • 48 Images Queued (e.g., /autumn_collection/*)                       │
│  • Cooldown Interval: [ 2.5s ]  •  Prompts per Image: [ 1 ]            │
│  • Lock Existing Sidebar Parameters: [ Toggle ON/OFF ]                 │
│                                                                        │
│  [ START BATCH ARCHITECT (48 Images) ]  ◄── Flagship Glass CTA          │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Upload & Inspection**:
   - The user selects a folder or selects 20+ image files at once.
   - A sleek queue summary displays total detected images, estimated processing time, and thumbnail reel with an option to remove specific images or clear the queue.
2. **Headless Execution & Live Control**:
   - Clicking **Start Batch Architect** collapses into a compact floating **Batch Progress HUD** in the workspace.
   - Displays real-time progress: `[Processing 7/48 • editorial_portrait.jpg]`, current elapsed time, and a live progress ring/bar.
   - Interactive control buttons: **Pause**, **Resume**, and **Cancel Batch**.
3. **Smart Cooldown & AI Rest Indicator**:
   - When transitioning between images or if an API quota warning (HTTP 429) is caught, the HUD dynamically displays:
     `[AI Safety Cooldown: Resting for 4s to prevent quota throttling...]`
   - Smoothly resumes without losing progress or dropping failed items.
4. **Live Workspace Card Streaming**:
   - As each image finishes, a prompt card pops into the main workspace feed with an entrance animation, tagged with its source image name and thumbnail badge.

### Visual Styling (Apple Liquid Glass Architecture)
- **Batch Dropzone**: Frosted visionOS glass tile with dashed specular borders (`border-dashed border-slate-300 dark:border-white/15 bg-white/40 dark:bg-white/[0.02]`).
- **Batch Progress HUD**: Floats pinned at the top-right or docked above cards with authentic Liquid Glass specular top rim, dark/light theme adaptation, and glowing emerald/blue pulse indicators.
- **Card Association**: Each generated prompt card in the workspace gains a subtle badge indicating `[Batch Source: photo_12.jpg]` with a small preview popup on hover.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Client-Side Queue Engine vs. Server Storage
- **Chosen Approach**: Pure client-side streaming queue with lazy base64 memory extraction. Images are kept as lightweight File object references and only converted to base64 at the exact moment of their individual API call, then immediately dereferenced for garbage collection.
- **Why**: Eliminates server file storage costs, zero user privacy exposure, and prevents browser tab memory leaks even with 100+ images.
- **Alternative Considered**: Uploading all images to an Express server or Firebase Storage. Rejected because it incurs bandwidth overhead, cloud storage billing, and introduces upload latency before generation even begins.

### Decision 2: Sequential Queue with Auto-Cooldown vs. Parallel Requests
- **Chosen Approach**: Sequential 1-by-1 processing with a configurable 2-3 second safety pause between images, backed by exponential backoff (circuit breaker).
- **Why**: Multimodal vision calls consume significant token and RPM limits on standard Gemini API keys. Parallel firing (e.g., 5 at once) quickly triggers HTTP 429 Rate Limit errors and quota exhaustion. Sequential processing ensures 100% completion rate without failing halfway.

### Decision 3: Dual Selection Trigger (Folder + Multi-File)
- **Chosen Approach**: Provide dual buttons: "Select Folder" (utilizing `webkitdirectory directory`) and "Select Images" (standard file picker with `multiple`).
- **Why**: `webkitdirectory` allows picking complete local asset folders in one click, while `multiple` lets users cherry-pick mixed files from different desktop directories.

---

## 4. Technical Architecture & Data Strategy

### System Component & Pipeline Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INPUT LAYER                                │
│   Folder Selector (webkitdirectory)   OR   Multi-File (multiple)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ File[]
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BATCH QUEUE CONTROLLER                            │
│  State: queue: File[], currentIndex: number, status: 'idle'|'active'|  │
│         'paused'|'cooldown', results: BatchItem[]                      │
│                                                                        │
│  Controls: start() | pause() | resume() | cancel() | retryFailed()     │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ 1. Dequeue Next File            ▲
                   ▼                                 │ 4. Safety Cooldown
┌──────────────────────────────────────┐             │    (2.5s delay)
│ STEP 1: Vision Refinement (Headless) │             │
│ • Lazy base64 conversion             │             │
│ • analyzeReferenceAndSuggestSettings │             │
│ • Extract Subject/Lighting/Optics    │             │
└──────────────────┬───────────────────┘             │
                   │ Extracted Options               │
                   ▼                                 │
┌──────────────────────────────────────┐             │
│ STEP 2: Stock Prompt Synthesis       │             │
│ • generatePrompts(mergedOptions)     │             │
│ • Commercial stock keyword injection │             │
└──────────────────┬───────────────────┘             │
                   │ Generated Prompt Batch          │
                   ▼                                 │
┌────────────────────────────────────────────────────┴───────────────────┐
│                    STREAMING OUTPUT HANDLER                            │
│  • Prepend/Append Prompt to batches State                              │
│  • Update Stats (total, pending, copied)                               │
│  • Update Batch HUD Progress (N / Total)                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **State Store (`BatchState`)**:
   - `queue: Array<{ id: string; file: File; status: 'pending'|'processing'|'completed'|'error'; promptText?: string; error?: string }>`
   - `isRunning: boolean`, `isPaused: boolean`, `isCoolingDown: boolean`
   - `cooldownSeconds: number` (Default: 2.5s, adjustable in settings)
   - `currentProcessingIndex: number`
2. **Execution Hook (`useBatchProcessor`)**:
   - Manages the asynchronous loop.
   - Intercepts API rate-limit errors (e.g. 429 / RESOURCE_EXHAUSTED): automatically initiates a 10-second rest countdown before retrying the same item up to 3 times.
   - Safe cleanup on component unmount or cancellation.
3. **UI Integration**:
   - In `App.tsx`: Toggle between `Single Image` and `Bulk Batch` inside the existing Smart Refinement card.
   - Pinned `BatchProgressHUD`: Shows current item thumbnail, filename, speed, and pause/abort controls.
   - Main Canvas: Real-time live cards render automatically with full copy, expand, and export support.
