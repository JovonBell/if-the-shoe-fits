# Phase 2: Scan UX + 3D Results - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete user-facing scan experience: a guided step-by-step flow from instructions through camera capture to results display. Users see their measurements visualized with a contour overlay on their photo, a 3D parametric foot model they can rotate and zoom, and a US/EU/UK size recommendation — all before being asked for contact information. The UI matches the iftheshoefits.co brand identity (maroon #850321, cream #fffaef, Figtree + Poppins fonts). No data persistence or lead capture — purely the scan UX and results visualization.

</domain>

<decisions>
## Implementation Decisions

### Scan Flow Structure
- Linear wizard with step indicator at top, one action per screen, mobile-optimized
- 4 steps: Instructions → Camera → Processing → Results
- Sequential L/R foot prompt — after first foot results, show "Scan your other foot?" button, store both in ScanSession
- Inline error on camera screen with retry — show error message + specific guidance, stay on camera step

### 3D Foot Model
- Three.js via @react-three/fiber + @react-three/drei — React-native integration, orbit controls built-in
- Template foot mesh (GLB) deformed by measurements — anatomically realistic, scale key dimensions to match user's numbers
- Open-source foot model from Sketchfab/Thingiverse (CC license) embedded as static GLB — realistic baseline that deforms well
- Orbit controls (rotate/zoom/pan) with auto-rotate on load — satisfying first impression, user can explore

### Brand UI & Visual Design
- Cream #fffaef background, maroon #850321 primary buttons/accents, dark text #1a1a1a — matches iftheshoefits.co
- Figtree for headings + Poppins for body via next/font/google — replace current Geist fonts, match brand exactly
- Tailwind utility classes throughout — already installed, no extra deps, fast iteration
- Illustrated step cards with SVG icons — show paper placement, foot position, camera angle as simple line illustrations

### Results Display & Size Recommendation
- Full-width 3D hero — 3D foot model takes center stage at the top, measurement stats overlaid or below
- Standard Brannock-based US/EU/UK lookup table from foot length — placeholder until Jolie provides custom last table
- Semi-transparent colored contour drawn on captured photo with measurement lines — shows exactly what was measured
- Hero text on results: "Your feet are unique — now your shoes will be too" + measurement cards with positive framing ("Your arch" not "Arch measurement")

### Claude's Discretion
- Animation and transition choices between wizard steps
- Exact SVG illustration designs for instruction cards
- 3D model lighting and material settings
- Processing screen animation/spinner design
- Responsive breakpoints and spacing
- Size recommendation accuracy disclaimer copy

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCamera` hook (`src/hooks/useCamera.ts`) — camera start/stop/capture, videoRef management
- `CVWorkerBridge` (`src/lib/cv/worker-bridge.ts`) — Promise-based facade over Web Worker, process() returns ScanResult
- `ScanSession` class (`src/lib/cv/session.ts`) — manages left/right foot state
- `MeasurementResult` type (`src/lib/cv/types.ts`) — includes contour_points, paper_corners, calibration data
- `normalizeOrientation` (`src/lib/cv/exif.ts`) — EXIF rotation fix
- `resizeImageData` (`src/lib/cv/camera-constraints.ts`) — downscale for processing
- Test harness page (`src/app/page.tsx`) — current working capture+process flow to rebuild on top of

### Established Patterns
- Next.js 16 App Router with 'use client' components
- Tailwind v4 CSS-first config (`@import "tailwindcss"`)
- TypeScript strict mode
- Web Worker for all CV processing (never blocks UI)

### Integration Points
- `page.tsx` will be replaced with the scan wizard flow (new route structure or single-page state machine)
- `CVWorkerBridge.process()` returns `ScanResult` — success path feeds into results display
- `MeasurementResult.contour_points` used to draw overlay on captured photo
- `ScanSession` tracks left/right foot results

</code_context>

<specifics>
## Specific Ideas

- Brand site: iftheshoefits.co — maroon #850321 + cream #fffaef, Figtree + Poppins fonts
- Empowerment messaging: "Designed for outliers" theme from brand
- Dark surface requirement: instructions must tell user to place paper on dark/contrasting surface (from Phase 1 blocker)
- Size recommendation uses larger foot when L/R differ (success criteria #5)

</specifics>

<deferred>
## Deferred Ideas

- Custom last size table from Jolie (Phase 3 dependency — use Brannock placeholder for now)
- STL export of 3D model (Phase 3 — 3DM-04)
- Lead capture form (Phase 3 — LEAD-01)

</deferred>
