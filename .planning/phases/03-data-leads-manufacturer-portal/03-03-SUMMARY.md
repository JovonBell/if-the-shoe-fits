---
phase: 03-data-leads-manufacturer-portal
plan: 03
subsystem: auth
tags: [supabase, magic-link, next-js, admin-portal, react, tailwind]

# Dependency graph
requires:
  - phase: 03-01
    provides: Supabase client utilities (client.ts, server.ts, middleware.ts), auth middleware protecting /admin routes
  - phase: 03-00
    provides: Test stubs for MFR-02 scan table behavior

provides:
  - Magic link login page at /admin/login (shouldCreateUser false — invite-only)
  - Auth callback route exchanging magic link code for Supabase session
  - Signout route handler
  - Admin layout with getUser() auth guard and navigation
  - GET /api/admin/scans — authenticated scan listing endpoint
  - ScanTable component — sortable by date/name/email/status, filterable by text and status
  - admin/page.tsx — Server Component fetching scans and passing to client wrapper
  - dashboard-client.tsx — optimistic status updates, STL download triggering

affects:
  - 03-04 (needs /api/admin/scans/[id] PATCH for status change; /api/admin/scans/[id]/stl for download)
  - 03-05 (invite flow builds on same auth pattern and admin layout)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Magic link OTP via signInWithOtp with shouldCreateUser false
    - exchangeCodeForSession in callback route handler
    - getUser() (not getSession()) in admin layout for server-side auth validation
    - Server Component fetching data + passing to client wrapper component pattern
    - Optimistic UI updates with fetch-on-failure revert

key-files:
  created:
    - src/app/admin/login/page.tsx
    - src/app/api/auth/callback/route.ts
    - src/app/api/auth/signout/route.ts
    - src/app/admin/layout.tsx
    - src/app/api/admin/scans/route.ts
    - src/components/admin/ScanTable.tsx
    - src/app/admin/page.tsx
    - src/app/admin/dashboard-client.tsx
  modified:
    - src/app/page.tsx (bug fix: pass formSubmitted and onFormSubmitSuccess to ResultsStep)

key-decisions:
  - "shouldCreateUser: false in signInWithOtp — prevents unknown emails from auto-creating auth accounts"
  - "Admin layout uses getUser() not getSession() — getSession() does not validate JWT server-side"
  - "Server Component (admin/page.tsx) fetches data; client wrapper (dashboard-client.tsx) handles interactivity — clean separation of RSC and client state"
  - "Optimistic status update reverts on API failure using initialScans reference"

patterns-established:
  - "Pattern: RSC data fetch + client wrapper — page.tsx fetches server-side, passes initialScans to dashboard-client.tsx for React state"
  - "Pattern: Admin route auth guard — both middleware (03-01) and layout check auth independently (defense in depth)"

requirements-completed:
  - MFR-01
  - MFR-02

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 03 Plan 03: Admin Auth + Dashboard Summary

**Magic link admin login (invite-only with shouldCreateUser false) and sortable/filterable scan dashboard built as RSC + client wrapper pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T17:15:07Z
- **Completed:** 2026-03-21T17:18:27Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Jolie can navigate to /admin, is redirected to /admin/login if unauthenticated (middleware + layout both enforce)
- Magic link login with shouldCreateUser: false — only pre-existing (invited) accounts can authenticate
- Dashboard displays all customer scans in a sortable (date/name/email/status) and filterable (text + status dropdown) table
- Server Component fetches scans from Supabase; client wrapper handles sort/filter state and status updates optimistically

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin login page + auth callback route + signout route + admin layout** - `c03e728` (feat)
2. **Task 2: ScanTable component + scans listing API route + dashboard page + dashboard client** - `3db1b60` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/app/admin/login/page.tsx` - Magic link form; signInWithOtp with shouldCreateUser: false; sent state shows "Check your email"
- `src/app/api/auth/callback/route.ts` - Exchanges code query param for Supabase session; redirects to /admin on success, /admin/login on failure
- `src/app/api/auth/signout/route.ts` - POST handler calls supabase.auth.signOut(), redirects to /admin/login
- `src/app/admin/layout.tsx` - Server Component; getUser() auth check; navigation header with user email and sign out form
- `src/app/api/admin/scans/route.ts` - GET handler; getUser() auth check returns 401 for unauthenticated; selects all scans ordered by created_at desc
- `src/components/admin/ScanTable.tsx` - Client component; sortField/sortDir/filterText/filterStatus state; useMemo for filtered+sorted list; status select with all 4 options; STL download button
- `src/app/admin/page.tsx` - Server Component; fetches scans from Supabase; passes to AdminDashboard
- `src/app/admin/dashboard-client.tsx` - Client wrapper; optimistic status updates via PATCH /api/admin/scans/[id]; STL download via /api/admin/scans/[id]/stl
- `src/app/page.tsx` - Bug fix: added missing formSubmitted and onFormSubmitSuccess props to ResultsStep

## Decisions Made

- shouldCreateUser: false is the critical security gate — without it, any email can trigger account creation
- Admin layout duplicates the auth check from middleware (defense-in-depth) — middleware can be bypassed in certain edge cases
- RSC + client wrapper pattern keeps Server Component's data fetching benefits while enabling React state for table interactivity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing ResultsStep props in page.tsx**
- **Found during:** Task 2 (TypeScript compile check)
- **Issue:** Plan 02 added formSubmitted state and ResultsStep props (formSubmitted, onFormSubmitSuccess) to the component interface, but the uncommitted changes to page.tsx were incomplete — the props were not being passed to ResultsStep, causing TS2739 type error
- **Fix:** Added formSubmitted={formSubmitted} and onFormSubmitSuccess={() => setFormSubmitted(true)} to the ResultsStep usage in page.tsx
- **Files modified:** src/app/page.tsx
- **Verification:** npx tsc --noEmit exits 0
- **Committed in:** 3db1b60 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix in pre-existing uncommitted code)
**Impact on plan:** Bug fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None — plan executed as specified with one auto-fix for a pre-existing uncommitted bug from Plan 02.

## User Setup Required

None — no external service configuration required for this plan. Supabase env vars were established in Phase 03-01.

## Next Phase Readiness

- Admin auth flow complete: login, callback, signout all wired
- Dashboard renders scan table with all columns; sort and filter work client-side
- Plan 04 needed to implement: PATCH /api/admin/scans/[id] (status update) and GET /api/admin/scans/[id]/stl (signed URL download) — dashboard-client.tsx already calls these routes
- Status changes and STL downloads will 404 until Plan 04 is complete

---
*Phase: 03-data-leads-manufacturer-portal*
*Completed: 2026-03-21*
