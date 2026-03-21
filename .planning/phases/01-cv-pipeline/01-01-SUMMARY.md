---
phase: 01-cv-pipeline
plan: "01"
subsystem: project-scaffold
tags: [nextjs, vitest, opencv, test-infrastructure]
dependency_graph:
  requires: []
  provides: [next-app-scaffold, test-infrastructure, cv-stubs]
  affects: [01-02, 01-03, 01-04, 01-05, 01-06]
tech_stack:
  added:
    - Next.js 16.2.1 (App Router)
    - TypeScript
    - Tailwind v4
    - "@techstark/opencv-js@4.12.0-release.1"
    - exifr@7.1.3
    - vitest@4.1.0
    - jsdom@29.0.1
    - "@testing-library/react@16.3.2"
    - "@vitejs/plugin-react"
  patterns:
    - Vitest with jsdom for browser-API tests
    - Dynamic imports resolved by Vite (stub modules required)
    - postinstall script copies OpenCV assets to public/cv/
key_files:
  created:
    - package.json
    - next.config.ts
    - vitest.config.ts
    - src/__tests__/exif.test.ts
    - src/__tests__/camera.test.ts
    - src/__tests__/a4-detection.test.ts
    - src/__tests__/calibration.test.ts
    - src/__tests__/contour.test.ts
    - src/__tests__/measurements.test.ts
    - src/__tests__/extended-measurements.test.ts
    - src/__tests__/both-feet.test.ts
    - src/__tests__/fixtures/README.md
    - src/lib/cv/exif.ts (stub)
    - src/lib/cv/camera-constraints.ts (stub)
    - src/lib/cv/a4-detection.ts (stub)
    - src/lib/cv/types.ts (stub)
    - src/lib/cv/foot-contour.ts (stub)
    - src/lib/cv/measurements.ts (stub)
    - src/lib/cv/session.ts (stub)
    - public/cv/opencv.js
  modified: []
decisions:
  - "Stub lib/cv modules created alongside test stubs because Vite statically resolves all dynamic imports at transform time — .catch(() => null) does not prevent resolution failures. Stubs will be replaced by full implementations in Plan 02."
  - "postinstall script uses (cp opencv.wasm ... || true) because @techstark/opencv-js@4.12.0-release.1 bundles WASM inline in opencv.js — no separate .wasm file exists in this package version."
metrics:
  duration_minutes: 15
  completed_date: "2026-03-21"
  tasks_completed: 2
  tasks_total: 2
  files_created: 20
  files_modified: 1
---

# Phase 01 Plan 01: Project Scaffold and Test Infrastructure Summary

**One-liner:** Next.js 16.2.1 App Router project with OpenCV.js WASM assets, Vitest/jsdom test runner, and 8 test stub files covering all 12 CV pipeline requirements.

## What Was Built

- Next.js 16.2.1 scaffolded with App Router, TypeScript, Tailwind v4, and ESLint
- All CV runtime dependencies installed: `@techstark/opencv-js` and `exifr`
- All test dependencies installed: `vitest`, `jsdom`, `@testing-library/react`, `@vitejs/plugin-react`
- `postinstall` script copies `opencv.js` to `public/cv/` on every `npm install`
- `next.config.ts` set to `output: 'standalone'` for Phase 4 Vercel deployment
- `vitest.config.ts` configured with jsdom environment, globals, and `@/*` path alias
- 8 test stub files in `src/__tests__/` covering SCAN-01 through SCAN-12
- 6 stub implementation files in `src/lib/cv/` so Vite can resolve imports statically
- `src/__tests__/fixtures/README.md` documenting 4 required fixture images
- Test results: 15 passing, 11 correctly skipped (fixture-dependent), 0 failures

## Test Results

```
Test Files  8 passed (8)
     Tests  15 passed | 11 skipped (26)
  Duration  870ms
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] opencv.wasm does not exist in @techstark/opencv-js@4.12.0-release.1**
- **Found during:** Task 1
- **Issue:** The postinstall script tried to copy `opencv.wasm` but the package bundles WASM inline inside `opencv.js` — no separate `.wasm` file is distributed
- **Fix:** Changed postinstall to use `(cp opencv.wasm ... 2>/dev/null || true)` so it succeeds gracefully when the file is absent
- **Files modified:** `package.json`
- **Commit:** 1fd5f18

**2. [Rule 3 - Blocking] Vite statically resolves dynamic imports at transform time**
- **Found during:** Task 2
- **Issue:** `await import('@/lib/cv/...').catch(() => null)` does not prevent Vite from failing to resolve the module path — tests crashed with "Does the file exist?" errors even with the catch
- **Fix:** Created minimal stub implementations for all 6 lib/cv modules (exif, camera-constraints, a4-detection, types, foot-contour, measurements, session). These stubs export the correct shapes and will be replaced by full implementations in Plan 02
- **Files created:** `src/lib/cv/*.ts` (6 files)
- **Commit:** ec3556f

## Self-Check: PASSED

- `public/cv/opencv.js` exists: FOUND
- `vitest.config.ts` exists: FOUND
- 8 test stubs in `src/__tests__/`: FOUND
- Commits 1fd5f18 and ec3556f: FOUND
- All tests pass: 15/15 non-skipped pass
