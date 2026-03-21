# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-21
**Phases:** 4 | **Plans:** 19 | **Sessions:** ~3

### What Was Built
- OpenCV.js foot measurement pipeline (A4 calibration, EXIF normalization, Web Worker isolation)
- Guided scan wizard UX with 3D parametric foot model (Three.js mesh deformation)
- Lead capture + Supabase persistence + STL export/download
- Admin portal with scan management, status tracking, cobbler invite
- Vercel deployment config with cross-origin iframe camera headers for Shopline embed

### What Worked
- Single-day MVP delivery — 4 phases, 19 plans, 78 commits from init to ship
- Web Worker isolation decision upfront avoided UI freeze issues entirely
- Procedural GLB generation avoided browser API dependencies in server context
- TDD stub approach (test.todo) kept Phase 3 plans compile-safe without blocking execution
- Belt-and-suspenders headers pattern (vercel.json + next.config.ts) avoided iframe camera issues

### What Was Inefficient
- Human verification deferred across all 4 phases — 18 tech debt items accumulated
- Phase 1 Plan 04 (foot contour extraction) took 104 min vs 2-12 min for other plans — CV algorithm complexity was underestimated
- 47 test stubs remain as todo() — real behavioral tests need a follow-up pass
- REQUIREMENTS.md said "Shopify" in DEPLOY-03/04 when the platform is actually Shopline

### Patterns Established
- getUser() over getSession() for JWT validation (security pattern)
- RSC + client wrapper for interactive admin pages
- STL export independent of R3F Canvas (re-runs deformation from scratch)
- Relative Worker URLs for Turbopack production compatibility

### Key Lessons
1. CV algorithm plans need 5-10x time estimates vs CRUD plans — contour extraction was the longest single plan
2. Deferred human testing accumulates fast — 18 items by milestone end. Build verification checkpoints into plans earlier
3. A4 paper reference works well but white-on-white detection is a real risk — dark surface instruction is critical

### Cost Observations
- Model mix: ~80% opus, ~15% sonnet, ~5% haiku (estimated)
- Sessions: ~3 (autonomous execution with context resets)
- Notable: Single-day delivery for 28,812 LOC — high throughput from autonomous phase execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 4 | First milestone — established GSD workflow patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Tech Debt Items |
|-----------|-------|----------|-----------------|
| v1.0 | 47 stubs | Untested | 18 |

### Top Lessons (Verified Across Milestones)

1. (First milestone — lessons will be cross-validated after v1.1)
