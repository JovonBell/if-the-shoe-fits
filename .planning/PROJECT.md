# If The Shoe Fits — Foot Scanner

## What This Is

A browser-based foot scanning web app for "If The Shoe Fits" (iftheshoefits.co), a custom footwear brand by Jolie Wyatt specializing in designer heels for larger sizes. Users open the scanner on their phone, place their foot on a sheet of A4 paper, and get accurate foot measurements using computer vision — no app download required. The tool captures leads (email, phone, measurements) for Jolie's custom fitting pipeline.

## Core Value

Users can accurately measure their feet from their phone browser and submit their measurements + contact info for custom shoe fitting.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Phone camera capture via getUserMedia API (iOS Safari + Android Chrome)
- [ ] Reference object calibration using A4 paper (known dimensions: 210mm x 297mm)
- [ ] Computer vision pipeline: HSV conversion, Gaussian blur, segmentation, edge detection, contour analysis
- [ ] Full measurement extraction: foot length, width, arch length, instep height, toe box width, heel width
- [ ] Pixel-to-mm conversion using A4 reference dimensions
- [ ] US/EU/UK shoe size recommendation from measurements
- [ ] Guided scanning UX with visual instructions (step-by-step)
- [ ] Lead capture form: email, phone number, current shoe size preference
- [ ] Measurement data persistence to Supabase
- [ ] Standalone web app deployable to Vercel
- [ ] Embeddable version (iframe/widget) for Shopify integration
- [ ] Brand-aligned UI matching iftheshoefits.co aesthetic

### Out of Scope

- 3D photogrammetry / full 3D foot model — overkill for MVP, requires months of ML work
- LiDAR-based scanning — limits to iPhone Pro only
- Native mobile app — web-first, camera API works on modern browsers
- Real-time video stream processing — single photo capture is simpler and more reliable
- Shopify product recommendations — v2 feature, MVP is scan + lead capture
- Payment processing — this is a lead capture tool, not a checkout flow

## Context

- **Brand**: If The Shoe Fits by Jolie Wyatt — custom designer heels for larger sizes (typically 10+)
- **Existing site**: iftheshoefits.co on Shopify, brand colors: maroon #850321 + cream #fffaef, fonts: Figtree + Poppins
- **Target users**: Women with larger feet who struggle to find properly fitting shoes in retail
- **Proven approach**: FeetSizr, Volumental, and open-source projects (wildoctopus/FeetAndShoeMeasurement) all use the A4-paper-as-reference-object method with OpenCV
- **Key technical insight**: OpenCV.js runs entirely in-browser — no server-side processing needed for the CV pipeline
- **Custom fitting need**: Jolie makes custom shoes, so full measurements (instep, toe box, heel width) are more valuable than just length/width

## Constraints

- **Timeline**: MVP buildable in one night session
- **Tech Stack**: Next.js + OpenCV.js + TailwindCSS + Supabase — deployed on Vercel
- **Browser Compatibility**: Must work on iOS Safari 15+ and Android Chrome — getUserMedia requires HTTPS
- **Reference Object**: A4 paper (most proven calibration method from research)
- **No Deep Learning**: OpenCV.js classical CV only — k-means clustering + Canny edge detection + contour analysis. No TensorFlow.js or model downloads.
- **Brand**: Must match iftheshoefits.co visual identity — maroon #850321 + cream #fffaef

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| A4 paper over credit card as reference | More surface area = better calibration; proven in multiple open-source projects | — Pending |
| OpenCV.js over TensorFlow.js | No model download needed, classical CV sufficient for controlled conditions, faster load | — Pending |
| Supabase for data storage | Free tier, Postgres, easy to set up tonight, scales later | — Pending |
| Next.js over plain React | SSR for landing page SEO, API routes for Supabase, easy Vercel deploy | — Pending |
| Single photo capture over video stream | Simpler, more reliable, user can verify photo quality before processing | — Pending |
| Standalone + embeddable | Standalone app works immediately; embed version lets Jolie add to Shopify later | — Pending |

---
*Last updated: 2026-03-21 after initialization*
