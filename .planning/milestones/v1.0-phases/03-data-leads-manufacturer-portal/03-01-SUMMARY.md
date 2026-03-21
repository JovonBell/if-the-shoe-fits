---
phase: 03-data-leads-manufacturer-portal
plan: "01"
subsystem: data-layer
tags: [supabase, zod, stl-export, auth-middleware, database-schema]
dependency_graph:
  requires: ["02-scan-ux-3d-results"]
  provides: ["supabase-clients", "auth-middleware", "stl-export", "lead-schema", "db-schema"]
  affects: ["03-02-lead-form", "03-03-stl-upload-api", "03-04-admin-portal", "03-05-admin-auth", "03-06-invite"]
tech_stack:
  added: ["@supabase/supabase-js@2.99.3", "@supabase/ssr@0.9.0", "zod@4.3.6"]
  patterns: ["browser/server/admin Supabase client split", "Next.js middleware auth refresh", "standalone GLTFLoader STL export", "Zod 4 schema validation"]
key_files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/middleware.ts
    - src/middleware.ts
    - src/lib/stl/export.ts
    - src/lib/schemas/lead.ts
    - supabase/schema.sql
    - .env.local.example
  modified:
    - package.json
decisions:
  - "Use getUser() not getSession() in middleware — getSession() does not validate JWT server-side"
  - "STL export re-runs GLTFLoader+deformation independently — avoids R3F Canvas/Suspense ref drilling"
  - "STLExporter binary mode returns DataView (not ArrayBuffer) — use result.buffer as ArrayBuffer"
  - "Import Zod from 'zod' not 'zod/v4' — Zod 4.3.6 is the default export at the 'zod' package"
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 9
  files_modified: 1
  completed_date: "2026-03-21"
---

# Phase 03 Plan 01: Data Layer Foundation Summary

**One-liner:** Supabase 3-client setup (browser/server/admin) + auth middleware + GLTFLoader-based STL export + Zod 4 lead form schemas + scans DB schema with RLS policies.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install dependencies + Supabase client utilities + middleware + env template + DB schema | cfbd46a | client.ts, server.ts, admin.ts, middleware.ts, src/middleware.ts, schema.sql, .env.local.example, package.json |
| 2 | STL export utility + Zod lead form schema | a852c28 | src/lib/stl/export.ts, src/lib/schemas/lead.ts |

## What Was Built

### Supabase Client Utilities (3 files)
- `src/lib/supabase/client.ts` — `createBrowserClient` for `'use client'` components
- `src/lib/supabase/server.ts` — `createServerClient` with cookie store for Server Components and Route Handlers
- `src/lib/supabase/admin.ts` — service_role client (`persistSession: false`) that bypasses RLS for API routes

### Auth Middleware
- `src/lib/supabase/middleware.ts` — `updateSession()` helper: refreshes Supabase auth tokens, protects `/admin/*` routes (except `/admin/login`) by redirecting unauthenticated requests. Uses `getUser()` (not `getSession()`) for server-side JWT validation.
- `src/middleware.ts` — Next.js middleware entry point; matcher excludes `.glb`, `.wasm`, `.js` static assets in addition to standard Next.js exclusions.

### STL Export
- `src/lib/stl/export.ts` — `exportFootSTL(measurements)` loads `/models/foot.glb` via `GLTFLoader.loadAsync()`, applies `applyMeasurementDeformation()` identically to `FootModel3D`, exports binary STL as `ArrayBuffer`. Independent of R3F Canvas/Suspense — no ref drilling needed.

### Zod Schemas
- `src/lib/schemas/lead.ts` — `LeadFormSchema` (first_name + email required; phone + current_shoe_size optional), `ScanInsertSchema` (all 10 measurement columns + stl_path), `LeadFormData` and `ScanInsert` TypeScript types.

### Database Schema
- `supabase/schema.sql` — `scans` table with contact info, 10 measurement columns (left/right length, width, arch, toe_box, heel), stl_path, status with CHECK constraint (new/in-progress/completed/shipped), Row Level Security (anon INSERT, authenticated SELECT+UPDATE).

### Environment Template
- `.env.local.example` — Documents all 3 required Supabase env vars.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] STLExporter binary mode returns DataView, not ArrayBuffer**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** `STLExporter.parse(scene, { binary: true })` returns `DataView<ArrayBuffer>` in binary mode (not `ArrayBuffer`). The plan's cast `result as ArrayBuffer` failed type checking.
- **Fix:** Cast through `unknown` to `DataView`, then return `result.buffer as ArrayBuffer`. The `.buffer` property of a DataView is the underlying ArrayBuffer.
- **Files modified:** `src/lib/stl/export.ts`
- **Commit:** a852c28

## Decisions Made

1. **getUser() not getSession() in middleware** — `getSession()` only reads the local cookie without JWT validation; a crafted cookie would bypass auth. `getUser()` validates against Supabase's auth server.
2. **Standalone GLTFLoader STL export** — Re-running GLTFLoader + deformation independently avoids prop drilling through R3F Canvas/Suspense boundaries. Per RESEARCH.md Open Question 2 recommendation.
3. **STLExporter DataView fix** — Binary STL export returns DataView wrapping ArrayBuffer; `.buffer` property provides the ArrayBuffer needed by fetch/upload APIs.
4. **Zod from 'zod' not 'zod/v4'** — Zod 4.3.6 is the current stable `latest` tag; `'zod/v4'` subpath was a transition mechanism, no longer needed for new projects.

## Verification Results

- `npm ls @supabase/supabase-js @supabase/ssr zod` — exits 0, all 3 packages installed
- `npx tsc --noEmit` — exits 0, zero TypeScript errors
- All 10 files exist at specified paths
- Middleware uses `getUser()` not `getSession()`
- Schema SQL has all 10 measurement columns + status CHECK + 3 RLS policies

## Self-Check: PASSED

All created files verified present. All commits verified in git log.
