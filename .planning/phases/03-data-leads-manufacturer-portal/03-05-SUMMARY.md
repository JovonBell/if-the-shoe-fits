---
phase: 03-data-leads-manufacturer-portal
plan: 05
subsystem: testing
tags: [supabase, next.js, turbopack, web-worker, opencv]

# Dependency graph
requires:
  - phase: 03-data-leads-manufacturer-portal
    provides: lead capture, STL upload, admin portal, status management, cobbler invite
provides:
  - Pre-flight verification that tsc, vitest, and production build all pass
  - Fixed Turbopack production Worker URL bug (relative path)
  - Human verification checklist for end-to-end Phase 3 flow
affects: [phase-04-shopify-embed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Worker URL must use relative path (../../workers/...) not absolute (/workers/...) for Turbopack production builds"

key-files:
  created: []
  modified:
    - src/lib/cv/worker-bridge.ts

key-decisions:
  - "Worker URL changed to relative path — Turbopack production bundler does not support absolute new URL() paths for Worker construction"

patterns-established:
  - "Always use relative paths in new URL(path, import.meta.url) for Web Workers — required for Turbopack production builds"

requirements-completed:
  - LEAD-01
  - LEAD-02
  - LEAD-03
  - 3DM-04
  - 3DM-05
  - MFR-01
  - MFR-02
  - MFR-03
  - MFR-04
  - MFR-05

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 3 Plan 05: Human Verification Summary

**Pre-flight build verification passed after fixing Turbopack Worker URL bug; awaiting human end-to-end verification of Phase 3 lead capture, STL download, and admin portal flows.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T17:25:50Z
- **Completed:** 2026-03-21T17:30:45Z
- **Tasks:** 1 of 2 (Task 2 is human checkpoint — awaiting verification)
- **Files modified:** 1

## Accomplishments

- TypeScript compiles with zero errors (`npx tsc --noEmit` exits 0)
- All 39 tests pass (11 skipped, 47 todo stubs)
- Production build succeeds after fixing Worker URL absolute path bug
- Human verification checklist prepared for 5 end-to-end flows

## Task Commits

1. **Task 1: Pre-flight checks and build verification** — `c28d3ea` (fix)

## Files Created/Modified

- `src/lib/cv/worker-bridge.ts` — Changed Worker URL from absolute `/workers/opencv.worker.ts` to relative `../../workers/opencv.worker.ts` for Turbopack production compatibility

## Decisions Made

- Worker URL path changed to relative — Turbopack's production bundler requires `new URL()` Worker paths to be relative file references, not absolute root-relative paths. This is a known Turbopack limitation in Next.js 16.x.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed absolute Worker URL path breaking Turbopack production build**
- **Found during:** Task 1 (Pre-flight checks and build verification)
- **Issue:** `worker-bridge.ts` used `new URL('/workers/opencv.worker.ts', import.meta.url)` — Turbopack production bundler cannot resolve absolute paths in `new URL()` for Web Worker construction, causing 3 build errors: `Module not found: Can't resolve '/workers/opencv.worker.ts'` and `server relative imports are not implemented yet`
- **Fix:** Changed to relative path `new URL('../../workers/opencv.worker.ts', import.meta.url)` — bundler can now trace from `src/lib/cv/worker-bridge.ts` to `src/workers/opencv.worker.ts`
- **Files modified:** `src/lib/cv/worker-bridge.ts`
- **Verification:** `npm run build` exits 0, all routes compile successfully
- **Committed in:** `c28d3ea` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required for production deployment readiness. The dev server (`npm run dev`) worked with the absolute path, masking this issue until the build step.

## User Setup Required

Before running human verification (Task 2), the following must be configured:

1. **Create a Supabase project** at https://supabase.com
2. **Copy `.env.local.example` to `.env.local`** and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — your project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable (anon) key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (for admin operations)
3. **Run the schema** — execute `supabase/schema.sql` in Supabase Dashboard -> SQL Editor
4. **Create storage bucket** — Supabase Dashboard -> Storage -> New bucket named `stl-files` (private)
5. **Invite first admin user** — Supabase Dashboard -> Auth -> Users -> Invite -> enter Jolie's email
6. **Start dev server** — `npm run dev`

## Issues Encountered

- `Couldn't load fs` / `Couldn't load zlib` warnings appear during `npm run build` static generation — expected behavior from OpenCV.js attempting Node.js built-ins in browser context. Does not affect runtime.
- `.env.local` is not present — human verification requires real Supabase credentials to be configured first.

## Next Phase Readiness

- Phase 3 code is complete and production-build verified
- Human verification (Task 2) is awaiting user action — requires Supabase credentials + manual browser testing of 5 flows
- Once verified, Phase 4 (Shopify embed) can begin
- Phase 4 research flag still active: Shopify embed configuration (App Embed Blocks vs custom Liquid) needs a brief research pass before starting

---
*Phase: 03-data-leads-manufacturer-portal*
*Completed: 2026-03-21*
