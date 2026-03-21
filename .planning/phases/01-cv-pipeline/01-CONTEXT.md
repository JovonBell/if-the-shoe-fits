# Phase 1: CV Pipeline - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a working OpenCV.js computer vision pipeline that runs in a Web Worker, accepts a foot-on-A4-paper photo, and returns accurate measurements in millimeters. It covers: camera capture via getUserMedia, EXIF normalization, A4 paper detection and calibration, foot contour extraction, measurement calculation (length, width, arch, toe box, heel), accuracy confidence indicator, retake flow, and left/right foot support. No UI styling or lead capture — purely the measurement engine.

</domain>

<decisions>
## Implementation Decisions

### OpenCV.js Loading
- Use `@techstark/opencv-js@4.12.0-release.1` npm package
- Copy opencv.js + opencv.wasm to `/public/cv/` via postinstall script (Turbopack cannot bundle WASM)
- Load via `importScripts()` inside the Web Worker
- Single-threaded WASM build (no SharedArrayBuffer headers needed)

### CV Pipeline Architecture
- All CV processing runs in a dedicated Web Worker (prevents UI freeze on mobile)
- Worker receives ImageData via transferable buffer (zero-copy)
- Pipeline order: EXIF normalize → A4 detection → pixel-per-mm calibration → foot contour extraction → measurement calculation
- Every Mat object must be .delete()'d in try/finally blocks (WASM memory is not garbage collected)

### A4 Paper Detection
- Convert to grayscale → Gaussian blur → Canny edge detection → findContours → filter for largest quadrilateral with ~1.414 aspect ratio
- Apply perspective correction (warpPerspective) to rectify angled shots before measuring
- Post-capture sanity check: detected paper dimensions must be within 5% of expected A4 ratio
- If A4 not detected, return error with guidance ("Make sure all 4 corners of the paper are visible")

### Foot Contour Extraction
- After A4 calibration, mask out the paper region
- Convert remaining area to HSV → threshold for skin tone / dark sock
- Apply morphological operations (erode/dilate) to clean up contour
- Find largest contour as the foot
- Extract measurements from contour bounding box and geometry

### Measurement Calculation
- Length: distance from heel (bottom of contour) to longest toe (top of contour) along the foot axis
- Width: widest perpendicular distance across the ball of the foot
- Arch length: curved distance along the medial (inner) edge from heel to ball
- Toe box width: width at the toe region (top 25% of contour)
- Heel width: width at the heel region (bottom 15% of contour)
- All measurements converted from pixels to mm using A4 calibration factor

### Camera Capture
- getUserMedia with constraints: `{ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }`
- iOS Safari fix: add resolution hints to avoid ultra-wide lens regression on multi-lens iPhones
- Capture to canvas, extract ImageData, transfer to Worker
- EXIF orientation check and rotation BEFORE any CV processing

### Claude's Discretion
- All implementation details for the CV algorithms (threshold values, morphological kernel sizes, contour filtering parameters) are at Claude's discretion — tune for best accuracy
- Error handling and recovery strategies
- Test harness structure

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Next.js 15 App Router (from research STACK.md)
- Tailwind v4 CSS-first config
- TypeScript throughout

### Integration Points
- Web Worker will be consumed by the scan UI in Phase 2
- Measurement results (typed interface) will be used by Phase 2 (display) and Phase 3 (persistence)
- Camera capture hook will be reused across the scan flow

</code_context>

<specifics>
## Specific Ideas

- Reference implementation: wildoctopus/FeetAndShoeMeasurement (OpenCV, A4 paper, no deep learning)
- Reference implementation: kazi-mifta/Foot-Measurement (length + width from 2 photos, A4 reference)
- iOS Safari ultra-wide lens fix: resolution hints in getUserMedia constraints
- EXIF rotation must be first step — Android photos stored sideways with metadata
- White floor detection: if A4 detection fails, provide clear error message

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
