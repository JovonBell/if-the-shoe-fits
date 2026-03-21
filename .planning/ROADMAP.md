# Roadmap: If The Shoe Fits — Foot Scanner

## Overview

Four phases deliver a browser-based foot scanning tool for Jolie Wyatt's custom footwear business. The CV pipeline is built first because everything depends on accurate measurements. Once the pipeline is proven, the full scan UX and 3D results display layer on top. The data persistence, lead capture, and manufacturer portal ship together as the business backend. Shopify embed and deployment finalize the integration. Phases 1-3 deliver a complete, shippable product; Phase 4 puts it in front of Jolie's customers on her existing storefront.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: CV Pipeline** - Working OpenCV.js worker that accepts a foot-on-A4 photo and returns accurate measurements in millimeters
- [ ] **Phase 2: Scan UX + 3D Results** - Complete user-facing scan flow from camera capture through 3D model display
- [ ] **Phase 3: Data, Leads + Manufacturer Portal** - Lead persistence, size recommendation, and Jolie's admin portal for managing customer records
- [ ] **Phase 4: Deployment + Shopify Embed** - Ship to Vercel at a dedicated URL and embed on the Shopify storefront

## Phase Details

### Phase 1: CV Pipeline
**Goal**: A working OpenCV.js web worker returns accurate foot measurements from a single photo, with all critical mobile pitfalls mitigated from day one
**Depends on**: Nothing (first phase)
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07, SCAN-08, SCAN-09, SCAN-10, SCAN-11, SCAN-12, SCAN-13
**Success Criteria** (what must be TRUE):
  1. User can open the app on iOS Safari or Android Chrome, grant camera permission, and capture a photo without the app freezing the browser UI
  2. App detects the A4 paper reference and reports a pixel-to-mm calibration with an accuracy confidence indicator ("±Xmm")
  3. App extracts foot length, width, arch length, toe box width, and heel width from a single overhead photo with the correct orientation regardless of device or EXIF metadata
  4. User can discard a bad photo and retake without the app crashing or producing degraded measurements on the second attempt
  5. Both left and right feet can be scanned in the same session, producing separate measurement sets
**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js 15 project + install dependencies + create all test stubs
- [ ] 01-02-PLAN.md — Type contracts (MeasurementResult), EXIF normalization, camera constraints, ScanSession, useCamera hook
- [ ] 01-03-PLAN.md — A4 paper detection, perspective correction (warpPerspective), calibration accuracy
- [ ] 01-04-PLAN.md — Foot contour extraction (HSV segmentation) + all 5 measurement calculations
- [ ] 01-05-PLAN.md — Full opencv.worker.ts pipeline assembly + CVWorkerBridge facade
- [ ] 01-06-PLAN.md — Minimal test harness page + human verification on physical device

### Phase 2: Scan UX + 3D Results
**Goal**: Users move through a guided scan experience and see their measurements visualized — including an interactive 3D foot model — before being asked for their contact information
**Depends on**: Phase 1
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, 3DM-01, 3DM-02, 3DM-03
**Success Criteria** (what must be TRUE):
  1. User sees step-by-step instructions with visual overlays showing correct foot and paper placement before touching the camera
  2. Results page displays all six measurements with a contour overlay on the captured photo, a US/EU/UK size recommendation, and empowerment messaging — without requiring any form submission first
  3. A 3D parametric foot model renders in-browser with interactive rotation and zoom, anatomically scaled to the user's measurements
  4. The entire UI matches the iftheshoefits.co brand (maroon #850321, cream #fffaef, Figtree and Poppins fonts) and is legible and usable on a phone screen
  5. When left and right foot measurements differ, the size recommendation uses the larger foot
**Plans**: TBD

### Phase 3: Data, Leads + Manufacturer Portal
**Goal**: Every completed scan creates a customer record in Supabase — including contact info, all measurements, and the STL file — and Jolie and her cobbler can log in to view, manage, and download those records
**Depends on**: Phase 2
**Requirements**: LEAD-01, LEAD-02, LEAD-03, 3DM-04, 3DM-05, MFR-01, MFR-02, MFR-03, MFR-04, MFR-05
**Success Criteria** (what must be TRUE):
  1. After viewing results, user completes a lead form (first name, email, phone, current size) and their complete record — contact info, measurements, timestamp — is stored in Supabase
  2. User can download their 3D foot model as an STL file; the same file is stored in Supabase Storage linked to their customer record
  3. Jolie can log in to a password-protected portal, see a list of all customer scans with measurements and contact info, and download any customer's STL file
  4. Portal shows order status for each customer (new, in-progress, completed, shipped) and Jolie can update it
  5. Jolie can invite her cobbler to access the portal; no customer can access the portal
**Plans**: TBD

### Phase 4: Deployment + Shopify Embed
**Goal**: The scanner is live at a dedicated HTTPS URL and embeddable inside Jolie's Shopify storefront with camera permission working in the iframe context
**Depends on**: Phase 3
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. The standalone scanner app is accessible at a public HTTPS URL (e.g., scan.iftheshoefits.co) with camera permission granted automatically on iOS Safari and Android Chrome
  2. The scanner works as an embedded iframe on the Shopify storefront — camera permission is not blocked by the cross-origin iframe context
  3. Jolie can paste a provided Liquid snippet into her Shopify theme and the scanner appears without additional configuration
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CV Pipeline | 3/6 | In Progress|  |
| 2. Scan UX + 3D Results | 0/TBD | Not started | - |
| 3. Data, Leads + Manufacturer Portal | 0/TBD | Not started | - |
| 4. Deployment + Shopify Embed | 0/TBD | Not started | - |
