# Feature Research

**Domain:** Browser-based foot scanning / shoe measurement for custom footwear brand
**Researched:** 2026-03-21
**Confidence:** HIGH for table stakes (well-established competitor set); MEDIUM for differentiators (custom shoe brand context is niche)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Camera capture without app download | Users will not install an app for a one-time size check — every modern competitor (FeetSizr, findmeashoe, mySHOEFITTER) is browser-based | LOW | getUserMedia API, HTTPS required; works iOS Safari 15+ and Android Chrome |
| Reference object calibration | Every 2D scanning solution uses a known-size reference — A4 paper is industry standard | LOW | A4: 210x297mm; must verify all four corners visible |
| Foot length measurement | 50% of reviewed pedorthic apps measure length; it is the primary sizing input | LOW | Contour analysis against calibrated reference |
| Foot width measurement | 42% of reviewed apps measure width; "wide" and "narrow" are critical fit signals | LOW | Widest contour point; essential for wider-foot audience |
| US/EU/UK size recommendation | Users need a number they recognize — raw mm means nothing at point of decision | LOW | Lookup table from length; include both length and width for full recommendation |
| Step-by-step guided scanning flow | Studies show apps with minimal instructions fail repeatedly — users abandon | MEDIUM | Clear numbered steps, visual overlay showing correct foot placement on paper |
| Retake / retry option | First photos are commonly bad (lighting, angle, partial foot) — no retry = high abandonment | LOW | Allow re-capture before processing; show preview before submitting |
| Left and right foot capture | Feet differ in size; recommending off one foot risks mis-fit — FeetSizr and Xesto both do both | MEDIUM | Process both; show both measurements; base recommendation on larger foot |
| Measurement results display | Users need to see what was found — a raw "size 10" output without the underlying data feels like a black box | LOW | Display: length, width, recommended size at minimum |
| Lead capture (email + contact) | This is the business purpose — no lead capture = no pipeline for Jolie | LOW | Simple form post-scan: first name, email, phone, current size reference |
| Data persistence | Measurements need to land somewhere for Jolie to act on | MEDIUM | Supabase insert with timestamp, measurements, contact info |
| HTTPS delivery | getUserMedia camera API hard-fails without HTTPS in all modern browsers | LOW | Vercel provides HTTPS by default |

### Differentiators (Competitive Advantage)

Features that set If The Shoe Fits apart. Competitors optimized for mass retail; this product serves a niche that competitors ignore.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Extended measurement set (arch, instep, toe box, heel width) | Custom cobbling requires more than length + width — Jolie needs these to cut a last; no mass-market app captures instep or toe box as primary output | HIGH | Instep height and girth require side/angled photo or estimation from top-down geometry; toe box requires careful contour analysis near hallux |
| Custom sizing recommendation for brand's own size range | Most tools recommend based on off-the-shelf brand catalogs; Jolie's sizes are non-standard (10+) with her own fit logic | MEDIUM | Map measurements to Jolie's own last sizes rather than standard tables |
| Explicit "larger size" messaging + context | Target user has been told "we don't carry your size" their whole life — acknowledging this builds trust before a single photo is taken | LOW | Copy and UX tone; no technical complexity |
| Accuracy confidence indicator | Only 0% of reviewed pedorthic apps show accuracy confidence (PMC study); OptiFit is the only tool that does this — showing calibration quality differentiates as trustworthy | MEDIUM | After CV processing, compute calibration residual error and show it: "Measured with ±2mm accuracy" |
| Branded, premium visual design | Competitor tools are generic white-label or clinical; If The Shoe Fits brand (maroon #850321, cream #fffaef, Figtree/Poppins) should make the tool feel like part of the luxury experience | MEDIUM | TailwindCSS + brand tokens; most competitors look utilitarian |
| Measurement-aware confirmation email | Aetrex emails foot data to users; combining that with Jolie's brand voice and a personal follow-up hook creates a CRM touch competitors do not have | MEDIUM | Triggered email via Supabase webhook or API route; include measurements, size recommendation, and "Jolie will be in touch" message |
| Shopify-embeddable widget | Keeps users in purchase context; reduces drop-off vs linking to external tool | MEDIUM | iframe or postMessage embed; standard viewport meta required for mobile |
| Scanning for both feet independently | Users with asymmetric feet (common in larger-footed women) benefit from seeing both scans; most apps collapse this to "larger foot" recommendation without showing both | MEDIUM | UI for left/right toggle; store both measurements, display diff |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific product at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 3D photogrammetry / 3D foot model | Looks impressive; Xesto does it | Requires LiDAR or FaceID depth camera (iPhone X+), excludes Android entirely; months of ML model work; overkill for custom shoe fitting where a skilled shoemaker interprets measurements anyway | High-quality 2D top-down with full measurement set is sufficient for custom last creation |
| Real-time video stream measurement | Feels more sophisticated than single photo | Continuous video processing is CPU-intensive in-browser; adds latency, battery drain, complexity; single captured frame is more controllable and matches what every A4-calibration app does | Single-frame capture with quality guidance before capture |
| Automatic bad-lighting detection before capture | Solves real user problem | Adds significant JS complexity (histogram analysis, brightness thresholds); high false-positive rate; better UX ROI in clear instructions | Bold text instruction: "Take in good lighting, avoid shadows across the paper" |
| Foot shape 3D visualization | Xesto shows 3D point cloud; impressive demo feature | No depth sensor = no real 3D; fake 3D from 2D image is misleading and erodes trust when user notices imprecision | Show measured contour overlay on captured photo — honest and technically achievable |
| Product recommendations at scan time | Natural upsell moment | Requires linking measurements to Shopify inventory; Jolie does not have a large catalog (custom orders, not SKU-based) | Lead capture + personal follow-up IS the recommendation flow for a custom brand |
| Account creation / password auth | Enables measurement history | Adds friction before users see value; most users will not return multiple times; the "Size ID" concept (FeetSizr) works for mass retail, not custom one-off orders | Collect email for lead purposes; measurements are stored in Supabase with a session token in URL if needed for reference |
| Social sharing of measurements | FeetSizr / Xesto allow sharing for gift-giving | Sharing raw foot measurements is awkward and has very low usage; wrong audience for a luxury custom heel brand | Share CTA for the brand itself ("Tag us when your custom heels arrive") not the measurements |
| Multi-language localization | Looks professional | Zero evidence Jolie's current customer base is non-English; adds content maintenance overhead | English first; add later only if data shows non-English traffic |

---

## Feature Dependencies

```
Camera Capture (getUserMedia)
    └──requires──> HTTPS delivery
    └──requires──> Camera permission granted by user
                       └──requires──> Permission denied recovery flow (instructions to re-enable)

Reference Object Detection (A4 paper corners)
    └──requires──> Camera Capture (frame to process)
    └──requires──> Adequate lighting (user responsibility, guided by instructions)

Foot Contour Extraction
    └──requires──> Reference Object Detection (for pixel-to-mm calibration)
    └──requires──> Dark sock or bare foot on white paper (contrast requirement)

Measurement Calculation (length, width, arch, toe box, heel width)
    └──requires──> Foot Contour Extraction
    └──enables──>  Accuracy Confidence Indicator (calibration residual)
    └──enables──>  Size Recommendation (length + width → size table)
    └──enables──>  Extended measurements (arch, instep — additional geometry from same contour)

Left + Right Foot Flow
    └──requires──> Measurement Calculation (must run twice)
    └──enables──>  Asymmetry detection (diff between feet)
    └──enables──>  Recommendation based on larger foot (best practice)

Size Recommendation
    └──requires──> Measurement Calculation
    └──requires──> Brand size table (Jolie's custom last sizes)

Lead Capture Form
    └──requires──> Size Recommendation (user sees value before form)
    └──enables──>  Data Persistence (form submission → Supabase)
    └──enables──>  Confirmation Email (trigger on form submit)

Data Persistence (Supabase)
    └──requires──> Lead Capture Form submission
    └──requires──> Measurement Calculation results

Shopify Embed (iframe/widget)
    └──requires──> Standalone app working correctly first
    └──requires──> postMessage API or URL param for returning measurement data to parent window

Confirmation Email
    └──requires──> Lead Capture (email address)
    └──requires──> Data Persistence (measurement values to include)
```

### Dependency Notes

- **Size Recommendation requires Brand Size Table:** Jolie needs to supply her own sizing chart mapping foot length/width to her custom last sizes — this is a content dependency, not a technical one, but it must exist before the recommendation UI is meaningful.
- **Lead Capture requires Size Recommendation:** Users should see their scan result before the form appears. Asking for email before showing value is a primary conversion killer (confirmed in mySHOEFITTER's flow: show size first, capture email to unlock brand details).
- **Shopify Embed requires Standalone first:** Build standalone app; embed is a thin wrapper. Never reverse this order.
- **Extended measurements conflict with accuracy display:** Instep height from a single top-down image is an estimate, not a measurement — displaying high accuracy confidence on a derived value is misleading. Flag instep/arch as "estimated" vs measured in the UI.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — validate that users complete the scan and submit their contact info.

- [ ] Camera capture via getUserMedia (iOS Safari + Android Chrome) — without this there is no product
- [ ] A4 paper reference calibration — industry-proven; enables pixel-to-mm conversion
- [ ] Top-down single photo capture with guided UX (step-by-step instructions, visual overlay) — drives completion rate
- [ ] Foot contour extraction: length + width — the two measurements every competitor provides; baseline for size recommendation
- [ ] Both feet capture (left and right, separate photos) — one-foot-only apps feel incomplete to users who know their feet differ
- [ ] US/EU/UK size recommendation from length + width — the number users came for
- [ ] Measurement results display with contour overlay on photo — shows CV worked; builds trust
- [ ] Lead capture form: first name, email, phone, current size preference — this is the business output
- [ ] Supabase persistence of measurements + contact data — Jolie needs this to follow up
- [ ] Brand-aligned UI: maroon + cream, Figtree/Poppins — it lives on her site; must feel native
- [ ] HTTPS + Vercel deployment — hard requirement for camera API

### Add After Validation (v1.x)

Add once v1 is live and users are completing scans.

- [ ] Extended measurements: arch length, toe box width, heel width — add after confirming CV pipeline is stable; these require additional contour geometry that can fail on unusual foot shapes
- [ ] Accuracy confidence indicator ("±Xmm") — add once measurement quality is validated in real conditions; requires calibration residual calculation
- [ ] Confirmation email with measurements — high value CRM touch; add once Supabase is confirmed working and email provider (Resend / Postmark) is set up
- [ ] Shopify embed / iframe version — add once standalone is stable and Jolie wants it on the storefront

### Future Consideration (v2+)

Defer until product-market fit with the scan-to-lead pipeline is established.

- [ ] Instep height / girth estimation — requires either a second photo (side view) or 3D sensor; not achievable from single top-down photo without error; defer until measurement value is proven
- [ ] Measurement history / saved profile (session token in URL) — low value for one-off custom order context; build only if repeat customers are significant
- [ ] Multi-scan comparison (before/after, left/right overlay) — clinical use case, not relevant for initial custom shoe lead capture
- [ ] PDF export of measurements — useful for Jolie to print and hand to her cobbler; low-effort v2 feature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Camera capture + HTTPS | HIGH | LOW | P1 |
| A4 reference calibration | HIGH | LOW | P1 |
| Guided scanning UX (step-by-step) | HIGH | LOW | P1 |
| Foot contour + length/width | HIGH | MEDIUM | P1 |
| Both feet capture | HIGH | MEDIUM | P1 |
| Size recommendation display | HIGH | LOW | P1 |
| Lead capture form | HIGH | LOW | P1 |
| Supabase persistence | HIGH | LOW | P1 |
| Brand-aligned UI | MEDIUM | MEDIUM | P1 |
| Contour overlay on photo | MEDIUM | MEDIUM | P1 |
| Retake / retry flow | HIGH | LOW | P1 |
| Extended measurements (arch, toe box, heel) | HIGH | HIGH | P2 |
| Accuracy confidence indicator | MEDIUM | MEDIUM | P2 |
| Confirmation email | HIGH | MEDIUM | P2 |
| Shopify embed widget | MEDIUM | MEDIUM | P2 |
| Instep estimation (side photo) | MEDIUM | HIGH | P3 |
| Measurement history / saved profile | LOW | MEDIUM | P3 |
| PDF export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | FeetSizr | Xesto Fit | Volumental | mySHOEFITTER | findmeashoe | Our Approach |
|---------|----------|-----------|------------|--------------|-------------|--------------|
| No app download | Yes (browser) | No (native app) | Yes (browser) | Yes (browser) | Yes (browser) | Yes (browser) — critical |
| Reference calibration | A4 paper | FaceID depth camera | Proprietary scanner | A4 paper | Standard paper | A4 paper |
| Measurements: length | Yes | Yes | Yes | Yes | Yes | Yes |
| Measurements: width | Yes | Yes | Yes | Yes | Yes (12-photo version) | Yes |
| Measurements: arch | No | No | Yes (scanner) | No | No | v1.x — extend after MVP |
| Measurements: instep | No | No | Yes (scanner) | No | No | v2 — requires side photo |
| Measurements: toe box | No | No | Unknown | No | No | v1.x — contour geometry |
| Both feet | Yes | Yes (5 photos each) | Yes | Yes | Yes | Yes — separate flows |
| Accuracy indicator | No | Claims ±1.5mm | Not shown to user | No | Claims ±1mm | Yes — calibration residual |
| 3D model / visualization | No | Yes (point cloud) | Yes (3D scan) | No | No | Contour overlay only (honest) |
| Lead capture / email | No (account only) | No | Via retailer | Via retailer | No | Yes — core differentiator |
| Saved measurements | Yes (Size ID) | Yes | Yes (digital profile) | Yes (generated ID) | No | v2 — not MVP |
| Brand customization | No | No | White-label | Yes (fully white-label) | Yes | Yes — native brand |
| Custom size tables | No | 150+ retail brands | Retail brands | Retailer brands | Retailer brands | Yes — Jolie's own lasts |
| Shopify integration | No | No | No | No | Yes (widget) | v1.x post-validation |
| Confirmation email | No | No | No | No | No (some retailers) | v1.x — brand differentiator |
| Size system output | US/EU/UK | 150+ brands | Retailer-specific | Retailer-specific | Retailer-specific | US/EU/UK + Jolie's custom |

---

## Sources

- [FeetSizr](https://feetsizr.com/) — browser-based scanning flow, A4 reference, Size ID concept
- [Xesto Fit product page](https://xesto.io/product) — 3D scanning, FaceID method, 150-brand size recommendations, sharing features
- [Xesto TechCrunch review](https://techcrunch.com/2020/11/20/xesto-is-a-foot-scanning-app-that-simplifies-shoe-gifting/) — gifting use case, ±1.5mm accuracy claim
- [Volumental](https://www.volumental.com/) — enterprise scanning, Fit Engine, 66M scans dataset, in-store + browser
- [SafeSize features overview](https://www.safesize.com/3d-foot-scanner-what-is-it-and-why-is-it-a-necessity-for-shoe-retailers/) — 3D geometry matching, pressure mapping, stock integration
- [mySHOEFITTER](https://en.myshoefitter.com/) — 5-click flow, 30-second scan, white-label, 14 languages, GDPR
- [findmeashoe foot scanning app](https://findmeashoe.com/foot-scanning-app/) — 6-12 measurements from single photo, 95% completion rate, ±1mm claim
- [Aetrex SizeRight](https://www.aetrex.com/pages/tech-size-right-mobile-app) — one-photo 2D scan, email foot data, AR guidance character
- [Best 3D foot scanning apps 2025 — avatar3d.tech](https://www.avatar3d.tech/best-3d-foot-scanning-apps-for-android-and-iphone-in-2025/) — market overview, Avatar Feet 20+ measurements
- [Mobile Apps for Foot Measurement in Pedorthic Practice: Scoping Review — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7974751/) — academic review; 0% of apps show accuracy info; only 15% determine shoe size; mean usability score 4.17/5
- [OptiFit — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9739363/) — calibration accuracy display method, coin as reference object, 4 measurements including instep girth
- [Snapfeet — comfort zoning feature](https://snapfeet.io/) — toe/instep/heel/sole comfort prediction per shoe
- [Footwear conversion rate and returns context — Perfitt Blog](https://blog.perfitt.io/aipowered-shoe-size-finder-the-future-of-footwear-shopping-48001) — 31% return rate, 20%+ conversion lift from fit tools

---

*Feature research for: browser-based foot scanning / shoe measurement (If The Shoe Fits custom heels)*
*Researched: 2026-03-21*
