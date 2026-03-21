---
phase: 04-deployment-shopify-embed
plan: 01
subsystem: infra
tags: [vercel, nextjs, headers, iframe, camera, deployment]

requires:
  - phase: 03-data-leads-manufacturer-portal
    provides: complete app with API routes and admin portal ready for deployment

provides:
  - vercel.json with Permissions-Policy: camera=* and X-Frame-Options: ALLOWALL headers
  - next.config.ts headers() function for dev/standalone runtime parity
  - production build verified passing

affects:
  - 04-02 Shopify embed configuration (needs deployed URL from Vercel)

tech-stack:
  added: []
  patterns: [belt-and-suspenders headers — vercel.json for CDN edge, next.config.ts for next start/dev]

key-files:
  created: [vercel.json]
  modified: [next.config.ts]

key-decisions:
  - "Permissions-Policy: camera=* (not camera=(self)) — allows camera in cross-origin iframes from any embedding origin"
  - "X-Frame-Options: ALLOWALL in vercel.json — deprecated but kept for older browser compatibility"
  - "No Content-Security-Policy frame-ancestors added — intentionally permissive to allow any site to embed"
  - "headers() added to next.config.ts for parity with vercel.json (applies during next start and dev)"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03]

duration: 5min
completed: 2026-03-21
---

# Phase 4 Plan 01: Vercel Deployment Config and Iframe Camera Headers Summary

**vercel.json and next.config.ts headers configured with Permissions-Policy: camera=* so the scanner app can be iframe-embedded on Shopify/Shopline with camera access working cross-origin**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-21T21:00:00Z
- **Completed:** 2026-03-21T21:05:00Z
- **Tasks:** 2 (1 config, 1 build verification)
- **Files modified:** 2

## Accomplishments

- Created `vercel.json` with `Permissions-Policy: camera=*` and `X-Frame-Options: ALLOWALL` headers applying to all routes via `/(.*)`
- Updated `next.config.ts` with `headers()` async function for dev/standalone runtime parity — same `Permissions-Policy: camera=*` header
- Verified production build completes with zero errors — all 12 routes compile, `.next` directory created, vercel.json parses as valid JSON

## Task Commits

Each task was committed atomically:

1. **Task 1: Create vercel.json and update next.config.ts with deployment headers** - `7fd0d89` (feat)
2. **Task 2: Verify production build succeeds** - no source changes, build verification only

## Files Created/Modified

- `/Users/joshuabellhome/if-the-shoe-fits/vercel.json` — Vercel deployment config with iframe camera headers for all routes
- `/Users/joshuabellhome/if-the-shoe-fits/next.config.ts` — Added `headers()` function returning `Permissions-Policy: camera=*`; `output: 'standalone'` preserved

## Decisions Made

- `camera=*` used (not `camera=(self)`) — required for cross-origin iframe embedding; `camera=(self)` would block the camera in an iframe served from a different domain
- No `Content-Security-Policy: frame-ancestors` added — intentionally omitted so any storefront can embed the app
- `X-Frame-Options: ALLOWALL` added in vercel.json alongside Permissions-Policy for older browser compatibility despite being deprecated
- Belt-and-suspenders approach: vercel.json applies headers at Vercel CDN edge; next.config.ts headers() applies during `next start` and dev — both needed for consistent behavior across environments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — build succeeded on first attempt. All 12 routes compiled cleanly.

## User Setup Required

**Vercel deployment requires manual configuration.** Before deploying:

1. Push this repo to GitHub
2. Import project in Vercel dashboard (vercel.com/new)
3. Add all environment variables from `.env.local` to Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — Vercel will auto-detect Next.js and use vercel.json headers config
5. Note the deployment URL for use in Phase 4 Plan 02 (Shopify embed)

## Next Phase Readiness

- App is deployment-ready for Vercel with correct iframe headers
- Plan 02 requires the live Vercel deployment URL to configure the Shopify/Shopline embed snippet
- No blockers

---
*Phase: 04-deployment-shopify-embed*
*Completed: 2026-03-21*
