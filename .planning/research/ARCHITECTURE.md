# Architecture Research

**Domain:** Browser-based computer vision measurement app (foot scanning)
**Researched:** 2026-03-21
**Confidence:** HIGH (core patterns well-established; iframe/Shopify embed MEDIUM)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Shopify Storefront                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Custom Liquid Snippet: <iframe src="https://scanner.vercel.   │ │
│  │  app/scan" width="100%" height="700px" allow="camera" />       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                   Next.js App (Vercel)                               │
│                                                                      │
│  ┌────────────┐  ┌─────────────────────────────────────────────┐    │
│  │  Landing   │  │            /scan  (Client Component)        │    │
│  │  Page      │  │                                             │    │
│  │  (SSR)     │  │  ┌──────────┐  ┌─────────┐  ┌──────────┐  │    │
│  └────────────┘  │  │  Step    │  │ Camera  │  │  Lead    │  │    │
│                  │  │  Wizard  │  │ Capture │  │  Form    │  │    │
│                  │  │  State   │  │         │  │          │  │    │
│                  │  └────┬─────┘  └────┬────┘  └────┬─────┘  │    │
│                  │       └─────────────┴─────────────┘        │    │
│                  │                    ▼                        │    │
│                  │      ┌─────────────────────────┐           │    │
│                  │      │   CV Worker Bridge       │           │    │
│                  │      │   (postMessage facade)   │           │    │
│                  │      └─────────────┬────────────┘           │    │
│                  └────────────────────┼────────────────────────┘    │
│                                       │ postMessage                  │
│                  ┌────────────────────▼────────────────────┐        │
│                  │         opencv.worker.ts                 │        │
│                  │   (Web Worker — off main thread)         │        │
│                  │                                          │        │
│                  │  importScripts(opencv.js WASM)           │        │
│                  │  → A4 detection (HSV + contour)          │        │
│                  │  → Pixel-per-mm calibration              │        │
│                  │  → Foot segmentation (k-means)           │        │
│                  │  → Canny edge + contour analysis         │        │
│                  │  → Measurement extraction                │        │
│                  └──────────────────────────────────────────┘        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    API Route: /api/measurements              │    │
│  │            (server-side Supabase insert, no secrets exposed) │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase                                     │
│   measurements table: id, email, phone, current_size, foot_length,  │
│   foot_width, arch_length, instep_height, toe_box_width,            │
│   heel_width, recommended_size, raw_image_url, created_at           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Step Wizard (ScanFlow) | Owns `step` state, orchestrates screen transitions | `useReducer` in `'use client'` component |
| CameraCapture | getUserMedia stream, viewfinder UI, triggers photo | `<video>` + canvas `drawImage()`, environment-facing camera |
| CVWorkerBridge | Facade over Web Worker: send ImageData, receive results | Class with `postMessage` + Promise queue |
| opencv.worker.ts | All OpenCV computation — A4 detection, calibration, measurement | Web Worker, `importScripts` loads WASM |
| MeasurementDisplay | Shows extracted measurements, lets user accept/retake | Pure display component |
| LeadForm | Collects email, phone, shoe size preference | React Hook Form, submits to `/api/measurements` |
| `/api/measurements` | Server-side Supabase insert, validates payload | Next.js Route Handler, server Supabase client |
| Supabase | Persists measurement records + contact info | Postgres via `@supabase/ssr` |
| Shopify Liquid snippet | Wraps app in `<iframe>` | Static Liquid snippet, `allow="camera"` attribute required |

## Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page (SSR, SEO-friendly)
│   ├── scan/
│   │   └── page.tsx              # Scanner entrypoint ('use client')
│   └── api/
│       └── measurements/
│           └── route.ts          # POST handler — server Supabase insert
├── components/
│   ├── scan/
│   │   ├── ScanFlow.tsx          # Wizard orchestrator (useReducer)
│   │   ├── StepInstructions.tsx  # "Place foot on A4" guidance
│   │   ├── CameraCapture.tsx     # getUserMedia + photo trigger
│   │   ├── ProcessingOverlay.tsx # Spinner while worker runs
│   │   ├── MeasurementDisplay.tsx # Results + accept/retake
│   │   └── LeadForm.tsx          # Email, phone, size preference
│   └── ui/                       # Brand-aligned Tailwind primitives
├── lib/
│   ├── cv/
│   │   ├── worker-bridge.ts      # CVWorkerBridge class (postMessage facade)
│   │   └── size-lookup.ts        # Measurement → US/EU/UK size table
│   └── supabase/
│       ├── client.ts             # Browser Supabase client (SSR package)
│       └── server.ts             # Server Supabase client (for API route)
├── workers/
│   └── opencv.worker.ts          # Web Worker: all OpenCV processing
└── public/
    └── opencv/
        ├── opencv.js             # Bundled locally — not CDN
        └── opencv.wasm           # ~5-9MB WASM binary
```

### Structure Rationale

- **workers/**: Isolated from app/ — Web Workers can't import from Next.js module graph, need self-contained files with `importScripts`
- **lib/cv/**: Keeps worker communication logic separate from UI components; components call `workerBridge.process(imageData)` and get `MeasurementResult` back
- **public/opencv/**: OpenCV WASM served as static asset — avoids Vercel's WASM bundling edge cases and enables reliable CDN caching with `Cache-Control: max-age=31536000`
- **api/measurements/**: Server-side insert keeps Supabase service key off the client entirely

## Architectural Patterns

### Pattern 1: Web Worker as Processing Boundary

**What:** All OpenCV operations run inside a dedicated Web Worker. The main thread never calls `cv.*` functions directly.

**When to use:** Always — OpenCV.js is computationally heavy. A single contour analysis call can take 200-800ms and will freeze the UI if run on the main thread.

**Trade-offs:** Slightly more setup complexity; Web Workers cannot access the DOM; ImageData must be transferred (not shared) unless using SharedArrayBuffer (which requires cross-origin isolation headers).

**Example:**
```typescript
// lib/cv/worker-bridge.ts
export class CVWorkerBridge {
  private worker: Worker
  private pending = new Map<string, (result: MeasurementResult) => void>()

  constructor() {
    this.worker = new Worker('/workers/opencv.worker.js')
    this.worker.onmessage = (e) => {
      const { id, result } = e.data
      this.pending.get(id)?.(result)
      this.pending.delete(id)
    }
  }

  async process(imageData: ImageData): Promise<MeasurementResult> {
    return new Promise((resolve) => {
      const id = crypto.randomUUID()
      this.pending.set(id, resolve)
      // Transfer ownership of the ImageData buffer — zero copy
      this.worker.postMessage({ id, imageData }, [imageData.data.buffer])
    })
  }
}
```

```typescript
// workers/opencv.worker.ts
self.importScripts('/opencv/opencv.js')

let cvReady = false
// @ts-ignore
self.cv.onRuntimeInitialized = () => { cvReady = true }

self.onmessage = async (e: MessageEvent) => {
  if (!cvReady) { /* poll or queue */ }
  const { id, imageData } = e.data
  const result = runMeasurementPipeline(imageData)
  self.postMessage({ id, result })
}
```

### Pattern 2: useReducer Step Machine

**What:** A single `useReducer` in `ScanFlow.tsx` owns the entire scan session. Steps are explicit states; events drive transitions.

**When to use:** Any multi-step flow with branching (retake, error, back). Avoids scattered `useState` that gets out of sync.

**Trade-offs:** Slightly more boilerplate than `useState`; easy to test reducer logic independently.

**Example:**
```typescript
type ScanStep =
  | 'instructions'
  | 'camera'
  | 'processing'
  | 'results'
  | 'lead_form'
  | 'complete'

type ScanAction =
  | { type: 'PHOTO_TAKEN'; imageData: ImageData }
  | { type: 'PROCESSING_COMPLETE'; result: MeasurementResult }
  | { type: 'RETAKE' }
  | { type: 'ACCEPT_MEASUREMENTS' }
  | { type: 'FORM_SUBMITTED' }

function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'PHOTO_TAKEN':
      return { ...state, step: 'processing', imageData: action.imageData }
    case 'PROCESSING_COMPLETE':
      return { ...state, step: 'results', measurements: action.result }
    case 'RETAKE':
      return { ...state, step: 'camera', measurements: null }
    // ...
  }
}
```

### Pattern 3: OpenCV CV Pipeline Sequence

**What:** Fixed sequence inside the worker: A4 detection first, then foot segmentation, then measurement extraction. Each step depends on the previous.

**When to use:** Always in this domain — you must establish pixel-per-mm before measuring anything.

**Trade-offs:** Pipeline must complete end-to-end; partial results aren't useful. If A4 detection fails, abort early with a user-facing error ("A4 paper not detected — ensure full sheet is visible").

**Sequence:**
```
ImageData
  → cv.Mat (via cv.matFromImageData)
  → HSV conversion (cv.cvtColor)
  → White region detection → A4 contour → pixel-per-mm ratio
  → Gaussian blur (cv.GaussianBlur, 5x5 kernel)
  → Grayscale + Otsu threshold OR HSV skin segmentation
  → Foot contour (cv.findContours + RETR_EXTERNAL)
  → cv.minAreaRect for bounding box → length, width
  → Specific contour point analysis → heel width, toe box width
  → All pixel distances × pixel-per-mm → mm values
  → mm values → US/EU/UK size lookup table
  → MeasurementResult object → postMessage back to main thread
```

### Pattern 4: Server-Side Supabase Insert

**What:** Lead form POSTs to `/api/measurements` (Next.js Route Handler). Route Handler uses server Supabase client with service role key. Browser client is never given write credentials.

**When to use:** Always for any data write. Keeps service key off the client bundle.

**Trade-offs:** One extra network hop vs direct browser insert; prevents any user from bypassing validation or using your service key.

**Example:**
```typescript
// app/api/measurements/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.json()
  // validate with zod
  const supabase = createClient()
  const { error } = await supabase.from('measurements').insert(body)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true }, { status: 201 })
}
```

## Data Flow

### Scan Session Flow

```
User opens /scan (or iframe)
    ↓
ScanFlow renders — step: 'instructions'
    ↓
User taps "Start Scan" → step: 'camera'
    ↓
CameraCapture
  getUserMedia({ video: { facingMode: 'environment' } })
  → <video> element displays live feed
  User taps "Take Photo"
  → canvas.drawImage(video) → ctx.getImageData()
  → dispatch({ type: 'PHOTO_TAKEN', imageData })
    ↓
step: 'processing' — ProcessingOverlay shown
    ↓
CVWorkerBridge.process(imageData)
  → postMessage to opencv.worker
  → worker runs full CV pipeline (~500ms-2s)
  → postMessage back with MeasurementResult
  → dispatch({ type: 'PROCESSING_COMPLETE', result })
    ↓
step: 'results' — MeasurementDisplay shown
  User can RETAKE → back to 'camera'
  User taps "These look right" → step: 'lead_form'
    ↓
LeadForm: email + phone + current size
  → POST /api/measurements  (measurements + contact info)
  → server inserts to Supabase
  → dispatch({ type: 'FORM_SUBMITTED' })
    ↓
step: 'complete' — Thank you screen
  (optional: postMessage to parent if in iframe)
```

### Iframe Communication Flow (Shopify)

```
Shopify page loads
  → <iframe src="https://scanner.app/scan" allow="camera" />

Scanner completes
  → window.parent.postMessage({ type: 'SCAN_COMPLETE', email }, '*')

Shopify page (if listening)
  → window.addEventListener('message', handleScanResult)
  → Can trigger thank-you banner, redirect to product page, etc.

Dynamic height resize (optional):
  → Scanner: window.parent.postMessage({ type: 'RESIZE', height: document.body.scrollHeight }, '*')
  → Shopify: document.querySelector('iframe').style.height = event.data.height + 'px'
```

### State Ownership

```
Global (ScanFlow useReducer):
  - current step
  - captured imageData
  - MeasurementResult
  - submission status

Local (CameraCapture):
  - MediaStream ref
  - camera permission state

Persistent (Supabase):
  - completed measurement records
  - lead contact info
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is fine — all CV is client-side, Supabase free tier handles ~500MB easily |
| 1k-10k users | Supabase Pro for more connections; add rate limiting to `/api/measurements`; consider CDN for opencv.js |
| 10k+ users | CV stays client-side regardless; Supabase scales with Postgres replicas; add queue for email follow-up |

### Scaling Priorities

1. **First bottleneck:** Supabase free tier row limits (~500MB) — upgrade to Pro ($25/mo) early if traction grows
2. **Second bottleneck:** opencv.js WASM download (~5-9MB) on slow connections — pre-warm by loading worker eagerly at top of Instructions step, not at Camera step

## Anti-Patterns

### Anti-Pattern 1: Running OpenCV on the Main Thread

**What people do:** Import OpenCV.js directly in a React component and call `cv.findContours()` inline.
**Why it's wrong:** OpenCV operations block the main thread for 500ms-2s. The camera viewfinder freezes, the UI stops responding, iOS Safari may terminate the tab as unresponsive.
**Do this instead:** Always use the Web Worker pattern via CVWorkerBridge. Main thread only sends ImageData and receives MeasurementResult.

### Anti-Pattern 2: Loading OpenCV from CDN at Runtime

**What people do:** Dynamically inject a `<script src="https://docs.opencv.org/4.x/opencv.js">` at runtime.
**Why it's wrong:** External CDN introduces 1-3s latency on first load, creates a hard runtime dependency on OpenCV's CDN uptime, and blocks the WASM module initialization chain unpredictably.
**Do this instead:** Copy `opencv.js` and `opencv.wasm` into `public/opencv/` at build time. Serve them as static assets with aggressive `Cache-Control` headers. Users only download once.

### Anti-Pattern 3: Passing Full Image Through Supabase

**What people do:** Store the captured JPEG/PNG in Supabase Storage and process later server-side.
**Why it's wrong:** Images are 2-4MB each, inflating storage costs quickly. More importantly, privacy — you're storing photos of users' bare feet without explicit consent.
**Do this instead:** Process entirely client-side in the Web Worker, send only the numeric measurement results and contact info to Supabase. No image storage needed for MVP.

### Anti-Pattern 4: Single Supabase Client for Both Server and Client

**What people do:** Create one Supabase client and import it everywhere.
**Why it's wrong:** The `@supabase/ssr` package requires separate client configurations for server components (cookie-based) vs browser (localStorage-based). Using the wrong client causes stale auth tokens and security issues.
**Do this instead:** Two separate files: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server). For this project auth isn't needed, but the server client should still use service role key for the API route write path.

### Anti-Pattern 5: Hardcoding iframe Height in Shopify

**What people do:** Set a fixed `height="600px"` on the iframe in the Liquid snippet.
**Why it's wrong:** Different steps have different content heights — Instructions is short, Results with measurements is tall, Lead Form is medium. Fixed height causes scrollbars or clipped content.
**Do this instead:** Start with a generous default height (700px) that works for the tallest step. Optionally add the postMessage resize pattern if exact fit is needed. Don't fight Shopify's iframe sandbox restrictions.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase | Server-side via `/api/measurements` Route Handler using `@supabase/ssr` server client | Service key in `SUPABASE_SERVICE_ROLE_KEY` env var, never exposed to browser |
| OpenCV.js WASM | Static file in `public/opencv/`, loaded via `importScripts` inside Web Worker | ~5-9MB download; load eagerly at Instructions step so it's ready by Camera step |
| Shopify | `<iframe>` in Custom Liquid section, `allow="camera"` attribute required | postMessage for SCAN_COMPLETE event; height either fixed or dynamic via resize messages |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ScanFlow ↔ CameraCapture | React props + callback | CameraCapture calls `onPhotoTaken(imageData)` |
| ScanFlow ↔ CVWorkerBridge | Async function call (returns Promise) | Bridge encapsulates all Worker messaging |
| Main Thread ↔ opencv.worker | postMessage + transferable ArrayBuffer | ImageData.data.buffer transferred (zero-copy) for performance |
| LeadForm ↔ API Route | `fetch POST /api/measurements` | JSON body; API route validates with Zod before insert |
| API Route ↔ Supabase | `@supabase/ssr` server client | Standard Postgres insert; no RLS needed for simple lead capture |
| Scanner App ↔ Shopify | `window.parent.postMessage` | Fired on SCAN_COMPLETE; Shopify page optionally listens |

## Build Order (Dependency Graph)

The following order minimizes blocked work and enables testing at each stage:

```
1. OpenCV Worker + CV Pipeline (workers/opencv.worker.ts + lib/cv/)
   └── Can be tested standalone with a test ImageData before any UI exists

2. CVWorkerBridge (lib/cv/worker-bridge.ts)
   └── Wraps worker; testable in isolation

3. CameraCapture (components/scan/CameraCapture.tsx)
   └── Requires HTTPS/localhost for getUserMedia — test on real device early

4. ScanFlow + Step Wizard (components/scan/ScanFlow.tsx)
   └── Wires CameraCapture → CVWorkerBridge → state machine
   └── Can stub MeasurementResult to test UI flow without real CV

5. MeasurementDisplay + LeadForm
   └── Pure UI; no dependencies on CV or camera

6. API Route + Supabase (app/api/measurements/, lib/supabase/)
   └── Test with curl before wiring to LeadForm

7. /scan page assembly
   └── Composes all components; full happy path testable

8. Landing page (app/page.tsx)
   └── SSR, SEO, links to /scan

9. Shopify iframe snippet
   └── Verify `allow="camera"` works on iOS Safari in Shopify context last
```

## Sources

- [OpenCV.js Web Worker architecture — DEV Community](https://dev.to/aralroca/opencv-directly-in-the-browser-webassembly-webworker-423i)
- [opencv-js-webworker reference implementation — GitHub](https://github.com/vinissimus/opencv-js-webworker)
- [OpenCV.js Tutorials (official)](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [OpenCV.js Contours tutorial](https://docs.opencv.org/4.x/d0/d43/tutorial_js_table_of_contents_contours.html)
- [@techstark/opencv-js npm package (v4.12.0)](https://github.com/TechStark/opencv-js)
- [Supabase + Next.js SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Managing Supabase Auth Across Server & Client Components](https://dev.to/jais_mukesh/managing-supabase-auth-state-across-server-client-components-in-nextjs-2h2b)
- [Next.js WASM in App Router — community issues](https://github.com/vercel/next.js/issues/55537)
- [Shopify iframe in theme app extensions](https://community.shopify.com/t/is-it-allowed-to-use-iframes-in-theme-app-extensions/296344)
- [Receiving messages from iframe in App Embed Block](https://community.shopify.com/t/receiving-messages-from-iframe-in-app-embed-block/300086)
- [OptiFit: CV-based foot measurement paper — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9739363/)
- [getUserMedia camera capture — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos)

---
*Architecture research for: browser-based foot scanning CV app (Next.js + OpenCV.js + Supabase + Shopify embed)*
*Researched: 2026-03-21*
