# Phase 1: CV Pipeline - Research

**Researched:** 2026-03-21
**Domain:** OpenCV.js Web Worker, camera capture (getUserMedia), EXIF normalization, A4 paper detection, perspective correction, foot contour measurement
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OpenCV.js Loading**
- Use `@techstark/opencv-js@4.12.0-release.1` npm package
- Copy opencv.js + opencv.wasm to `/public/cv/` via postinstall script (Turbopack cannot bundle WASM)
- Load via `importScripts()` inside the Web Worker
- Single-threaded WASM build (no SharedArrayBuffer headers needed)

**CV Pipeline Architecture**
- All CV processing runs in a dedicated Web Worker (prevents UI freeze on mobile)
- Worker receives ImageData via transferable buffer (zero-copy)
- Pipeline order: EXIF normalize → A4 detection → pixel-per-mm calibration → foot contour extraction → measurement calculation
- Every Mat object must be .delete()'d in try/finally blocks (WASM memory is not garbage collected)

**A4 Paper Detection**
- Convert to grayscale → Gaussian blur → Canny edge detection → findContours → filter for largest quadrilateral with ~1.414 aspect ratio
- Apply perspective correction (warpPerspective) to rectify angled shots before measuring
- Post-capture sanity check: detected paper dimensions must be within 5% of expected A4 ratio
- If A4 not detected, return error with guidance ("Make sure all 4 corners of the paper are visible")

**Foot Contour Extraction**
- After A4 calibration, mask out the paper region
- Convert remaining area to HSV → threshold for skin tone / dark sock
- Apply morphological operations (erode/dilate) to clean up contour
- Find largest contour as the foot
- Extract measurements from contour bounding box and geometry

**Measurement Calculation**
- Length: distance from heel (bottom of contour) to longest toe (top of contour) along the foot axis
- Width: widest perpendicular distance across the ball of the foot
- Arch length: curved distance along the medial (inner) edge from heel to ball
- Toe box width: width at the toe region (top 25% of contour)
- Heel width: width at the heel region (bottom 15% of contour)
- All measurements converted from pixels to mm using A4 calibration factor

**Camera Capture**
- getUserMedia with constraints: `{ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }`
- iOS Safari fix: add resolution hints to avoid ultra-wide lens regression on multi-lens iPhones
- Capture to canvas, extract ImageData, transfer to Worker
- EXIF orientation check and rotation BEFORE any CV processing

### Claude's Discretion
- All implementation details for the CV algorithms (threshold values, morphological kernel sizes, contour filtering parameters) are at Claude's discretion — tune for best accuracy
- Error handling and recovery strategies
- Test harness structure

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-01 | User can capture foot photo using phone camera via getUserMedia (iOS Safari + Android Chrome) | getUserMedia constraints documented; resolution hints for iOS ultra-wide confirmed; camera track stop pattern required |
| SCAN-02 | App detects A4 paper reference object and calibrates pixel-to-mm conversion (210mm x 297mm) | A4 contour detection pipeline fully researched; warpPerspective homography correction for angle compensation; 5% tolerance sanity check |
| SCAN-03 | App extracts foot contour using OpenCV.js (HSV conversion, Gaussian blur, segmentation, Canny edge detection) | HSV skin tone segmentation + morphological cleanup pipeline documented; fallback Otsu threshold also covered |
| SCAN-04 | App calculates foot length from contour against calibrated reference | minAreaRect + contour bounding box geometry; pixel-to-mm via A4 calibration factor |
| SCAN-05 | App calculates foot width from contour at widest point | Widest perpendicular distance scan across contour point set |
| SCAN-06 | App calculates arch length from contour geometry | Medial edge curve distance using contour point iteration |
| SCAN-07 | App calculates toe box width from contour near hallux region | Top 25% contour slice width measurement |
| SCAN-08 | App calculates heel width from contour at heel region | Bottom 15% contour slice width measurement |
| SCAN-09 | User can capture left foot and right foot separately (two scans) | Session state holds two independent MeasurementResult objects; worker is stateless per-call |
| SCAN-10 | App displays accuracy confidence indicator after calibration ("±Xmm accuracy") | Calibration residual from A4 corner detection quality; formula documented |
| SCAN-11 | User can retake/retry photo before processing | Retake flow requires Mat.delete() cleanup in finally block; memory leak prevention is the implementation risk |
| SCAN-12 | App normalizes EXIF rotation before processing (prevents Android measurement corruption) | exifr 7.1.3 rotation() method; apply before canvas drawImage; handles iOS autorotation quirk |
| SCAN-13 | App runs OpenCV.js in Web Worker (prevents UI freeze on mobile) | Web Worker + importScripts pattern; single-threaded WASM (threaded WASM confirmed broken in Workers); CVWorkerBridge facade |
</phase_requirements>

---

## Summary

Phase 1 is the CV measurement engine: everything from camera capture through returning accurate millimeter measurements in a `MeasurementResult` object. It covers 13 requirements (SCAN-01 through SCAN-13) and has zero dependencies on other phases — it can be built and tested standalone with a simple HTML test harness before any React UI exists.

The upstream project research (STACK.md, PITFALLS.md, ARCHITECTURE.md) already covers this domain in depth. This phase research consolidates those findings into prescriptive implementation guidance specifically for Phase 1, verifies current package versions, documents the CV algorithm parameters, and maps each requirement to a concrete test strategy.

The highest-risk areas are not architectural — they are physical-world edge cases invisible in desktop testing: EXIF rotation on Android, iOS ultra-wide lens regression, WASM memory accumulation on retake, and perspective distortion from non-overhead angles. Every mitigation must be built in from the first implementation, not retrofitted. The OpenCV.js + Web Worker pattern is well-documented with multiple reference implementations and is the unambiguous standard approach.

**Primary recommendation:** Build the worker in isolation first. Test it with static ImageData files (JPEG fixtures captured at various angles, orientations, and floor colors) before wiring to camera or React. All five pitfall mitigations (EXIF, ultra-wide, memory, perspective, white floor) are architecturally straightforward — the only challenge is remembering to implement all of them before declaring the pipeline "done."

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @techstark/opencv-js | 4.12.0-release.1 | Computer vision WASM | Best-maintained npm OpenCV wrapper; TypeScript types included; avoids manual CDN; version verified via `npm view` |
| exifr | 7.1.3 | EXIF orientation reading | Smallest correct solution (~3KB gzipped); has `rotation()` method that handles iOS Safari autorotation quirk and returns degrees + scale; version verified via `npm view` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.0 | Unit testing | CV pipeline pure function testing; no DOM needed for the worker logic |
| @vitest/web-worker | 4.1.0 | Web Worker testing in Vitest | Simulates Web Worker in same thread for unit tests; avoids spawning real workers in test environment |
| @testing-library/react | 16.3.2 | React component testing | Used in Phase 2+ for UI; Phase 1 tests are pure functions only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| exifr | piexifjs | piexifjs (12KB) handles write/edit of EXIF; exifr is read-only and smaller; for this use case read-only is all we need |
| exifr | fast-exif | fast-exif is Node.js only; does not work in browser/worker context |
| vitest | jest | Vitest 3.8s vs Jest 15.5s for comparable suites; Vitest is the current standard for Next.js 15 projects; Jest requires additional transform config for ESM |

**Installation:**
```bash
# CV dependency
npm install @techstark/opencv-js exifr

# postinstall — copy WASM to public
# (add to package.json scripts)
mkdir -p public/cv && cp node_modules/@techstark/opencv-js/dist/opencv.js public/cv/ && cp node_modules/@techstark/opencv-js/dist/opencv.wasm public/cv/

# Testing
npm install -D vitest @vitest/web-worker @testing-library/react jsdom
```

**Version verification:** Confirmed via `npm view` on 2026-03-21:
- `@techstark/opencv-js` latest: `4.12.0-release.1`
- `exifr` latest: `7.1.3`
- `vitest` latest: `4.1.0`
- `@vitest/web-worker` latest: `4.1.0`

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── workers/
│   └── opencv.worker.ts        # All OpenCV computation — self-contained
├── lib/
│   └── cv/
│       ├── worker-bridge.ts    # CVWorkerBridge — postMessage facade
│       ├── types.ts            # MeasurementResult, ScanError interfaces
│       └── size-lookup.ts      # mm → US/EU/UK (scaffold only in Phase 1)
├── hooks/
│   └── useCamera.ts            # getUserMedia, stream lifecycle, photo capture
public/
└── cv/
    ├── opencv.js               # Copied from node_modules at postinstall
    └── opencv.wasm             # ~5-9MB WASM binary
tests/
└── cv/
    ├── fixtures/               # Static JPEG test images (various angles, floors)
    ├── pipeline.test.ts        # Worker logic pure function tests
    └── exif.test.ts            # EXIF normalization tests
```

### Pattern 1: Web Worker as CV Processing Boundary

**What:** All OpenCV operations run inside `workers/opencv.worker.ts`. The main thread never calls any `cv.*` function directly. Worker is loaded once, reused for all scans in a session.

**When to use:** Always — OpenCV contour analysis takes 200-800ms on mobile and will freeze the UI if run on the main thread.

**CRITICAL: Single-threaded WASM only.** OpenCV.js does NOT work in a Web Worker when built with WASM threads enabled. Use the default single-threaded build (what `@techstark/opencv-js` ships). Confirmed broken: [OpenCV.js issue #25790](https://github.com/opencv/opencv/issues/25790).

```typescript
// workers/opencv.worker.ts
// Source: vinissimus/opencv-js-webworker + official OpenCV.js docs pattern

declare const cv: any

// Load WASM — importScripts is the correct pattern for Web Workers
// @ts-ignore
self.importScripts('/cv/opencv.js')

let cvReady = false
// cv is initialized asynchronously — must wait for onRuntimeInitialized
cv.onRuntimeInitialized = () => {
  cvReady = true
  self.postMessage({ type: 'READY' })
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, imageData } = e.data

  if (type === 'PROCESS') {
    if (!cvReady) {
      self.postMessage({ id, error: 'CV not ready' })
      return
    }
    try {
      const result = runMeasurementPipeline(imageData)
      self.postMessage({ id, result })
    } catch (err) {
      self.postMessage({ id, error: (err as Error).message })
    }
  }
}
```

```typescript
// lib/cv/worker-bridge.ts
// Source: Architecture.md Pattern 1

export class CVWorkerBridge {
  private worker: Worker
  private pending = new Map<string, { resolve: (r: MeasurementResult) => void; reject: (e: Error) => void }>()
  private ready = false

  constructor() {
    this.worker = new Worker(new URL('/workers/opencv.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e) => {
      const { id, type, result, error } = e.data
      if (type === 'READY') { this.ready = true; return }
      const handler = this.pending.get(id)
      if (!handler) return
      this.pending.delete(id)
      if (error) handler.reject(new Error(error))
      else handler.resolve(result)
    }
  }

  async process(imageData: ImageData): Promise<MeasurementResult> {
    if (!this.ready) throw new Error('CV worker not initialized')
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()
      this.pending.set(id, { resolve, reject })
      // Transfer buffer ownership — zero copy, ImageData is unusable after this
      this.worker.postMessage({ id, type: 'PROCESS', imageData }, [imageData.data.buffer])
    })
  }

  terminate() { this.worker.terminate() }
}
```

### Pattern 2: Full CV Pipeline Sequence

**What:** Fixed sequence inside the worker. Each step depends on the previous. Abort early with a typed error if any step fails.

**Pipeline order (MUST be in this order):**

```
ImageData (transferred from main thread)
  ↓
1. EXIF Normalization
   exifr.rotation(blob) → degrees + scaleX
   Apply inverse rotation on offscreen canvas before mat creation
  ↓
2. mat = cv.matFromImageData(normalizedImageData)
  ↓
3. A4 Paper Detection
   → cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY)
   → cv.GaussianBlur(gray, blurred, new cv.Size(5,5), 0)
   → cv.Canny(blurred, edges, 75, 200)
   → contours = cv.findContours(edges, ...)
   → filter: largest quadrilateral with aspect ratio ~0.707 (±5%)
   → corners = approxPolyDP to 4 points
   → FAIL FAST if no A4 quad found: return { error: 'A4_NOT_DETECTED' }
  ↓
4. Perspective Correction (homography)
   → srcPoints = detected A4 corners (4 points)
   → dstPoints = perfect 210×297 rectangle (scaled to pixels)
   → M = cv.getPerspectiveTransform(src, dst)
   → rectified = cv.warpPerspective(mat, M, new cv.Size(targetW, targetH))
   → pixelsPerMm = targetW / 210.0  (derived from warp destination size)
  ↓
5. Calibration Sanity Check
   → Compute residual: mean reprojection error of 4 A4 corners
   → If residual > 5px: low confidence flag (affects accuracy indicator)
   → accuracy_mm = residual / pixelsPerMm
  ↓
6. Foot Contour Extraction (on rectified image)
   → cv.cvtColor(rectified, hsv, cv.COLOR_RGBA2HSV)
   → Skin tone range: H[0-30, 160-180], S[20-255], V[70-255]
   → Dark sock range: H[0-180], S[0-50], V[0-80]
   → Combine masks with cv.bitwise_or
   → cv.morphologyEx (MORPH_CLOSE, 5×5 kernel) to fill gaps
   → cv.morphologyEx (MORPH_OPEN, 3×3 kernel) to remove noise
   → footContour = largest contour by area (cv.findContours RETR_EXTERNAL)
   → Validate: contour area must be 5-40% of image area (foot-to-frame ratio)
  ↓
7. Measurement Extraction
   → minRect = cv.minAreaRect(footContour)
   → length_px = max(minRect.size.width, minRect.size.height)
   → width_px = min(minRect.size.width, minRect.size.height)
   → Rotate contour points to align with foot axis
   → For top 25% of rotated bounding box height: toe_box_width_px = max x-span
   → For bottom 15% of rotated bounding box height: heel_width_px = max x-span
   → Arch: iterate medial (inner) edge points, sum Euclidean distances → arch_px
  ↓
8. Pixel-to-mm Conversion
   → length_mm = length_px / pixelsPerMm
   → width_mm = width_px / pixelsPerMm
   → toe_box_mm = toe_box_width_px / pixelsPerMm
   → heel_mm = heel_width_px / pixelsPerMm
   → arch_mm = arch_px / pixelsPerMm
  ↓
9. WASM Memory Cleanup (always in finally block)
   → mat.delete(), gray.delete(), blurred.delete(), edges.delete()
   → contours.delete(), hierarchy.delete()
   → srcPoints.delete(), dstPoints.delete(), M.delete()
   → rectified.delete(), hsv.delete(), footContours.delete()
  ↓
MeasurementResult → postMessage back to main thread
```

### Pattern 3: Mat Memory Management (CRITICAL)

**What:** Every `cv.Mat` must be explicitly deleted. JavaScript GC cannot collect WASM heap. Mobile Safari crashes at ~300MB.

**When to use:** Every CV function that creates a new Mat (which is almost all of them).

```typescript
// Source: OpenCV.js Memory Management docs + PITFALLS.md
// Pattern: declare all Mats at top, delete all in finally

function runMeasurementPipeline(imageData: ImageData): MeasurementResult {
  // Declare all Mats here so finally can always delete them
  let mat: any, gray: any, blurred: any, edges: any
  let contours: any, hierarchy: any
  let rectified: any, hsv: any, mask: any
  let footContours: any, footHierarchy: any
  let srcPoints: any, dstPoints: any, M: any

  try {
    mat = cv.matFromImageData(imageData)
    gray = new cv.Mat()
    // ... all CV operations ...
    return computeMeasurements(footContours, pixelsPerMm)
  } finally {
    // Delete everything — even if an exception was thrown partway through
    // Guard each delete in case the Mat was never created
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[mat, gray, blurred, edges, contours, hierarchy,
      rectified, hsv, mask, footContours, footHierarchy,
      srcPoints, dstPoints, M
    ].forEach(safeDelete)
  }
}
```

### Pattern 4: EXIF Normalization (First Step Always)

**What:** Read EXIF orientation before any CV processing. Apply inverse rotation to the canvas before extracting ImageData. This ensures the Mat fed to OpenCV is always upright regardless of how the phone was held.

**Critical nuance:** `exifr.rotation()` accounts for iOS Safari's own autorotation behavior (iOS 13.4+). Always use `rotation()` not raw `Orientation` tag.

```typescript
// Source: exifr GitHub — rotation() method handles iOS quirk
// Run this on the MAIN THREAD before sending to worker (canvas API not available in Worker)

import * as exifr from 'exifr'

async function normalizeOrientation(blob: Blob): Promise<ImageData> {
  // rotation() returns { deg, scaleX, scaleY } accounting for platform autorotation
  const rotation = await exifr.rotation(blob)

  const img = await createImageBitmap(blob)
  const { deg = 0, scaleX = 1 } = rotation ?? {}

  // Create offscreen canvas at correct output dimensions
  const radians = (deg * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const outW = Math.round(img.width * cos + img.height * sin)
  const outH = Math.round(img.width * sin + img.height * cos)

  const canvas = new OffscreenCanvas(outW, outH)
  const ctx = canvas.getContext('2d')!

  ctx.translate(outW / 2, outH / 2)
  if (scaleX === -1) ctx.scale(-1, 1)  // Mirror flip
  ctx.rotate(radians)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)

  return ctx.getImageData(0, 0, outW, outH)
}
```

**Note:** Perform EXIF normalization on the main thread (before sending to worker) because `OffscreenCanvas` is available in both contexts, but the `Blob` passed to `exifr` is more convenient to handle before the transferable buffer is sent. Alternative: normalize inside the worker using `OffscreenCanvas` — both patterns work.

### Pattern 5: getUserMedia with iOS Ultra-Wide Mitigation

**What:** Specific `getUserMedia` constraints that steer iOS 16.4+ away from the ultra-wide lens. Combined with a post-capture paper size validation that catches the failure mode if it still occurs.

```typescript
// Source: PITFALLS.md + WebKit Bug 253186

// Camera constraints — resolution hints steer iOS toward standard lens
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',    // Use 'ideal' not 'exact' — exact throws on single-camera devices
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  }
}

// Resize before sending to worker — 1200px is sufficient for mm accuracy
// Full 12-48MP photos cause 10-30s processing time
function resizeImageData(source: HTMLCanvasElement, maxDim = 1200): ImageData {
  const scale = Math.min(maxDim / source.width, maxDim / source.height, 1)
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

// Post-capture sanity check — detect ultra-wide lens failure
// A4 detected paper aspect ratio should be ~0.707 (±10%)
function validatePaperRatio(detectedRect: { width: number; height: number }): boolean {
  const ratio = Math.min(detectedRect.width, detectedRect.height) /
                Math.max(detectedRect.width, detectedRect.height)
  return Math.abs(ratio - 0.707) < 0.07  // ±10% tolerance
}
```

### Pattern 6: Camera Hook

**What:** Manages the MediaStream lifecycle. Keeps one stream open throughout the scan session (no re-permission on iOS). Stops tracks explicitly after capture.

```typescript
// hooks/useCamera.ts

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }
  }, [])

  const capturePhoto = useCallback((): HTMLCanvasElement => {
    const video = videoRef.current!
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    return canvas
  }, [])

  const stopCamera = useCallback(() => {
    // MUST stop tracks — keeps camera LED on otherwise, drains battery
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  return { videoRef, startCamera, capturePhoto, stopCamera }
}
```

### Pattern 7: MeasurementResult Type Interface

**What:** The typed contract between the worker and main thread. Phase 2 (UI) and Phase 3 (persistence) both consume this type — must be defined in Phase 1.

```typescript
// lib/cv/types.ts

export interface MeasurementResult {
  // All measurements in millimeters
  length_mm: number
  width_mm: number
  arch_mm: number
  toe_box_mm: number
  heel_mm: number

  // Calibration quality
  accuracy_mm: number        // Estimated ±error from calibration residual
  confidence: 'high' | 'medium' | 'low'

  // Debug info (used for contour overlay in Phase 2)
  contour_points?: Array<{ x: number; y: number }>
  paper_corners?: Array<{ x: number; y: number }>
  calibration_px_per_mm: number

  // Metadata
  foot_side: 'left' | 'right'
  captured_at: string  // ISO timestamp
}

export type ScanErrorCode =
  | 'A4_NOT_DETECTED'
  | 'FOOT_NOT_DETECTED'
  | 'POOR_LIGHTING'
  | 'CALIBRATION_FAILED'
  | 'CV_ERROR'

export interface ScanError {
  code: ScanErrorCode
  message: string           // User-facing message (actionable)
  technical?: string        // Dev-facing detail for logging
}

export type ScanResult =
  | { success: true; data: MeasurementResult }
  | { success: false; error: ScanError }
```

### Anti-Patterns to Avoid

- **Running CV on the main thread:** Any `cv.*` call outside the worker freezes the UI for 200-800ms. The test for this: does the camera viewfinder still animate during processing? If not, CV is on the wrong thread.

- **Loading opencv.js from the CDN:** `importScripts('https://docs.opencv.org/4.x/opencv.js')` creates a runtime dependency on OpenCV's CDN. Self-host in `/public/cv/` from day one.

- **Loading opencv.js synchronously as a `<script>` tag:** Blocks First Contentful Paint for 3-5 seconds. The WASM is loaded inside the Worker via `importScripts` — the main thread never loads it directly.

- **Using threaded WASM in Web Worker:** OpenCV.js `--threads` build does NOT work inside Web Workers (issue #25790). Use the default single-threaded build only.

- **Skipping perspective correction:** Measuring directly from the raw (uncorrected) photo produces errors of 5-15mm at typical phone angles. The `warpPerspective` homography must run before any measurement.

- **Mat.delete() outside try/finally:** If any exception is thrown mid-pipeline, all Mats allocated before the throw will leak. The `finally` block is non-negotiable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF rotation reading | Parse JPEG binary headers manually | `exifr` | iOS Safari's autorotation quirk requires special handling; exifr's `rotation()` method accounts for it |
| Contour-to-bounding-box conversion | Manual min/max x,y iteration | `cv.minAreaRect` | minAreaRect handles rotated foot orientations correctly; manual bounding box fails when foot is at an angle |
| Perspective homography math | Manual 3x3 matrix computation from 4 points | `cv.getPerspectiveTransform` | Numerical precision and edge case handling; don't hand-roll linear algebra |
| Morphological noise cleanup | Manual pixel dilation iteration in JS | `cv.morphologyEx` | WASM morphology is 10-50x faster than JS loops; correctness of border handling |
| Worker message queuing | Raw `onmessage` with callback arrays | `CVWorkerBridge` class (Pattern 1) | Promise-based interface is type-safe; handles message correlation (multiple inflight requests) |

**Key insight:** Every CV operation in OpenCV.js runs in compiled WASM — an order of magnitude faster than equivalent JavaScript pixel manipulation. Never process pixels in JS loops when an OpenCV function exists.

---

## Common Pitfalls

### Pitfall 1: iOS Safari Ultra-Wide Lens Regression
**What goes wrong:** `facingMode: "environment"` routes to ultra-wide lens on iOS 16.4+ multi-lens devices. Ultra-wide has fisheye distortion; A4 paper occupies less of the frame. Calibration ratio is off by 20-40%.
**Why it happens:** WebKit bug #253186 — regression in iOS 16.4 that was not fixed before release.
**How to avoid:** Use `width: { ideal: 1920 }` in getUserMedia constraints. Also add post-capture paper ratio validation (A4 long/short ratio should be ~1.414 ±10%); if validation fails, return `A4_NOT_DETECTED` with "retake" prompt.
**Warning signs:** A4 detection succeeds but measured paper is too small relative to frame; aspect ratio is correct but scale is wrong.

### Pitfall 2: EXIF Orientation Rotates Image 90 Degrees
**What goes wrong:** Android phones photograph in landscape but EXIF says rotate 90°. Canvas `drawImage` handles EXIF inconsistently across browsers. CV pipeline receives a sideways image; A4 aspect ratio check inverts (detects portrait paper as landscape).
**Why it happens:** HTML Canvas spec does not require honoring EXIF orientation data; each browser/OS handles it differently.
**How to avoid:** Use `exifr.rotation()` before any CV processing. Apply inverse rotation to canvas. Test on a physical Android device holding phone portrait — the fail case is invisible on desktop.
**Warning signs:** Detected A4 has inverted aspect ratio (~1.414 instead of ~0.707); measurements swapped (length appears as width).

### Pitfall 3: WASM Memory Leak Crashes on Retake
**What goes wrong:** Each scan without `Mat.delete()` accumulates 20-80MB of WASM heap. Mobile Safari crashes at ~300MB. A user who retakes 3-4 times hits this.
**Why it happens:** WASM heap is not garbage collected by the JS runtime. `Mat` objects are reference-counted in C++ — `.delete()` is the JS bridge to C++ destructor.
**How to avoid:** Wrap entire pipeline in `try/finally`. Delete all Mats in `finally` with the `safeDelete` guard pattern. Run 5-consecutive-retake stress test before shipping.
**Warning signs:** Page crash on second or third retake; `Cannot enlarge memory arrays` in console.

### Pitfall 4: Perspective Distortion Inflates Measurements
**What goes wrong:** Users hold phone at 45-70° angle (not directly overhead). Near edge of A4 has different pixel density than far edge. Length error exceeds 8mm at 45° — enough to shift a shoe size recommendation.
**Why it happens:** Direct photo assumes orthographic projection. Phone at angle produces perspective projection with non-uniform pixel-per-mm ratio across the image plane.
**How to avoid:** `getPerspectiveTransform` + `warpPerspective` is mandatory, not optional. Rectify the A4 trapezoid to a perfect rectangle BEFORE calculating pixelsPerMm. All measurements must be taken from the rectified image.
**Warning signs:** Detected A4 quadrilateral has top edge significantly shorter than bottom (trapezoid); foot length measurements consistently longer than ground truth at angle.

### Pitfall 5: White Floor — A4 Detection Fails Silently
**What goes wrong:** When floor is white/cream, threshold operation merges paper and floor into one blob. `findContours` finds no closed rectangular contour. Pipeline silently returns `A4_NOT_DETECTED` — but this is a runtime failure, not a code bug. Developers test on dark desks; users scan at home on white tile.
**Why it happens:** Fundamental limitation of threshold-based segmentation. Cannot be fixed by tuning parameters — the contrast difference is genuinely absent.
**How to avoid:** Return a clear `A4_NOT_DETECTED` error with actionable user message: "Place your paper on a darker surface — light floors make the paper hard to see." Phase 2 UX will add visual instructions showing correct dark-floor placement.
**Warning signs:** App works in development but field reports from users describe light flooring; `findContours` returns 0 results on threshold image.

### Pitfall 6: cv.matFromImageData with Transferred Buffer
**What goes wrong:** When ImageData is sent to the worker via transferable buffer (`worker.postMessage(data, [data.data.buffer])`), the `ArrayBuffer` is transferred (zero-copy). Attempting to use `imageData` on the main thread AFTER transfer throws `TypeError: Cannot perform %TypedArray%.prototype.slice on a detached ArrayBuffer`.
**Why it happens:** Transferable semantics move ownership. The ImageData on the main thread becomes empty.
**How to avoid:** After calling `worker.postMessage({ imageData }, [imageData.data.buffer])`, immediately dispatch `PHOTO_TAKEN` to move scan state to `processing`. Never read `imageData` after transfer. For retake, a new photo must be captured — the old ImageData is gone.
**Warning signs:** `detached ArrayBuffer` exceptions in main thread code that reads imageData after posting.

### Pitfall 7: OpenCV.js Initialization Race
**What goes wrong:** `self.importScripts('/cv/opencv.js')` loads synchronously, but WASM module initialization is async. Code that calls `cv.Mat()` immediately after `importScripts` fails with "cv is not defined" or "cv.Mat is not a constructor" because `onRuntimeInitialized` hasn't fired yet.
**Why it happens:** Emscripten WASM loading pattern — the JS shim sets up async WASM compilation; the module is not ready until `onRuntimeInitialized`.
**How to avoid:** Set `cv.onRuntimeInitialized = () => { cvReady = true }` before any CV calls. Queue or reject messages received before `cvReady === true`. Send a `READY` postMessage to main thread when initialized so the bridge can gate requests.
**Warning signs:** "cv.Mat is not a constructor" errors on first scan; works on second scan (because worker is already initialized by then).

---

## Code Examples

### A4 Corner Detection

```typescript
// Source: OpenCV.js official contours tutorial + joyeecheung/perspective-correction reference

function detectA4Corners(mat: any): Array<{ x: number; y: number }> | null {
  let gray: any, blurred: any, edges: any, contours: any, hierarchy: any

  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    edges = new cv.Mat()
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()

    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 75, 200)

    // Dilate to close small gaps in paper edge
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    cv.dilate(edges, edges, kernel)
    kernel.delete()

    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let bestQuad: Array<{ x: number; y: number }> | null = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      // Minimum area filter — at least 10% of image
      if (area < mat.rows * mat.cols * 0.10) continue

      // Approximate to polygon
      const peri = cv.arcLength(contour, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(contour, approx, 0.02 * peri, true)

      // We want exactly 4 corners (quadrilateral)
      if (approx.rows === 4) {
        // Check aspect ratio ~0.707 (A4 short/long)
        const pts = Array.from({ length: 4 }, (_, j) => ({
          x: approx.intAt(j, 0), y: approx.intAt(j, 1)
        }))
        const xCoords = pts.map(p => p.x)
        const yCoords = pts.map(p => p.y)
        const w = Math.max(...xCoords) - Math.min(...xCoords)
        const h = Math.max(...yCoords) - Math.min(...yCoords)
        const ratio = Math.min(w, h) / Math.max(w, h)

        if (Math.abs(ratio - 0.707) < 0.07 && area > bestArea) {
          bestArea = area
          bestQuad = pts
        }
      }
      approx.delete()
    }

    return bestQuad
  } finally {
    ;[gray, blurred, edges, contours, hierarchy].forEach(m => {
      try { if (m && !m.isDeleted?.()) m.delete() } catch {}
    })
  }
}
```

### Perspective Correction (Homography)

```typescript
// Source: docs.opencv.org/4.x/js_geometric_transformations_warpPerspective.html

function applyPerspectiveCorrection(
  mat: any,
  corners: Array<{ x: number; y: number }>
): { rectified: any; pixelsPerMm: number } {
  // Sort corners: top-left, top-right, bottom-right, bottom-left
  const sorted = sortCornersClockwise(corners)

  // A4 dimensions in mm — output will be pixel-scaled to match ~300px per 100mm
  const SCALE = 2  // 2px per mm → 420×594px output
  const A4_W = 210 * SCALE
  const A4_H = 297 * SCALE

  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2,
    sorted.flatMap(p => [p.x, p.y]))
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2,
    [0, 0, A4_W, 0, A4_W, A4_H, 0, A4_H])

  const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
  const rectified = new cv.Mat()
  cv.warpPerspective(mat, rectified, M, new cv.Size(A4_W, A4_H))

  srcPoints.delete(); dstPoints.delete(); M.delete()

  return { rectified, pixelsPerMm: SCALE }
}

// Calibration residual → accuracy indicator
function computeCalibrationAccuracy(
  detectedCorners: Array<{ x: number; y: number }>,
  pixelsPerMm: number
): number {
  // Mean distance between detected corner and ideal A4 corner (reprojection error)
  // Lower is better — < 2px residual = ±1mm accuracy
  // This is a simplified version; full reprojection requires back-transforming ideal points
  const ideal = [
    { x: 0, y: 0 }, { x: 210 * pixelsPerMm, y: 0 },
    { x: 210 * pixelsPerMm, y: 297 * pixelsPerMm }, { x: 0, y: 297 * pixelsPerMm }
  ]
  const errors = detectedCorners.map((p, i) =>
    Math.sqrt((p.x - ideal[i].x) ** 2 + (p.y - ideal[i].y) ** 2))
  return Math.max(...errors) / pixelsPerMm  // Return worst-case in mm
}
```

### Foot Measurement Extraction

```typescript
// Source: OpenCV.js Contour Features tutorial + wildoctopus/FeetAndShoeMeasurement reference

function extractMeasurements(
  footContour: any,
  pixelsPerMm: number
): Omit<MeasurementResult, 'foot_side' | 'captured_at' | 'accuracy_mm' | 'confidence' | 'calibration_px_per_mm'> {
  // minAreaRect gives the smallest rotated rectangle enclosing the foot
  const minRect = cv.minAreaRect(footContour)
  const { width, height } = minRect.size
  const length_px = Math.max(width, height)
  const width_px = Math.min(width, height)

  // Get all contour points for sub-region analysis
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i < footContour.data32S.length; i += 2) {
    points.push({ x: footContour.data32S[i], y: footContour.data32S[i + 1] })
  }

  // Sort by Y to find toe (min Y) and heel (max Y) regions
  // Assumes image is already rectified so foot is roughly vertical
  points.sort((a, b) => a.y - b.y)
  const minY = points[0].y
  const maxY = points[points.length - 1].y
  const footHeight = maxY - minY

  // Toe box: top 25% of foot height
  const toeRegion = points.filter(p => p.y < minY + footHeight * 0.25)
  const toe_box_px = toeRegion.length > 0
    ? Math.max(...toeRegion.map(p => p.x)) - Math.min(...toeRegion.map(p => p.x))
    : 0

  // Heel: bottom 15% of foot height
  const heelRegion = points.filter(p => p.y > maxY - footHeight * 0.15)
  const heel_px = heelRegion.length > 0
    ? Math.max(...heelRegion.map(p => p.x)) - Math.min(...heelRegion.map(p => p.x))
    : 0

  // Arch: medial edge (inner side) — left edge points from heel to ball
  // Ball = 40-60% region; medial = minimum X points in each horizontal slice
  const ballStart = minY + footHeight * 0.40
  const ballEnd = minY + footHeight * 0.65
  const medialPoints = Array.from(
    { length: Math.round(footHeight * 0.25) },
    (_, i) => {
      const sliceY = ballStart + i
      const slicePoints = points.filter(p => Math.abs(p.y - sliceY) < 2)
      return slicePoints.length > 0
        ? { x: Math.min(...slicePoints.map(p => p.x)), y: sliceY }
        : null
    }
  ).filter(Boolean) as Array<{ x: number; y: number }>

  const arch_px = medialPoints.slice(1).reduce((sum, p, i) => {
    const prev = medialPoints[i]
    return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2)
  }, 0)

  return {
    length_mm: length_px / pixelsPerMm,
    width_mm: width_px / pixelsPerMm,
    arch_mm: arch_px / pixelsPerMm,
    toe_box_mm: toe_box_px / pixelsPerMm,
    heel_mm: heel_px / pixelsPerMm,
    contour_points: points,
    paper_corners: undefined,
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Load opencv.js via `<script src="https://docs.opencv.org/...">` | Copy to `/public/cv/` at install time, load via `importScripts` in Worker | Best practice since Turbopack WASM issue #84972 (2024) | Zero CDN dependency; Vercel CDN caching; no bundler issues |
| OpenCV threaded WASM in Worker | Single-threaded WASM only in Workers | OpenCV.js issue #25790 (confirmed broken) | Must use default non-threaded build |
| EXIF: `exif-js` (abandoned) | `exifr` with `rotation()` method | exifr v7 (2022+); exif-js abandoned 2017 | Handles iOS Safari autorotation quirk; smaller bundle |
| `jest` for Next.js testing | `vitest` | Standard shift in Next.js community 2025 | 4x faster; better ESM support; no transform config |

**Deprecated/outdated:**
- `opencv.js` npm package (v1.1.8): Based on OpenCV 3.3 from 2017. Do not use.
- `exif-js`: Abandoned. Does not handle iOS Safari's autorotation quirk.
- `tracking.js`: Abandoned 2018. No CV capabilities comparable to OpenCV.
- `@supabase/auth-helpers`: Replaced by `@supabase/ssr`. Causes cookie bugs with App Router.

---

## Open Questions

1. **Foot segmentation accuracy on very dark skin tones**
   - What we know: HSV skin tone ranges designed for medium-tone skin may miss darker tones; the "dark sock" fallback helps but may not cover all cases
   - What's unclear: Whether tuning HSV ranges broadly enough to cover the full skin tone spectrum will cause false positives on non-foot objects in the image
   - Recommendation: Test with diverse skin tone photos during initial calibration. Consider a wider HSV V (brightness) range and rely more on contour size/shape filtering as the primary discriminant.

2. **Arch length accuracy from single top-down photo**
   - What we know: Arch length via medial edge curve from top-down is a 2D approximation; true arch length requires 3D or side-view data
   - What's unclear: Whether the 2D approximation is sufficiently accurate for custom last sizing (cobbler use case)
   - Recommendation: Label arch and toe box as "estimated" in the `MeasurementResult` type (add an `isEstimated` flag) and surface that in Phase 2 UI. Validate against manual measurements during testing.

3. **Worker file serving in Next.js with Turbopack**
   - What we know: `new Worker(new URL('/workers/opencv.worker.ts', import.meta.url))` works with webpack; Turbopack handles Web Worker instantiation differently
   - What's unclear: Whether `import.meta.url` Worker instantiation works cleanly in Turbopack dev mode
   - Recommendation: During Phase 1 development, run `next dev --webpack` if Worker loading issues arise. Switch back to Turbopack (default) after the worker is stable. Production build is unaffected.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` — Wave 0 creates this |
| Quick run command | `npx vitest run tests/cv/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | getUserMedia called with correct constraints | unit | `npx vitest run tests/cv/camera.test.ts` | ❌ Wave 0 |
| SCAN-02 | A4 paper detected and pixel-per-mm calculated from fixture image | unit | `npx vitest run tests/cv/pipeline.test.ts -t "A4 detection"` | ❌ Wave 0 |
| SCAN-03 | Foot contour extracted from test fixture | unit | `npx vitest run tests/cv/pipeline.test.ts -t "contour"` | ❌ Wave 0 |
| SCAN-04 | Foot length within 3mm of ground truth on calibrated fixture | unit | `npx vitest run tests/cv/pipeline.test.ts -t "length"` | ❌ Wave 0 |
| SCAN-05 | Foot width within 3mm of ground truth on calibrated fixture | unit | `npx vitest run tests/cv/pipeline.test.ts -t "width"` | ❌ Wave 0 |
| SCAN-06 | Arch length extracted and returned in MeasurementResult | unit | `npx vitest run tests/cv/pipeline.test.ts -t "arch"` | ❌ Wave 0 |
| SCAN-07 | Toe box width within expected range on fixture | unit | `npx vitest run tests/cv/pipeline.test.ts -t "toe box"` | ❌ Wave 0 |
| SCAN-08 | Heel width within expected range on fixture | unit | `npx vitest run tests/cv/pipeline.test.ts -t "heel"` | ❌ Wave 0 |
| SCAN-09 | Two separate MeasurementResult objects returned for left/right | unit | `npx vitest run tests/cv/session.test.ts` | ❌ Wave 0 |
| SCAN-10 | accuracy_mm populated in MeasurementResult | unit | `npx vitest run tests/cv/pipeline.test.ts -t "accuracy"` | ❌ Wave 0 |
| SCAN-11 | 5 consecutive scans without memory growth (WASM leak test) | manual | Manual: run 5 scans in DevTools memory profiler | manual-only |
| SCAN-12 | EXIF orientation 90° CW normalized to upright before CV | unit | `npx vitest run tests/cv/exif.test.ts` | ❌ Wave 0 |
| SCAN-13 | CV operations do not block main thread during processing | manual | Manual: video element continues animating during worker processing | manual-only |

**Manual-only justification:**
- SCAN-11 (memory leak): Requires WASM heap monitoring in a live browser; cannot be automated in vitest node environment
- SCAN-13 (main thread freeze): Requires visual observation of UI frame rate during CV processing; not automatable in test environment

### Sampling Rate
- **Per task commit:** `npx vitest run tests/cv/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual SCAN-11/SCAN-13 checks on physical device before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework config with jsdom environment
- [ ] `tests/cv/fixtures/` — test JPEG images: overhead A4+foot, 45° angle, EXIF-rotated, white floor
- [ ] `tests/cv/pipeline.test.ts` — covers SCAN-02 through SCAN-10
- [ ] `tests/cv/exif.test.ts` — covers SCAN-12
- [ ] `tests/cv/camera.test.ts` — covers SCAN-01 (mocked getUserMedia)
- [ ] `tests/cv/session.test.ts` — covers SCAN-09
- [ ] Framework install: `npm install -D vitest @vitest/web-worker jsdom @testing-library/react`

---

## Sources

### Primary (HIGH confidence)
- `@techstark/opencv-js` — version 4.12.0-release.1 confirmed via `npm view` 2026-03-21
- `exifr` — version 7.1.3 confirmed via `npm view` 2026-03-21; `rotation()` method documented for iOS quirk handling
- [OpenCV.js Contour Features (official)](https://docs.opencv.org/3.4/dc/dcf/tutorial_js_contour_features.html) — minAreaRect, approxPolyDP, findContours
- [OpenCV.js warpPerspective example (official)](https://docs.opencv.org/4.x/js_geometric_transformations_warpPerspective.html) — perspective transform pattern
- [OpenCV.js does not work in Web Worker with threads #25790](https://github.com/opencv/opencv/issues/25790) — single-threaded WASM requirement confirmed
- [vinissimus/opencv-js-webworker](https://github.com/vinissimus/opencv-js-webworker) — importScripts + onRuntimeInitialized pattern
- `vitest` — version 4.1.0 confirmed via `npm view` 2026-03-21
- `@vitest/web-worker` — version 4.1.0 confirmed via `npm view` 2026-03-21
- `.planning/research/STACK.md` — stack decisions, public-folder WASM pattern, Turbopack limitations
- `.planning/research/PITFALLS.md` — 8 confirmed pitfalls with WebKit bug numbers and OpenCV issue references
- `.planning/research/ARCHITECTURE.md` — Web Worker boundary, CVWorkerBridge, pipeline sequence
- [WebKit Bug 253186 — iOS 16.4 ultra-wide facingMode regression](https://bugs.webkit.org/show_bug.cgi?id=253186)

### Secondary (MEDIUM confidence)
- [joyeecheung/perspective-correction GitHub](https://github.com/joyeecheung/perspective-correction) — A4 corner detection approach (Python, directly portable to OpenCV.js)
- [OpenCV.js Geometric Transformations](https://docs.opencv.org/3.4/dd/d52/tutorial_js_geometric_transformations.html) — getPerspectiveTransform + warpPerspective verified
- [exifr GitHub — rotation() docs](https://github.com/MikeKovarik/exifr) — iOS autorotation quirk handling verified
- [Vitest + Next.js 15 setup (Wisp CMS)](https://www.wisp.blog/blog/setting-up-vitest-for-nextjs-15) — Vitest preferred over Jest for Next.js 15 projects

### Tertiary (LOW confidence)
- [wildoctopus/FeetAndShoeMeasurement](https://github.com/wildoctopus/FeetAndShoeMeasurement) — reference implementation for general CV foot measurement approach (Python, not JS)
- OpenCV Q&A Forum — memory management patterns (community source, consistent with official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions confirmed via `npm view` on 2026-03-21
- Architecture: HIGH — Web Worker + importScripts + single-threaded WASM pattern confirmed working by official issues and reference implementations
- CV algorithm parameters: MEDIUM — threshold values and kernel sizes are Claude's discretion per CONTEXT.md; documented values are reasonable starting points that will need tuning on real foot photos
- Pitfalls: HIGH — all 7 Phase 1 pitfalls confirmed via official bug trackers (WebKit #253186, OpenCV #25790) and OpenCV.js documentation

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days — stable ecosystem; OpenCV.js and exifr change slowly)
