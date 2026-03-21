---
phase: 02-scan-ux-3d-results
plan: 01
subsystem: ui
tags: [tailwindcss, next-font, three, sizing, brannock, vitest]

requires:
  - phase: 01-cv-pipeline
    provides: MeasurementResult type from src/lib/cv/types.ts

provides:
  - Figtree + Poppins fonts loaded as CSS variables via next/font/google
  - Tailwind v4 @theme brand tokens (maroon, cream, cream-dark, dark, destructive, font-heading, font-body)
  - src/lib/sizing/size-lookup.ts — lookupSize + getRecommendedSize (Brannock table, UX-03, UX-06)
  - src/lib/sizing/mesh-deform.ts — applyMeasurementDeformation + TEMPLATE_DIMENSIONS (3DM-01)
  - 16 unit tests covering brand layout, size lookup, and mesh deformation

affects: [02-02, 02-03, 02-04, 02-05, 03-lead-capture]

tech-stack:
  added: []
  patterns:
    - "Tailwind v4 CSS-first @theme in globals.css for brand tokens (bg-maroon, text-cream, etc.)"
    - "next/font/google for self-hosted Figtree + Poppins with CSS variable injection"
    - "TDD with vitest: fs.readFileSync source inspection for layout structural tests"
    - "Mock THREE.BufferGeometry pattern for mesh-deform unit tests without WebGL"

key-files:
  created:
    - src/lib/sizing/size-lookup.ts
    - src/lib/sizing/mesh-deform.ts
    - src/__tests__/layout.test.tsx
    - src/__tests__/size-lookup.test.ts
    - src/__tests__/mesh-deform.test.ts
  modified:
    - src/app/layout.tsx
    - src/app/globals.css

key-decisions:
  - "Figtree uses weights 600+700 only (headings); Poppins uses 400+500 only (body) — per UI-SPEC.md typography constraints"
  - "TEMPLATE_DIMENSIONS are placeholders (270x100x80mm); will be updated from actual GLB bounding box in Plan 02"
  - "Z-scale clamped to [0.8, 1.2] to prevent extreme deformation from inaccurate arch_mm top-down projection"
  - "Test for metadata title checks for literal em dash (U+2014) via toContain to remain independent of quote style"

patterns-established:
  - "Pattern: Layout tests use fs.readFileSync for structural inspection — avoids React render setup overhead"
  - "Pattern: Mesh deform tests mock BufferGeometry with vi.fn() setters — zero WebGL dependency, fast and portable"
  - "Pattern: getRecommendedSize filters null lengths with type predicate (v): v is number to keep TypeScript happy"

requirements-completed: [UX-03, UX-04, UX-06, 3DM-01]

duration: 2min
completed: 2026-03-21
---

# Phase 02 Plan 01: Brand Foundation + Size Lookup + Mesh Deformation Summary

**Figtree/Poppins fonts with Tailwind v4 brand tokens, Brannock size lookup table, and parametric mesh deformation math — all with 16 passing unit tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T09:42:57Z
- **Completed:** 2026-03-21T09:45:32Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced Geist fonts in layout.tsx with Figtree (600,700) + Poppins (400,500) via next/font/google; updated metadata title
- Added globals.css @theme block with 5 brand color tokens and 2 font tokens for Tailwind utility classes
- Implemented full Brannock shoe size lookup table (13 rows, 210–315mm) with larger-foot selection (UX-06)
- Implemented parametric mesh deformation with per-axis vertex scaling and arch_mm Z-clamp [0.8, 1.2]
- 16 unit tests covering all three files; TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Brand foundation — layout.tsx fonts + globals.css theme tokens** - `4db0af6` (feat)
2. **Task 2: Size lookup + mesh deformation modules with tests** - `6e5b7a2` (feat)

_Note: TDD tasks committed after GREEN phase; RED commits omitted per plan structure (tests bundled with impl)_

## Files Created/Modified

- `src/app/layout.tsx` - Replaced Geist with Figtree+Poppins fonts, updated metadata title
- `src/app/globals.css` - Added @theme brand tokens (maroon, cream, cream-dark, dark, destructive, font-heading, font-body)
- `src/__tests__/layout.test.tsx` - 3 structural tests: font imports, CSS variables, metadata title
- `src/lib/sizing/size-lookup.ts` - Brannock lookup table + lookupSize + getRecommendedSize
- `src/lib/sizing/mesh-deform.ts` - applyMeasurementDeformation + TEMPLATE_DIMENSIONS placeholder
- `src/__tests__/size-lookup.test.ts` - 7 tests covering boundary values, out-of-range, larger-foot, null cases
- `src/__tests__/mesh-deform.test.ts` - 6 tests covering X/Y/Z scaling, Z clamp (both bounds), needsUpdate, computeVertexNormals

## Decisions Made

- Figtree uses weights 600+700 only (headings); Poppins uses 400+500 only (body) — per UI-SPEC.md font weight constraint of 2 weights per family
- TEMPLATE_DIMENSIONS are placeholder values (270x100x80mm); these must be updated from the actual GLB bounding box measurement in Plan 02 when the foot model is sourced
- Z-scale clamped to [0.8, 1.2] because arch_mm from a top-down 2D projection is an imprecise proxy for foot height — clamping prevents extreme deformation until Phase 3 instep girth measurement (ENH-01)
- Layout test checks for literal em dash (U+2014 — the Unicode code point) rather than `'` + `—` + `'` to stay style-agnostic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Minor: The test for metadata title initially used a JavaScript string escape `\u2014` that was matching against the Unicode character in the file. The test was fixed to use the Unicode code point via `toContain('Foot Scanner \u2014 If The Shoe Fits')` which JavaScript processes to the em dash before comparing. Not a deviation — test implementation detail during RED→GREEN.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Brand tokens ready: `bg-maroon`, `text-cream`, `bg-cream-dark`, `text-dark`, `text-destructive` usable immediately
- Font CSS variables `--font-figtree` and `--font-poppins` available; `font-heading` and `font-body` Tailwind utilities active
- `lookupSize` and `getRecommendedSize` ready for SizeRecommendation.tsx component (Plan 03+)
- `applyMeasurementDeformation` ready for FootModel3D.tsx (Plan 02)
- TEMPLATE_DIMENSIONS placeholder must be replaced with actual GLB bounding box values in Plan 02

## Self-Check: PASSED

All created files exist. Both task commits (`4db0af6`, `6e5b7a2`) verified in git history.

---
*Phase: 02-scan-ux-3d-results*
*Completed: 2026-03-21*
