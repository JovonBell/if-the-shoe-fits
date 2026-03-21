---
phase: 03-data-leads-manufacturer-portal
plan: 04
subsystem: api
tags: [supabase, nextjs, route-handlers, admin-portal, storage, signed-url, invite]

# Dependency graph
requires:
  - phase: 03-data-leads-manufacturer-portal-01
    provides: admin client (service_role), server client, Supabase setup
  - phase: 03-data-leads-manufacturer-portal-03
    provides: dashboard-client.tsx with handleStatusChange/handleDownloadSTL stubs, ScanTable component

provides:
  - PATCH /api/admin/scans/[id] — order status update with 4-value validation
  - GET /api/admin/scans/[id]/stl — 5-minute signed URL for STL download from private bucket
  - POST /api/admin/invite — cobbler invite via Supabase admin API (service_role)
  - InviteForm component — email invite with idle/sending/sent/error states
  - AdminDashboard with InviteForm wired below ScanTable

affects: [manufacturer-portal, admin-dashboard, cobbler-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin action routes: authenticated server client for auth check + admin client for privileged operations"
    - "params as Promise<{ id: string }> pattern per Next.js 16 async params"
    - "Optimistic status update with revert on API failure (in dashboard-client.tsx)"
    - "InviteForm: controlled form with 4-state status machine (idle/sending/sent/error)"

key-files:
  created:
    - src/app/api/admin/scans/[id]/route.ts
    - src/app/api/admin/scans/[id]/stl/route.ts
    - src/app/api/admin/invite/route.ts
    - src/components/admin/InviteForm.tsx
  modified:
    - src/app/admin/dashboard-client.tsx

key-decisions:
  - "PATCH status route uses authenticated server client (not admin) — RLS policy allows authenticated UPDATE, no service_role needed"
  - "STL route uses admin client for createSignedUrl — private storage bucket requires service_role to bypass RLS"
  - "Invite route dual-client pattern: server client for getUser() auth check, admin client for inviteUserByEmail() (Pitfall 5)"
  - "email validation uses string.includes('@') inline check — simple guard before calling Supabase admin API"

patterns-established:
  - "Admin action routes: always validate auth with getUser() from server client before privileged admin operations"
  - "Signed URL expiry: 300 seconds (5 minutes) for STL downloads — short-lived to prevent unauthorized sharing"

requirements-completed: [MFR-03, MFR-04, MFR-05]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 3 Plan 04: Admin Action API Routes + InviteForm Summary

**PATCH status update, signed-URL STL download, and service_role cobbler invite API routes with InviteForm component wired into admin dashboard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T17:21:32Z
- **Completed:** 2026-03-21T17:23:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PATCH /api/admin/scans/[id] validates status against 4 allowed values (new, in-progress, completed, shipped), returns 400 for invalid, 401 for unauthenticated
- GET /api/admin/scans/[id]/stl generates 5-minute signed URL from private stl-files bucket using admin client; returns 404 for missing scan or null stl_path
- POST /api/admin/invite calls auth.admin.inviteUserByEmail with service_role client, validates email format, returns 400/401/500 appropriately
- InviteForm component with idle/sending/sent/error state machine, 3-second auto-reset after success
- InviteForm imported and rendered below ScanTable in dashboard-client.tsx with "Invite Team Member" section

## Task Commits

Each task was committed atomically:

1. **Task 1: Status update + STL download API routes** - `0072128` (feat)
2. **Task 2: InviteForm component + invite API route + wire into dashboard** - `c213373` (feat)

**Plan metadata:** `7e2ccf2` (docs: complete admin action routes + InviteForm plan)

## Files Created/Modified
- `src/app/api/admin/scans/[id]/route.ts` - PATCH endpoint: validates status, updates via authenticated client, returns 401/400/500
- `src/app/api/admin/scans/[id]/stl/route.ts` - GET endpoint: fetches stl_path, generates 300s signed URL via admin client
- `src/app/api/admin/invite/route.ts` - POST endpoint: validates auth + email, calls inviteUserByEmail via admin client
- `src/components/admin/InviteForm.tsx` - Invite form with 4-state machine, POST to /api/admin/invite, success/error display
- `src/app/admin/dashboard-client.tsx` - Added InviteForm import and rendered below ScanTable in team management section

## Decisions Made
- PATCH status route uses authenticated server client (not admin) — RLS policy `Admins update order status` allows authenticated UPDATE, service_role not needed
- STL route uses admin client for createSignedUrl — private storage bucket requires service_role to bypass storage RLS (admin client always bypasses)
- Invite route uses dual-client: server client for getUser() auth check, admin client for inviteUserByEmail() — critical per RESEARCH.md Pitfall 5
- Email validation uses simple `string.includes('@')` guard before calling Supabase admin API — sufficient for server-side pre-validation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript passed clean on first run, all acceptance criteria met.

## User Setup Required
None - no external service configuration required for this plan. (Supabase credentials already in place from Plan 01.)

## Next Phase Readiness
- All manufacturer portal admin action routes complete: status update, STL download, cobbler invite
- Phase 3 requirements MFR-03, MFR-04, MFR-05 all satisfied
- Admin dashboard fully functional: scan table with status management, STL download, cobbler invite form
- Phase 03 is now complete — all 4 plans delivered

---
*Phase: 03-data-leads-manufacturer-portal*
*Completed: 2026-03-21*
