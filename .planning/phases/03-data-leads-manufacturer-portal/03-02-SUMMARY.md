---
phase: 03-data-leads-manufacturer-portal
plan: "02"
subsystem: ui
tags: [react, zod, supabase, nextjs, form, stl, storage]

# Dependency graph
requires:
  - phase: 03-data-leads-manufacturer-portal-01
    provides: LeadFormSchema, ScanInsertSchema, createAdminClient, exportFootSTL
  - phase: 02-scan-ux-3d-results
    provides: ResultsStep, ScanSession, MeasurementResult, FootModel3D
provides:
  - LeadForm component with Zod validation and two-step STL + lead submission
  - POST /api/stl-upload — binary STL upload to Supabase Storage stl-files bucket
  - POST /api/leads — validated scan record insert into scans table via admin client
  - ResultsStep updated with inline lead form below results, success state with download button
  - page.tsx wizard tracks formSubmitted sub-state
affects:
  - 03-data-leads-manufacturer-portal-03
  - 03-data-leads-manufacturer-portal-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - STL export before lead insert (no race condition) — exportFootSTL -> POST /api/stl-upload -> POST /api/leads
    - Form-submitted sub-state pattern — wizard stays on 'results' step, formSubmitted boolean controls lead form vs success card
    - Admin client for unauthenticated writes — service_role bypasses RLS for lead inserts (no browser Supabase client needed)
    - STL download gated behind form submission — download button only rendered when formSubmitted is true

key-files:
  created:
    - src/components/wizard/LeadForm.tsx
    - src/app/api/stl-upload/route.ts
    - src/app/api/leads/route.ts
  modified:
    - src/components/wizard/ResultsStep.tsx
    - src/app/page.tsx

key-decisions:
  - "STL export runs before lead insert to prevent orphaned DB records without storage files"
  - "Admin client (service_role) used for both STL upload and lead insert — no browser Supabase client, simpler than configuring anon INSERT with RLS"
  - "formSubmitted tracked in page.tsx as wizard sub-state — no redirect, no new WizardStep type"
  - "STL download only available after form submission — enforces lead capture before model access"

patterns-established:
  - "Lead capture: STL upload first, then scan insert with stl_path"
  - "Success state: form replaced by success card with download button inline"

requirements-completed: [LEAD-01, LEAD-02, LEAD-03, 3DM-04, 3DM-05]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 03 Plan 02: Lead Capture + STL Upload Summary

**Inline lead form below foot scan results captures contact + measurements, uploads STL to Supabase Storage, inserts scan record, then unlocks gated STL download button**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T17:15:00Z
- **Completed:** 2026-03-21T17:18:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- LeadForm component with Zod validation (first_name + email required, phone + shoe_size optional), inline field errors, submit error banner, and sequential STL-upload-then-lead-insert flow
- Two API routes: POST /api/stl-upload (binary buffer to stl-files bucket) and POST /api/leads (ScanInsertSchema validated insert into scans table returning 201)
- ResultsStep updated: shows LeadForm below results when !formSubmitted, switches to success card with "Download 3D Foot Model" button after submission
- page.tsx tracks formSubmitted sub-state, passes to ResultsStep — no redirect, no new wizard step

## Task Commits

Each task was committed atomically:

1. **Task 1: LeadForm component + API routes for STL upload and lead insert** - `8bc573d` (feat)
2. **Task 2: Wire LeadForm into ResultsStep + update page.tsx wizard state** - `cbe4178` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/wizard/LeadForm.tsx` — Lead capture form with Zod validation, STL export + upload + scan insert flow
- `src/app/api/stl-upload/route.ts` — POST: binary STL to Supabase Storage stl-files bucket via admin client
- `src/app/api/leads/route.ts` — POST: ScanInsertSchema validation, scans table insert, returns 201
- `src/components/wizard/ResultsStep.tsx` — Added LeadForm integration, success card with STL download, formSubmitted conditional rendering
- `src/app/page.tsx` — Added formSubmitted state and passes it + callback to ResultsStep

## Decisions Made
- Admin client (service_role) used for all writes — no browser Supabase client needed since lead form has no user auth
- STL export runs first in submit sequence — ensures storage file exists before DB record references it
- formSubmitted as wizard sub-state in page.tsx — cleaner than adding a 'submitted' WizardStep type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Linter auto-applied some file changes mid-execution; read-before-write protocol handled this correctly.

## User Setup Required
None — Supabase stl-files bucket and scans table were set up in Plan 01.

## Next Phase Readiness
- Lead form, STL upload, and scan insert are fully wired end-to-end
- scans table will have real rows after first user submission
- Ready for Plan 03: admin auth + dashboard to view and manage leads

---
*Phase: 03-data-leads-manufacturer-portal*
*Completed: 2026-03-21*

## Self-Check: PASSED

- FOUND: src/components/wizard/LeadForm.tsx
- FOUND: src/app/api/stl-upload/route.ts
- FOUND: src/app/api/leads/route.ts
- FOUND: src/components/wizard/ResultsStep.tsx
- FOUND commit: 8bc573d (feat(03-02): LeadForm component + STL upload and lead insert API routes)
- FOUND commit: cbe4178 (feat(03-02): Wire LeadForm into ResultsStep + update wizard state)
