---
phase: 01-cv-pipeline
plan: "02"
subsystem: cv-pipeline
tags: [types, exif, camera, session, hooks]
dependency_graph:
  requires: [01-01]
  provides: [types.ts, exif.ts, camera-constraints.ts, session.ts, useCamera.ts]
  affects: [01-03, 01-04]
tech_stack:
  added: [exifr]
  patterns: [discriminated-union, custom-hook, OffscreenCanvas]
key_files:
  created:
    - src/hooks/useCamera.ts
  modified:
    - src/lib/cv/types.ts
    - src/lib/cv/exif.ts
    - src/lib/cv/camera-constraints.ts
    - src/lib/cv/session.ts
decisions:
  - "FootSide helper type added to types.ts for use by ScanSession and future worker"
  - "exifr.rotation() used instead of raw EXIF Orientation tag to handle iOS Safari autorotation quirk"
  - "CAMERA_CONSTRAINTS uses ideal (not exact) width/height for single-camera device compatibility"
  - "useCamera stopCamera calls getTracks().forEach(t => t.stop()) to prevent camera LED leak"
metrics:
  duration: "12 minutes"
  completed: "2026-03-21"
  tasks: 2
  files: 5
---

# Phase 01 Plan 02: CV Pipeline Foundation — Types, EXIF, Camera, Session Summary

**One-liner:** Type contracts, EXIF normalization via exifr.rotation(), camera constraints with ideal resolution, and ScanSession class for left/right foot results.

## What Was Built

Five files forming the non-CV-algorithm layer of the pipeline consumed by Plans 03 and 04:

- **`src/lib/cv/types.ts`** — MeasurementResult (12 fields including optional contour_points/paper_corners), ScanErrorCode union (5 codes), ScanResult discriminated union, FootSide helper type
- **`src/lib/cv/session.ts`** — ScanSession class with setResult/getResult/isComplete/reset; stores left/right results independently in a Record<FootSide, MeasurementResult | null>
- **`src/lib/cv/exif.ts`** — normalizeOrientation(blob) using exifr.rotation() for deg/scaleX, OffscreenCanvas with translate+rotate+scale(-1,1) for mirror correction, returns ImageData
- **`src/lib/cv/camera-constraints.ts`** — CAMERA_CONSTRAINTS with facingMode:'environment' and ideal 1920x1080; resizeImageData() scales to maxDim=1200 preserving aspect ratio
- **`src/hooks/useCamera.ts`** — useCamera React hook (marked 'use client') returning videoRef, startCamera, capturePhoto, stopCamera; stopCamera stops all tracks to prevent LED leak

## Test Results

- **15 tests passed, 11 skipped** (all skipped tests are `it.skip` fixture-pending, not failures)
- both-feet.test.ts: 3/3 passed
- camera.test.ts: 2/2 passed
- exif.test.ts: 1/1 passed + 2 skipped (fixture missing)
- calibration.test.ts: 3/3 passed
- All other pre-existing tests continue to pass

## Commits

- `3498954` — feat(01-02): implement type contracts and ScanSession class
- `eb61da5` — feat(01-02): implement EXIF normalization, camera constraints, and camera hook

## Deviations from Plan

None — plan executed exactly as written. Stub files from Plan 01 were replaced with full implementations.

## Self-Check: PASSED

- `src/lib/cv/types.ts` — FOUND
- `src/lib/cv/session.ts` — FOUND
- `src/lib/cv/exif.ts` — FOUND
- `src/lib/cv/camera-constraints.ts` — FOUND
- `src/hooks/useCamera.ts` — FOUND
- Commit 3498954 — FOUND
- Commit eb61da5 — FOUND
