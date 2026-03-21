---
phase: 01-cv-pipeline
plan: 03
subsystem: cv-pipeline
tags: [opencv, a4-detection, perspective-correction, calibration, pure-functions]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [a4-detection, perspective-correction, calibration-accuracy]
  affects: [cv-worker, measurement-pipeline]
tech_stack:
  added: []
  patterns: [opencv-mat-try-finally, pass-cv-as-parameter, null-not-throw]
key_files:
  created: [src/lib/cv/a4-detection.ts]
  modified: [src/__tests__/a4-detection.test.ts, src/__tests__/calibration.test.ts]
decisions:
  - "detectA4Corners receives cv as parameter to avoid Worker/main-thread coupling"
  - "Returns null (not throws) when no A4 quad found — caller handles user-facing error"
  - "SCALE=2 hard-coded → always 420x594px output, pixelsPerMm=2 is invariant"
  - "computeCalibrationAccuracy uses Euclidean distance to ideal corners, returns mm"
metrics:
  duration: 4 min
  completed: "2026-03-21"
  tasks_completed: 1
  files_changed: 3
requirements: [SCAN-02, SCAN-10]
---

# Phase 01 Plan 03: A4 Detection and Perspective Correction Summary

**One-liner:** A4 paper detection via grayscale/Canny/contour pipeline with warpPerspective homography correction and mm-accurate calibration error computation.

## What Was Built

`src/lib/cv/a4-detection.ts` — pure functions for the A4 detection step of the CV pipeline:

- `detectA4Corners(cv, mat)` — grayscale → Gaussian blur 5x5 → Canny 75/200 → dilate 3x3 → findContours RETR_EXTERNAL → largest quadrilateral filtered by area (>=10% of image) and aspect ratio (within ±7% of 0.707). Returns 4 corners sorted clockwise (TL, TR, BR, BL) or null.
- `applyPerspectiveCorrection(cv, mat, corners)` — getPerspectiveTransform + warpPerspective to 420×594px (SCALE=2). Returns `{ rectified, pixelsPerMm: 2 }`. Caller owns rectified.delete().
- `computeCalibrationAccuracy(detectedCorners, pixelsPerMm)` — Euclidean distance from detected corners to ideal A4 corners, returns worst-case error in mm. Returns 0 for perfect alignment.
- `accuracyToConfidence(accuracyMm)` — maps mm error to 'high' (<2mm) / 'medium' (<5mm) / 'low' (>=5mm).
- `A4_ASPECT_RATIO = 210/297 ≈ 0.707` — exported constant.

All OpenCV Mats created inside functions are deleted in try/finally blocks using a safeDelete helper. The approxPolyDP Mat is deleted inside the loop to prevent leaks per iteration.

## Tests

8 tests pass, 2 correctly skipped (fixture-dependent):

- `A4_ASPECT_RATIO is approximately 0.707` — PASSES
- `detectA4Corners is exported` — PASSES
- `sortCornersClockwise is not exported (internal helper)` — PASSES
- `computeCalibrationAccuracy is exported` — PASSES
- `returns 0 accuracy error for perfect corner alignment` — PASSES
- `accuracyToConfidence maps < 2mm to high, < 5mm to medium, >= 5mm to low` — PASSES
- `maps MeasurementResult.confidence as high/medium/low string union` — PASSES
- `detectA4Corners is exported from lib/cv/a4-detection` (existing stub check) — PASSES

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `d84e3f2`: feat(01-03): implement A4 detection, perspective correction, and calibration accuracy

## Self-Check: PASSED

- src/lib/cv/a4-detection.ts: EXISTS
- src/__tests__/a4-detection.test.ts: UPDATED
- src/__tests__/calibration.test.ts: UPDATED
- Commit d84e3f2: EXISTS
