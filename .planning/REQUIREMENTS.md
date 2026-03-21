# Requirements: If The Shoe Fits — Foot Scanner

**Defined:** 2026-03-21
**Core Value:** Users can accurately measure their feet from their phone browser, receive a 3D parametric foot model, and submit their data for custom shoe production.

## v1 Requirements

### Scanning Core

- [x] **SCAN-01**: User can capture foot photo using phone camera via getUserMedia (iOS Safari + Android Chrome)
- [x] **SCAN-02**: App detects A4 paper reference object and calibrates pixel-to-mm conversion (210mm x 297mm)
- [x] **SCAN-03**: App extracts foot contour using OpenCV.js (HSV conversion, Gaussian blur, segmentation, Canny edge detection)
- [x] **SCAN-04**: App calculates foot length from contour against calibrated reference
- [x] **SCAN-05**: App calculates foot width from contour at widest point
- [x] **SCAN-06**: App calculates arch length from contour geometry
- [x] **SCAN-07**: App calculates toe box width from contour near hallux region
- [x] **SCAN-08**: App calculates heel width from contour at heel region
- [x] **SCAN-09**: User can capture left foot and right foot separately (two scans)
- [x] **SCAN-10**: App displays accuracy confidence indicator after calibration ("±Xmm accuracy")
- [x] **SCAN-11**: User can retake/retry photo before processing
- [x] **SCAN-12**: App normalizes EXIF rotation before processing (prevents Android measurement corruption)
- [x] **SCAN-13**: App runs OpenCV.js in Web Worker (prevents UI freeze on mobile)

### 3D Model Generation

- [x] **3DM-01**: App generates parametric 3D foot model from extracted measurements (length, width, arch, toe box, heel)
- [x] **3DM-02**: 3D model displays in-browser with interactive rotation/zoom (Three.js)
- [x] **3DM-03**: 3D model is anatomically scaled using a template foot mesh deformed by measurements
- [ ] **3DM-04**: App exports 3D foot model as downloadable STL file
- [ ] **3DM-05**: STL file is uploaded and stored in Supabase Storage linked to customer record

### User Experience

- [ ] **UX-01**: Step-by-step guided scanning instructions with visual overlays showing correct foot placement
- [ ] **UX-02**: Results page displays all measurements (length, width, arch, toe box, heel) with contour overlay on photo
- [x] **UX-03**: US/EU/UK shoe size recommendation from measurements
- [x] **UX-04**: Brand-aligned UI: maroon #850321, cream #fffaef, Figtree + Poppins fonts
- [ ] **UX-05**: "Designed for outliers" empowerment messaging throughout the flow
- [x] **UX-06**: Recommendation uses larger foot when left/right differ
- [ ] **UX-07**: Mobile-first responsive design optimized for phone screens

### Lead Capture + Data

- [ ] **LEAD-01**: User submits contact form after seeing results: first name, email, phone, current shoe size
- [ ] **LEAD-02**: Measurements + contact info + STL file reference persisted to Supabase
- [ ] **LEAD-03**: Each scan creates a complete customer record (contact + measurements + 3D model + timestamp)

### Manufacturer Portal

- [ ] **MFR-01**: Jolie + cobbler can log in to a password-protected admin portal
- [ ] **MFR-02**: Portal displays list of customer scans with measurements and contact info
- [ ] **MFR-03**: Portal allows viewing and downloading STL files for each customer
- [ ] **MFR-04**: Portal has order status management (new → in-progress → completed → shipped)
- [ ] **MFR-05**: Portal is invite-only (Jolie creates accounts for her cobbler)

### Deployment + Integration

- [ ] **DEPLOY-01**: App deployed on Vercel with HTTPS (required for camera API)
- [ ] **DEPLOY-02**: Standalone web app works at dedicated URL (e.g., scan.iftheshoefits.co)
- [ ] **DEPLOY-03**: Embeddable iframe version works inside Shopify storefront with allow="camera"
- [ ] **DEPLOY-04**: Shopify Custom Liquid section snippet provided for easy embedding

## v2 Requirements

### Enhanced Measurements

- **ENH-01**: Side-view photo capture for accurate instep height/girth measurement
- **ENH-02**: Multi-scan comparison (before/after, left/right overlay)

### Communications

- **COMM-01**: Confirmation email with measurements + brand voice sent after submission (Resend/Postmark)
- **COMM-02**: Status update emails when order moves through pipeline (in-progress, shipped)

### Advanced Portal

- **ADV-01**: PDF export of customer measurements for cobbler
- **ADV-02**: Measurement history / saved customer profiles
- **ADV-03**: Analytics dashboard (scans per day, conversion rate, popular sizes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| True 3D photogrammetry from photos | Requires depth sensor or months of ML; parametric model from measurements is sufficient |
| LiDAR scanning | Limits to iPhone Pro only, excludes most users |
| Native mobile app | Web browser camera API works on all modern phones |
| Real-time video stream processing | Single photo capture is simpler, more reliable, less battery drain |
| Product recommendations at scan time | Jolie makes custom orders, not SKU-based inventory |
| Account creation for customers | Adds friction; lead capture form is enough |
| Social sharing of measurements | Awkward for luxury brand; share the brand, not foot data |
| Multi-language | No evidence of non-English customer base |
| Payment processing | This is a lead capture + production tool, not checkout |
| Multiple manufacturer marketplace | Only Jolie + cobbler need access; keep it simple |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAN-01 | Phase 1 | Complete |
| SCAN-02 | Phase 1 | Complete |
| SCAN-03 | Phase 1 | Complete |
| SCAN-04 | Phase 1 | Complete |
| SCAN-05 | Phase 1 | Complete |
| SCAN-06 | Phase 1 | Complete |
| SCAN-07 | Phase 1 | Complete |
| SCAN-08 | Phase 1 | Complete |
| SCAN-09 | Phase 1 | Complete |
| SCAN-10 | Phase 1 | Complete |
| SCAN-11 | Phase 1 | Complete |
| SCAN-12 | Phase 1 | Complete |
| SCAN-13 | Phase 1 | Complete |
| 3DM-01 | Phase 2 | Complete |
| 3DM-02 | Phase 2 | Complete |
| 3DM-03 | Phase 2 | Complete |
| 3DM-04 | Phase 3 | Pending |
| 3DM-05 | Phase 3 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Complete |
| UX-04 | Phase 2 | Complete |
| UX-05 | Phase 2 | Pending |
| UX-06 | Phase 2 | Complete |
| UX-07 | Phase 2 | Pending |
| LEAD-01 | Phase 3 | Pending |
| LEAD-02 | Phase 3 | Pending |
| LEAD-03 | Phase 3 | Pending |
| MFR-01 | Phase 3 | Pending |
| MFR-02 | Phase 3 | Pending |
| MFR-03 | Phase 3 | Pending |
| MFR-04 | Phase 3 | Pending |
| MFR-05 | Phase 3 | Pending |
| DEPLOY-01 | Phase 4 | Pending |
| DEPLOY-02 | Phase 4 | Pending |
| DEPLOY-03 | Phase 4 | Pending |
| DEPLOY-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 37 total (REQUIREMENTS.md header stated 30; actual count is 37 across all 6 categories)
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation — traceability populated*
