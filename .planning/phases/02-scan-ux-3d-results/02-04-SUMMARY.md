---
phase: 02-scan-ux-3d-results
plan: "04"
subsystem: ui
tags: [react, canvas, three-js, tailwind, nextjs, dynamic-import]

# Dependency graph
requires:
  - phase: 02-scan-ux-3d-results-01
    provides: size-lookup.ts with getRecommendedSize
  - phase: 02-scan-ux-3d-results-02
    provides: FootModel3D component (Three.js R3F)
  - phase: 02-scan-ux-3d-results-03
    provides: Button component, wizard shell components
provides:
  - ContourOverlay component: maroon polygon + measurement lines on captured photo
  - MeasurementCards component: 5 measurements with positive framing
  - SizeRecommendation component: US/EU/UK size chips with larger-foot note
  - ResultsStep component: full results screen assembling all sub-components
affects: [phase-03-lead-capture, wizard-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Canvas 2D overlay drawn over ImageData with contour polygon + dashed measurement lines + end caps + label pills
    - next/dynamic with ssr:false for Three.js components to prevent SSR crash
    - Positive framing for measurement labels ("Your length" not "Foot length")

key-files:
  created:
    - src/components/results/ContourOverlay.tsx
    - src/components/results/MeasurementCards.tsx
    - src/components/results/SizeRecommendation.tsx
    - src/components/wizard/ResultsStep.tsx
  modified: []

key-decisions:
  - "ContourOverlay sets canvas.width/height from imageData dimensions to match coordinate space exactly (avoids pixel-offset mismatch)"
  - "ResultsStep uses dynamic(() => import(FootModel3D), { ssr: false }) — Three.js/WebGL accesses window at import time, SSR guard required"
  - "SizeRecommendation larger-foot note only shown when BOTH feet scanned AND lengths differ (not just when one foot is scanned)"
  - "border-l-4 used for measurement card accent border (Tailwind v4 utility, matches maroon design token)"

patterns-established:
  - "Pattern: Canvas 2D overlay — set canvas.width/height from imageData before putImageData to avoid coordinate mismatch"
  - "Pattern: Measurement line rendering — computeMeasurementLines from contour extrema, drawMeasurementLine with dashed line + perpendicular end caps + label pill"
  - "Pattern: Dynamic Three.js import — always use next/dynamic with ssr: false for any component importing @react-three/fiber or three"

requirements-completed: [UX-02, UX-05]

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 02 Plan 04: Results Display Components Summary

**Canvas 2D contour overlay with maroon polygon + measurement lines, 5 positive-framing measurement cards, US/EU/UK size chips, and ResultsStep assembling 3D hero via SSR-guarded dynamic import**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T10:00:00Z
- **Completed:** 2026-03-21T10:08:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ContourOverlay draws maroon semi-transparent polygon from contour_points on captured photo, with dashed measurement lines showing length (heel-to-toe vertical span) and width (widest horizontal span) with mm labels, end caps, and readable label pills
- MeasurementCards displays all 5 measurements with "Your ..." positive framing in responsive 2-column/3-column grid with left maroon border accent
- SizeRecommendation shows US/EU/UK chips from getRecommendedSize, larger-foot note conditional on both feet scanned with differing lengths
- ResultsStep assembles all sub-components with hero headline, 3D model (dynamic/SSR-guarded), contour overlay, measurement cards, accuracy indicator, size recommendation, and scan-other-foot CTA

## Task Commits

1. **Task 1: ContourOverlay + MeasurementCards + SizeRecommendation** - `e7ed53e` (feat)
2. **Task 2: ResultsStep composing all sub-components** - `cf840c2` (feat)

## Files Created/Modified
- `src/components/results/ContourOverlay.tsx` - Canvas 2D overlay drawing contour polygon and measurement lines on captured photo
- `src/components/results/MeasurementCards.tsx` - 5 measurement cards with positive framing, responsive grid
- `src/components/results/SizeRecommendation.tsx` - US/EU/UK size chips using getRecommendedSize, larger-foot note
- `src/components/wizard/ResultsStep.tsx` - Full results step: hero headline, dynamic FootModel3D, overlay, cards, sizes, CTA

## Decisions Made
- Canvas coordinate space: canvas.width/height set from imageData dimensions before putImageData — prevents pixel offset mismatch documented in RESEARCH.md Pitfall 4
- SSR guard: `dynamic(() => import('@/components/results/FootModel3D'), { ssr: false })` — Three.js accesses window/WebGL at import time, crashes in SSR without this
- Larger-foot note: only rendered when `bothFeet && feetDiffer` — showing it for a single-foot scan would be confusing
- border-l-4 instead of border-l-3: Tailwind v4 uses standard scale (border-l-4 = 4px), border-l-3 is not a standard utility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed `border-l-3` to `border-l-4` in MeasurementCards**
- **Found during:** Task 1 (MeasurementCards implementation)
- **Issue:** Plan spec used `border-l-3` which is not a standard Tailwind utility class; would silently apply no border
- **Fix:** Used `border-l-4` (4px left border, standard Tailwind scale)
- **Files modified:** src/components/results/MeasurementCards.tsx
- **Verification:** TypeScript passes, border renders correctly
- **Committed in:** e7ed53e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — non-existent Tailwind class)
**Impact on plan:** Minimal cosmetic fix, no scope change.

## Issues Encountered
None — all dependencies from Plans 01-03 were present and correctly typed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 results components are complete and TypeScript-clean
- ResultsStep is ready to be wired into the wizard state machine (page-level orchestration)
- Phase 03 (lead capture) can build on ResultsStep — add "View My Measurements" → lead capture flow after both feet are scanned

---
*Phase: 02-scan-ux-3d-results*
*Completed: 2026-03-21*
