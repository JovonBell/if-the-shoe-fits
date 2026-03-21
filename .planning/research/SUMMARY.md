# Project Research Summary

**Project:** If The Shoe Fits — Browser-based Foot Scanning App
**Domain:** Browser-based computer vision foot measurement for custom footwear lead capture
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

If The Shoe Fits is a browser-based foot scanning tool that uses OpenCV.js computer vision and A4 paper calibration to measure foot dimensions in the browser — no app download required. The competitive landscape (FeetSizr, mySHOEFITTER, Xesto, findmeashoe) validates the A4-reference approach and confirms browser-only delivery is both feasible and expected. The core differentiator is not the scanning technology itself but the combination of extended measurements for custom shoe fitting, lead capture with Jolie's own brand size table, and a measurement-aware CRM follow-up — none of which mass-market competitors provide. This is a lead generation tool first, a measurement tool second.

The recommended architecture is: Next.js 15 on Vercel, OpenCV.js loaded as a self-hosted static asset in `/public/cv/`, all CV processing offloaded to a Web Worker, state managed via `useReducer` step machine, and leads persisted to Supabase via a server-side API route. This stack is well-validated, deployable in a day, and requires no server-side CV infrastructure. The full CV pipeline — A4 detection, perspective correction (homography), foot contour extraction, and measurement calculation — all runs client-side in the Web Worker, making the product free to scale regardless of user volume.

The biggest risks in this project are not architectural — they are physical-world edge cases that are invisible in desktop testing: iOS Safari's ultra-wide lens regression, EXIF orientation inconsistency, perspective distortion from non-overhead angles, and WASM memory leaks on retake. Every one of these must be built in from day one, not retrofitted. The research is unambiguous: skip any of these and the product will fail silently in real user conditions while appearing to work perfectly in development.

---

## Key Findings

### Recommended Stack

The stack is Next.js 15.5 (App Router), React 19, TypeScript 5.8, Tailwind CSS 4, `@techstark/opencv-js` 4.12.0, Supabase with `@supabase/ssr`, react-hook-form 7.70 with Zod 4 validation. OpenCV.js must be loaded from `/public/cv/` as a static asset — NOT from a CDN and NOT bundled via Webpack or Turbopack (Turbopack confirmed to not support WASM files as of Next.js 15.5). The `postinstall` script copies the WASM binary to the public folder at install time, making it Vercel-CDN-cacheable and sidesteps all bundler issues entirely.

**Core technologies:**
- **Next.js 15.5:** App framework, API routes, SSR landing page — trivial Vercel deployment, Server Actions for lead capture
- **@techstark/opencv-js 4.12.0:** Best-maintained npm OpenCV WASM wrapper — TypeScript types included, avoids manual CDN dependency
- **Supabase + @supabase/ssr:** Lead persistence via Postgres — anon insert only, RLS enforced, server-side client via API route keeps service key off browser
- **React 19 + useReducer:** Step wizard state machine — avoids scattered useState across the multi-step scan flow
- **Tailwind CSS 4:** CSS-first config, no `tailwind.config.js` required, native Next.js 15.2+ support
- **react-hook-form + Zod 4:** Lead capture form — minimal re-renders, schema validation before Supabase insert

**Critical version note:** Supabase dropped Node.js 18 in v2.79.0. Use Node.js 20+. Tailwind v4 and shadcn/ui are NOT compatible as of early 2026 — do not add shadcn.

### Expected Features

The competitor set (FeetSizr, mySHOEFITTER, Volumental, findmeashoe, Xesto) establishes clear table stakes. This product has significant whitespace on lead capture, branded experience, and custom size tables — areas where every competitor either lacks the feature or delegates it to retailers.

**Must have (table stakes):**
- Camera capture without app download — every competitor is browser-based; native app is a non-starter
- A4 paper reference calibration — industry standard; enables pixel-to-mm conversion
- Step-by-step guided scanning UX — apps without clear instructions fail repeatedly; abandonment is high
- Foot length + width measurement — baseline for any size recommendation
- Both feet capture (left and right separately) — foot asymmetry is common in larger-footed women; one-foot apps feel incomplete
- US/EU/UK size recommendation — the number users came for; raw mm means nothing at decision time
- Retake / retry option — first photos are commonly bad; no retry equals high abandonment
- Lead capture form (name, email, phone, current size) — this is the business purpose
- Supabase data persistence — Jolie needs measurements to follow up

**Should have (differentiators):**
- Extended measurements: arch length, toe box width, heel width — custom cobbling requires more than length/width; no mass-market app captures these
- Accuracy confidence indicator ("±Xmm") — 0% of reviewed pedorthic apps show this; builds trust, differentiates
- Brand-aligned UI (maroon #850321, cream #fffaef, Figtree/Poppins) — competitors are utilitarian; this must feel like part of the luxury experience
- Confirmation email with measurements and brand messaging — no competitor does this; high CRM value
- Shopify iframe embed — keeps users in purchase context on the storefront

**Defer (v2+):**
- Instep height / girth — requires a side-view photo or 3D sensor; not achievable from single top-down photo
- Measurement history / saved profile — low value for one-off custom order context
- PDF export — useful but low priority until pipeline is proven
- 3D visualization — requires depth sensor; honest contour overlay achieves the same trust without misleading users

### Architecture Approach

The architecture is a single Next.js app with three distinct execution contexts that must stay properly separated: (1) a Web Worker running all OpenCV computation off the main thread, (2) React client components owning the scan flow UI via useReducer state machine, and (3) a Next.js API route handling Supabase writes server-side. These boundaries are non-negotiable — running CV on the main thread freezes the UI, client-side Supabase writes bypass validation. The build order that minimizes blocked work is: CV Worker pipeline first (testable without UI), then CVWorkerBridge, then CameraCapture, then ScanFlow wizard, then MeasurementDisplay + LeadForm, then API route, then page assembly, then landing page, then Shopify embed last.

**Major components:**
1. **opencv.worker.ts** — All OpenCV: A4 detection, homography correction, foot contour extraction, measurement calculation. Lives in `/workers/`, loaded via postMessage. Self-contained with `importScripts`.
2. **CVWorkerBridge** — Facade class over Web Worker. Takes `ImageData`, returns `Promise<MeasurementResult>`. Isolates worker complexity from UI.
3. **ScanFlow (useReducer)** — Orchestrates the entire scan session: instructions → camera → processing → results → lead form → complete. Single state machine, no scattered useState.
4. **CameraCapture** — getUserMedia stream, viewfinder, photo trigger. Rear-facing camera with resolution hints to avoid ultra-wide lens.
5. **LeadForm** — react-hook-form + Zod validation, POSTs to `/api/measurements`
6. **/api/measurements route** — Server-side Supabase insert. Service role key never leaves server.
7. **Supabase** — Postgres leads table with RLS: anon insert only, no select.

### Critical Pitfalls

1. **iOS Safari ultra-wide lens regression (iOS 16.4+)** — `facingMode: "environment"` routes to the ultra-wide lens, causing 20-40% measurement error. Prevention: request specific resolution (`width: {ideal: 1920}`) to steer toward standard lens; add post-capture paper size validation to detect dimensional implausibility before user sees results.

2. **EXIF orientation rotates image 90 degrees before CV** — Portrait photos on Android/iOS have EXIF rotation metadata that canvas `drawImage()` handles inconsistently across browsers. CV pipeline receives a sideways image, detects wrong aspect ratio, produces swapped or incorrect measurements. Prevention: add `exifr` (3KB) as first step in CV pipeline, normalize orientation before any processing. Test on physical Android device — desktop testing will not catch this.

3. **OpenCV WASM memory leak crashes on retake** — OpenCV Mat objects are allocated in WASM heap and are NOT garbage collected by JavaScript. Each retake without `Mat.delete()` accumulates 20-80MB. Mobile Safari crashes at ~300MB. Prevention: wrap every scan operation in try/finally, delete all Mats in the finally block. Test with 5 consecutive retakes before shipping.

4. **Perspective distortion inflates foot length measurements** — Users hold phone at 45-70° angle instead of directly overhead. The pixel-per-mm calibration assumes orthographic projection. At 45° the error exceeds 8mm — enough to shift a shoe size recommendation. Prevention: apply `getPerspectiveTransform` + `warpPerspective` (homography correction) after A4 detection, before any measurement extraction. This is the accuracy foundation; skipping it produces wrong results for most real users.

5. **White floor causes A4 detection to fail completely** — The CV pipeline depends on contrast between the A4 paper and the floor. White tile, light hardwood, and cream carpet all cause threshold operations to merge paper and floor into one blob. Prevention: Step 1 of UX instructions must show an annotated photo of paper on a dark surface with explicit copy. Add a real-time preview warning if A4 detection confidence is low before capture.

---

## Implications for Roadmap

Based on research, the architecture has clear sequential dependencies. The CV pipeline must work before any UI is built. The scanning flow must work before Shopify embed. Extended measurements are additive to the core pipeline. These dependencies suggest a 4-phase structure:

### Phase 1: Core CV Pipeline + Camera Infrastructure

**Rationale:** Every other phase depends on working, accurate measurements. The CV pipeline has the most pitfalls and must be built first with all mitigations baked in from day one. Loading strategy, EXIF normalization, perspective correction, WASM memory management, and the Web Worker boundary all belong here. There is no point building UI until the measurements are accurate.

**Delivers:** A working OpenCV worker that accepts an ImageData of a foot on A4 paper and returns accurate measurements in millimeters. Testable via a simple HTML harness before any React/Next.js UI exists.

**Addresses:** Camera capture (getUserMedia with resolution hints), A4 reference calibration, foot contour extraction, foot length + width measurement

**Avoids:**
- OpenCV WASM memory leak (Mat.delete() in finally, built from start)
- EXIF orientation bug (exifr normalization as first pipeline step)
- Perspective distortion (homography correction mandatory)
- Main thread CV execution (Web Worker architecture from day one)
- iOS ultra-wide lens regression (resolution constraints + post-capture paper size validation)
- OpenCV.js bundle blocking load (public-folder static asset, lazy load in worker)

**Research flag:** Standard — OpenCV.js + Web Worker pattern is well-documented. CV pipeline algorithm sequence is proven by academic papers (OptiFit PMC) and open-source reference implementations (wildoctopus/FeetAndShoeMeasurement). No additional research needed.

---

### Phase 2: Scanning UX + Results Flow

**Rationale:** With accurate measurements available, build the full user-facing flow. The UX decisions here directly impact scan completion rate and lead conversion. This phase is where guided instructions (preventing white-floor failures, preventing angled shots) and the show-results-before-email pattern (preventing form abandonment) are implemented.

**Delivers:** Complete end-to-end scan experience: step-by-step instructions → camera viewfinder → photo capture → processing indicator → measurement results with contour overlay → retake option → lead capture form → confirmation screen.

**Addresses:** Guided scanning UX, both feet capture (left + right separate flows), measurement results display with contour overlay, retake/retry option, brand-aligned UI (maroon/cream/Figtree/Poppins), size recommendation display

**Avoids:**
- White floor failure (instruction copy + example photo showing dark surface)
- Form before value (lead form appears only after measurements are displayed)
- iOS permission re-ask on navigation (single-page navigation design, no hash changes between steps)
- CV processing freeze (ProcessingOverlay shown immediately on photo capture)
- Technical error messages shown to users (map all CV errors to actionable language)

**Research flag:** Standard — useReducer step machine is well-documented. Camera UX patterns are established. No additional research needed.

---

### Phase 3: Lead Capture, Supabase + Size Recommendation

**Rationale:** Lead capture is the business output. This phase wires the scan results to Supabase persistence and implements the US/EU/UK size recommendation lookup. The size table requires a content dependency from Jolie (her custom last sizes) — this must be flagged before the phase begins. Supabase RLS configuration is a security concern that must be done correctly on day one; there is no acceptable version of "we'll add security later."

**Delivers:** Lead capture form (react-hook-form + Zod), server-side Supabase insert via API route, US/EU/UK size recommendation from measurement-to-size lookup table, Supabase table with RLS enforced (anon insert only), brand-aligned confirmation screen.

**Addresses:** Lead capture form, data persistence, size recommendation, HTTPS deployment on Vercel

**Avoids:**
- Supabase RLS misconfiguration (insert-only policy, no anon SELECT, configured before any data is stored)
- Supabase service key exposure (server-side API route, never browser-client write)
- Email before value (form is shown only post-scan-acceptance, gated by measurement display)
- Missing privacy notice (one-sentence GDPR/CCPA disclosure on lead form)

**Content dependency:** Jolie's custom last size table (foot length/width → her size names) must be provided before this phase can be completed. A standard US/EU/UK lookup table can be scaffolded as a placeholder.

**Research flag:** Standard — Supabase + Next.js App Router patterns are fully documented. No additional research needed.

---

### Phase 4: Shopify Embed + Polish

**Rationale:** The Shopify iframe embed is architecturally the same app exposed via a different route. It must come last because (a) the standalone app must work correctly first, and (b) the `allow="camera"` permission policy requirement only matters in the cross-origin iframe context. This phase also covers extended measurements (arch, toe box, heel width), accuracy confidence indicator, and confirmation email — the differentiator features that elevate the product above competitors.

**Delivers:** Shopify iframe embed (CSP frame-ancestors headers, `allow="camera"` documented for Liquid snippet), extended measurements added to CV pipeline (arch length, toe box width, heel width), accuracy confidence indicator ("±Xmm" from calibration residual), confirmation email with measurements via Resend or Postmark.

**Addresses:** Shopify embed widget, extended measurement set, accuracy confidence indicator, confirmation email

**Avoids:**
- iframe camera permission blocked (embed route adds `allow="camera"` to Liquid docs; scanner detects iframe context and shows fallback if permission unavailable)
- Fixed iframe height causing clipped content (postMessage resize pattern or generous fixed height)

**Research flag:** The Shopify iframe integration has MEDIUM confidence per the architecture research. The `allow="camera"` requirement is confirmed, but the exact Shopify Liquid snippet setup and whether App Embed Blocks vs custom sections are needed depends on Jolie's Shopify theme. Recommend a brief research phase on the specific Shopify theme configuration before building the Liquid snippet.

---

### Phase Ordering Rationale

- **CV first, UI second:** The pipeline is the riskiest and most foundational part. Building UI before confirming measurement accuracy leads to rework.
- **Pitfalls baked in, not retrofitted:** EXIF normalization, homography correction, WASM memory cleanup, and iOS camera constraints all belong in Phase 1. None of these can be safely added later without regression risk.
- **Lead capture before Shopify embed:** The business value (leads) should be validated in the standalone experience before adding the complexity of cross-origin iframe permissions.
- **Shopify and extended features last:** These are additive and reversible. Phases 1-3 deliver a complete, shippable product.

### Research Flags

Needs research: Phase 4 (Shopify embed) — MEDIUM confidence on specific Liquid/App Embed Block configuration for Jolie's theme. A 30-minute research pass before starting that phase is recommended.

Standard patterns: Phase 1 (OpenCV.js + Web Worker), Phase 2 (scanning UX step machine), Phase 3 (Supabase + Next.js lead capture)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via official docs, npm, and confirmed GitHub issues. Public-folder WASM loading pattern verified as the correct approach for Turbopack environments. |
| Features | HIGH (table stakes) / MEDIUM (differentiators) | Competitor feature matrix is comprehensive. Custom shoe fitting context is niche — extended measurement value is inferred from cobbler requirements, not validated by user research. |
| Architecture | HIGH | Web Worker + step machine + server-side Supabase insert patterns are well-documented with multiple reference implementations. Shopify iframe is MEDIUM. |
| Pitfalls | HIGH | 8 of 8 critical pitfalls are confirmed via official bug trackers, academic literature, or multiple community sources. iOS ultra-wide regression has a specific WebKit bug number. Memory leak pattern is confirmed by OpenCV.js maintainers. |

**Overall confidence:** HIGH

### Gaps to Address

- **Jolie's custom size table:** The size recommendation cannot be completed without a foot length/width → Jolie's last size mapping. This is a content dependency, not a technical one. Must be resolved before Phase 3 is complete.
- **Target floor surfaces in the real user environment:** The white-floor A4 detection failure depends heavily on where Jolie's customers will be scanning. If her target audience primarily has light flooring, the manual corner-tap fallback (currently deferred) may need to be promoted to v1.
- **Shopify theme specifics:** The Shopify embed configuration depends on whether Jolie's theme supports App Embed Blocks or requires a custom Liquid section. Not resolved by research — needs a brief check before Phase 4.
- **Extended measurement accuracy on unusual foot shapes:** Arch length, toe box width, and heel width from a single top-down image are achievable but may produce unreliable results for very wide, narrow, or high-arched feet. Flag these measurements as "estimated" in the UI (not "measured") until real-device validation confirms accuracy.

---

## Sources

### Primary (HIGH confidence)
- Next.js 15.5 Release Blog / Turbopack Docs — WASM limitations, public-folder pattern confirmed
- @techstark/opencv-js GitHub — version 4.12.0, TypeScript types, browser webpack fallbacks
- Supabase Next.js Quickstart / @supabase/ssr docs — server client pattern, publishable key format
- Tailwind CSS v4 Install for Next.js — CSS-first config, PostCSS plugin
- Zod v4 Release Notes — available July 2025, `zod/v4` import
- PMC: Mobile Apps for Foot Measurement in Pedorthic Practice — competitor feature coverage
- PMC: OptiFit — calibration accuracy display method, CV pipeline sequence
- WebKit Bug 253186 — iOS 16.4 ultra-wide facingMode regression confirmed
- OpenCV.js memory management documentation — Mat.delete() requirement confirmed
- wildoctopus/FeetAndShoeMeasurement — reference implementation, known limitations documented

### Secondary (MEDIUM confidence)
- FeetSizr, mySHOEFITTER, Xesto, findmeashoe, Volumental — competitor feature analysis via product pages
- Turbopack WASM issue #84972 — "turbopack doesn't support wasm files" (community GitHub, confirmed active)
- OpenCV Q&A Forum — WASM bundle size, custom build options
- Shopify Community — iframe camera permission and allow="camera" attribute requirement
- WebKit Bug 215884 — getUserMedia permission recurring prompts in PWA

### Tertiary (LOW confidence)
- avatar3d.tech market overview — general landscape summary, not verified granularly
- Perfitt Blog — 31% return rate and 20%+ conversion lift from fit tools (marketing source, cited for context not accuracy)

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
