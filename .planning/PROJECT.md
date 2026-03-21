# If The Shoe Fits — Foot Scanner

## What This Is

A browser-based foot scanning web app for "If The Shoe Fits" (iftheshoefits.co), a custom footwear brand by Jolie Wyatt specializing in designer heels for larger sizes. Users open the scanner on their phone, place their foot on A4 paper, and get accurate foot measurements via OpenCV.js computer vision — no app download required. The tool captures leads (contact info, measurements, 3D foot model) for Jolie's custom fitting pipeline. Jolie and her cobbler access an admin portal to manage scans and download STL files.

## Core Value

Users can accurately measure their feet from their phone browser and submit their measurements + contact info for custom shoe fitting.

## Requirements

### Validated

- ✓ Phone camera capture via getUserMedia API (iOS Safari + Android Chrome) — v1.0
- ✓ A4 paper reference object calibration (210mm x 297mm) — v1.0
- ✓ OpenCV.js CV pipeline in Web Worker: HSV, blur, segmentation, edge detection, contour analysis — v1.0
- ✓ Full measurement extraction: length, width, arch, toe box, heel — v1.0
- ✓ EXIF rotation normalization for cross-device accuracy — v1.0
- ✓ Pixel-to-mm conversion with accuracy confidence indicator — v1.0
- ✓ US/EU/UK shoe size recommendation from measurements — v1.0
- ✓ Guided scanning UX with step-by-step wizard — v1.0
- ✓ 3D parametric foot model with interactive rotation/zoom (Three.js) — v1.0
- ✓ STL export + Supabase Storage persistence — v1.0
- ✓ Lead capture form: first name, email, phone, current size — v1.0
- ✓ Measurement data persistence to Supabase — v1.0
- ✓ Admin portal with scan management, status tracking, cobbler invite — v1.0
- ✓ Brand-aligned UI: maroon #850321, cream #fffaef, Figtree + Poppins — v1.0
- ✓ Standalone web app on Vercel with HTTPS — v1.0
- ✓ Embeddable iframe version with cross-origin camera support for Shopline — v1.0

### Active

(None — define next milestone with `/gsd:new-milestone`)

### Out of Scope

- 3D photogrammetry / full 3D scanning — parametric model from measurements is sufficient
- LiDAR scanning — limits to iPhone Pro only, excludes most users
- Native mobile app — web browser camera API works on all modern phones
- Real-time video stream processing — single photo capture is simpler and more reliable
- Product recommendations — Jolie makes custom orders, not SKU-based inventory
- Payment processing — this is a lead capture tool, not a checkout flow
- Account creation for customers — lead capture form is enough
- Multi-language — no evidence of non-English customer base

## Context

Shipped v1.0 with 28,812 LOC across 153 files (TypeScript/Next.js).
Tech stack: Next.js 16 + OpenCV.js + Three.js + TailwindCSS + Supabase — deployed on Vercel.

**Known tech debt:**
- 47 test.todo() stubs need real implementations
- Human verification deferred (camera UX, 3D model, admin portal, Vercel deploy, iframe camera)
- Jolie's custom last size table is placeholder — needs real data
- White floor A4 detection may fail — dark surface requirement in UX instructions

## Constraints

- **Tech Stack**: Next.js + OpenCV.js + TailwindCSS + Supabase — deployed on Vercel
- **Browser Compatibility**: iOS Safari 15+ and Android Chrome — getUserMedia requires HTTPS
- **Reference Object**: A4 paper (most proven calibration method)
- **No Deep Learning**: OpenCV.js classical CV only — no TensorFlow.js or model downloads
- **Brand**: Must match iftheshoefits.co visual identity — maroon #850321 + cream #fffaef

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| A4 paper over credit card as reference | More surface area = better calibration; proven in open-source projects | ✓ Good |
| OpenCV.js over TensorFlow.js | No model download, classical CV sufficient, faster load | ✓ Good |
| Supabase for data storage | Free tier, Postgres, easy setup, scales later | ✓ Good |
| Next.js over plain React | SSR for landing page SEO, API routes for Supabase, easy Vercel deploy | ✓ Good |
| Single photo capture over video stream | Simpler, more reliable, user verifies quality before processing | ✓ Good |
| Web Worker for CV processing | Prevents UI freeze on mobile devices | ✓ Good |
| Procedural GLB via binary GLTF writer | Avoids FileReader browser API dependency in Node.js GLTFExporter | ✓ Good |
| getUser() over getSession() for auth | getSession() doesn't validate JWT server-side — security vulnerability | ✓ Good |
| STL export independent of R3F Canvas | Re-runs GLTFLoader+deformation independently — avoids prop drilling | ✓ Good |
| Belt-and-suspenders headers (vercel.json + next.config.ts) | CDN edge headers + runtime parity for iframe camera | ✓ Good |

---
*Last updated: 2026-03-21 after v1.0 milestone*
