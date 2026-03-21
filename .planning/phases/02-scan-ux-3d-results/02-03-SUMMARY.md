---
phase: 02-scan-ux-3d-results
plan: 03
subsystem: ui
tags: [react, tailwind, nextjs, wizard, camera, accessibility]

# Dependency graph
requires:
  - phase: 02-scan-ux-3d-results
    provides: brand tokens (maroon, cream, cream-dark, dark, destructive), Figtree/Poppins fonts in globals.css @theme — created in Plan 01
  - phase: 01-cv-pipeline
    provides: useCamera hook (videoRef, startCamera, capturePhoto, stopCamera), ScanError/ScanErrorCode types
provides:
  - Button component (primary/ghost variants, 44px touch targets, rounded-full, focus-visible ring, cursor-pointer)
  - StepCard component (default/warning variants, role="article", SVG icon slot)
  - StepIndicator component (4-dot progress bar, active/completed/future states, aria-current)
  - InstructionsStep component (4 SVG-illustrated cards, dark-surface warning first, Start Scanning CTA)
  - CameraStep component (video preview, 72px capture button, inline error banner, pure presentational)
  - ProcessingStep component (motion-safe pulsing spinner, "Analyzing your foot..." copy)
affects: [02-04, 02-05, wizard-state-machine, page.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline SVG icons (no icon library) — custom 32x32 viewBox="0 0 24 24" stroke-only illustrations
    - Pure presentational components — all wizard steps accept props, no internal state
    - motion-safe: prefix for reduced-motion respect on animations

key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/StepCard.tsx
    - src/components/wizard/StepIndicator.tsx
    - src/components/wizard/InstructionsStep.tsx
    - src/components/wizard/CameraStep.tsx
    - src/components/wizard/ProcessingStep.tsx
  modified: []

key-decisions:
  - "Inline SVG icons used for step card illustrations — avoids icon library dependency, custom line art per UI-SPEC"
  - "CameraStep is purely presentational — videoRef and callbacks come from parent wizard (Plan 05), no useCamera import"
  - "motion-safe:animate-pulse used on ProcessingStep spinner — respects prefers-reduced-motion without JS media query"
  - "72px capture button implemented as plain <button> not Button component — custom ring design requires different internal layout"

patterns-established:
  - "Pattern 1: Wizard step components receive all state and callbacks as props — zero internal wizard logic"
  - "Pattern 2: Warning card always rendered first in InstructionsStep — addresses STATE.md dark surface blocker"
  - "Pattern 3: Inline errors displayed above the action button (not in a toast) — keeps user on current step per interaction contract"

requirements-completed: [UX-01, UX-07]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 02 Plan 03: Wizard Step Components Summary

**6 hand-rolled React UI components (Button, StepCard, StepIndicator, InstructionsStep, CameraStep, ProcessingStep) with maroon/cream brand tokens, 44px touch targets, inline SVG icons, and dark-surface warning as first instruction card**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T09:49:45Z
- **Completed:** 2026-03-21T09:51:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Button and StepCard shared UI primitives with full accessibility (focus-visible ring, touch targets, cursor-pointer, role="article")
- 4-step wizard progress indicator (StepIndicator) with active/completed/future dot states and aria-current
- InstructionsStep with 4 SVG-illustrated cards — dark-surface warning is first card (directly addresses STATE.md Phase 2 blocker)
- CameraStep as pure presentational component — videoRef and callbacks come from parent, no useCamera coupling
- ProcessingStep with motion-safe:animate-pulse — respects prefers-reduced-motion system preference

## Task Commits

1. **Task 1: Shared UI primitives — Button and StepCard** - `9ab03e0` (feat)
2. **Task 2: StepIndicator + InstructionsStep + CameraStep + ProcessingStep** - `6063847` (feat)

## Files Created/Modified

- `src/components/ui/Button.tsx` — primary (bg-maroon text-cream) and ghost (border-maroon text-maroon) variants, forwardRef, rounded-full, min-h-[44px], focus-visible ring
- `src/components/ui/StepCard.tsx` — icon + title + description card; default (bg-cream-dark) and warning (bg-yellow-50 border-amber-600) variants; role="article"
- `src/components/wizard/StepIndicator.tsx` — 4-dot progress bar with connecting lines; active (maroon w-3), completed (maroon outline w-2), future (gray-200 w-2); aria-label and aria-current
- `src/components/wizard/InstructionsStep.tsx` — 4 inline SVG step cards rendered via StepCard; warning first; Start Scanning Button (primary lg w-full)
- `src/components/wizard/CameraStep.tsx` — video element (playsInline muted aspect-video), 72px maroon capture button with inner cream ring, inline error banner (bg-red-50 text-destructive), accepts videoRef as prop
- `src/components/wizard/ProcessingStep.tsx` — centered column, 48px maroon circle with motion-safe:animate-pulse, "Analyzing your foot..." body copy

## Decisions Made

- **Inline SVG icons:** Custom line art per UI-SPEC SVG Illustration Contract — no Lucide or other icon library, each icon hand-crafted as JSX with viewBox="0 0 24 24" stroke-width={1.5}
- **CameraStep pure presentational:** Does not import useCamera hook — all refs and callbacks injected by parent wizard state machine (Plan 05) to keep component stateless and testable
- **motion-safe: prefix:** ProcessingStep uses `motion-safe:animate-pulse` instead of `animate-pulse` to natively respect prefers-reduced-motion without any JS media query code
- **72px button as plain `<button>`:** Capture button uses raw `<button>` instead of the Button component — the inner ring design requires a nested div that doesn't compose cleanly inside Button's children layout

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compilation passed on first attempt with zero errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 6 pre-results wizard components are ready for wiring into the wizard state machine (Plan 05)
- Plan 04 (ResultsStep and sub-components) can be built independently — same prop-injection pattern
- Plan 05 (page.tsx state machine) can now import and render all 6 components
- Dark-surface warning UX blocker from STATE.md is addressed — warning card is the first instruction presented to users
