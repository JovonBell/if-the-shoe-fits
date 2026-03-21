---
phase: 1
slug: cv-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 + @vitest/web-worker 4.1.0 |
| **Config file** | vitest.config.ts (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | SCAN-12 | unit | `npx vitest run src/__tests__/exif.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | SCAN-01 | unit | `npx vitest run src/__tests__/camera.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | SCAN-02 | unit | `npx vitest run src/__tests__/a4-detection.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | SCAN-10 | unit | `npx vitest run src/__tests__/calibration.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | SCAN-03 | unit | `npx vitest run src/__tests__/contour.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | SCAN-04, SCAN-05 | unit | `npx vitest run src/__tests__/measurements.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | SCAN-06, SCAN-07, SCAN-08 | unit | `npx vitest run src/__tests__/extended-measurements.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | SCAN-09 | unit | `npx vitest run src/__tests__/both-feet.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | SCAN-11 | manual | DevTools memory profiling | N/A | ⬜ pending |
| 01-04-03 | 04 | 2 | SCAN-13 | manual | DevTools performance profiling | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest configuration with web worker support
- [ ] `src/__tests__/fixtures/` — static JPEG test images (foot on A4 paper)
- [ ] `src/__tests__/exif.test.ts` — EXIF normalization tests
- [ ] `src/__tests__/camera.test.ts` — camera capture mock tests
- [ ] `src/__tests__/a4-detection.test.ts` — A4 paper detection tests
- [ ] `src/__tests__/calibration.test.ts` — pixel-to-mm calibration tests
- [ ] `src/__tests__/contour.test.ts` — foot contour extraction tests
- [ ] `src/__tests__/measurements.test.ts` — length/width measurement tests
- [ ] `src/__tests__/extended-measurements.test.ts` — arch/toe box/heel tests
- [ ] `src/__tests__/both-feet.test.ts` — left/right foot session tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Retake without WASM memory leak | SCAN-11 | Requires live browser DevTools heap snapshot comparison | Open app, scan foot, retake 5x, check WASM heap does not grow beyond initial + 1 scan |
| No main thread freeze during processing | SCAN-13 | Requires DevTools performance panel | Open app, capture photo, verify main thread FPS stays >30 during processing via Performance tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
