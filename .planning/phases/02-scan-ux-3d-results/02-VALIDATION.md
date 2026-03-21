---
phase: 02
slug: scan-ux-3d-results
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UX-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | UX-01 | manual | visual inspection | N/A | ⬜ pending |
| 02-03-01 | 03 | 2 | UX-02, UX-03 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | 3DM-01, 3DM-02, 3DM-03 | manual | visual inspection | N/A | ⬜ pending |
| 02-05-01 | 05 | 3 | UX-05, UX-06, UX-07 | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/size-lookup.test.ts` — stubs for UX-03, UX-06
- [ ] `src/__tests__/scan-wizard.test.ts` — stubs for UX-01 flow states
- [ ] `three` + `@react-three/fiber` + `@react-three/drei` — 3D dependencies

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Step-by-step visual overlays | UX-01 | Visual layout on mobile | Open on phone, verify instruction cards render with SVG illustrations |
| Contour overlay on photo | UX-02 | Canvas rendering | Capture foot photo, verify contour lines appear on result photo |
| 3D model renders and rotates | 3DM-01, 3DM-02 | WebGL rendering | View results, verify 3D foot renders, drag to rotate, pinch to zoom |
| Brand colors and fonts | UX-04 | Visual fidelity | Compare UI against iftheshoefits.co — maroon, cream, Figtree, Poppins |
| Mobile legibility | UX-07 | Device-dependent | Open on iPhone and Android — text readable, buttons tappable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
