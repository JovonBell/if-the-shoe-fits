# Pitfalls Research

**Domain:** Browser-based computer vision foot measurement app (OpenCV.js + getUserMedia + A4 reference)
**Researched:** 2026-03-21
**Confidence:** HIGH (most pitfalls confirmed across multiple independent sources including official bug trackers, academic literature, and open-source project issues)

---

## Critical Pitfalls

### Pitfall 1: iOS Safari Selects Ultra-Wide Lens for facingMode "environment"

**What goes wrong:**
iOS 16.4 introduced a regression where `{facingMode: "environment"}` routes to the ultra-wide lens instead of the standard rear camera. Ultra-wide has a fisheye-like distortion and a much wider field of view — the A4 paper fills a fraction of the frame and perspective distortion makes the calibration calculation wrong, producing measurements that are off by 20-40% depending on foot position relative to center.

**Why it happens:**
Safari/WebKit bug first appeared in 16.4 beta and shipped in 16.4 release. Apple was notified before it shipped and did not fix it in time. The exact camera (ultra-wide, standard, telephoto) selected by the browser is not surfaced to JavaScript — you cannot detect which lens was chosen.

**How to avoid:**
Request a specific resolution that only the standard lens can satisfy. Requesting `{facingMode: {exact: "environment"}, width: {ideal: 1920}, height: {ideal: 1080}}` tends to steer toward the standard lens on affected devices. Additionally, implement a calibration validation step: after photo capture, check that the A4 paper detection yields dimensions close to the expected 210x297mm — if the ratio is wildly off, prompt the user to retake. Do NOT use `{exact: "environment"}` with no resolution hint.

**Warning signs:**
- A4 paper detection succeeds but the detected paper is smaller than expected (occupies less than ~40% of frame height)
- Aspect ratio of detected quadrilateral is correct (0.707) but scaling is wrong
- Test device running iOS 16.4 or later with multi-lens hardware

**Phase to address:**
Camera capture phase (Phase 1 / core CV pipeline). Build the resolution hint into the initial `getUserMedia` call from day one. Add a post-capture sanity check on detected paper size as part of the validation step.

---

### Pitfall 2: White Foot on White Floor — A4 Paper Detection Fails Completely

**What goes wrong:**
The entire CV pipeline depends on detecting the A4 paper boundary first, then finding the foot outline within or adjacent to it. If the floor is white or near-white (tile, light hardwood, cream carpet), the contrast between paper and floor drops to near-zero. OpenCV contour detection on a grayscale/binary image cannot find a closed rectangular contour where none exists visually. The pipeline silently fails or detects the wrong rectangle (a shadow edge, a tile grout line, etc.).

**Why it happens:**
The wildoctopus/FeetAndShoeMeasurement project (the reference implementation) explicitly documents this as a known failure condition: "floor color should be different than white." The algorithm works by finding the largest rectangular contour with ~0.707 aspect ratio. On white floors, the threshold operation merges floor and paper into one blob. This is a fundamental limitation of threshold-based segmentation — not a bug that can be patched with tuning.

**How to avoid:**
1. In the UX instruction flow, show a clear photo of placing paper on a dark floor surface — e.g., hardwood, dark tile, or a dark mat. Make this Step 1 with an example image.
2. Show a real-time preview with overlay before capture. If the A4 detection confidence is low at preview time, display a warning: "We can't see the paper edges — try a darker surface or better lighting."
3. In the CV pipeline, attempt HSV-based segmentation before falling back to grayscale. Paper white in HSV has low saturation and high value — can sometimes be distinguished from cream floors.
4. As a last resort fallback: allow the user to manually tap corners of the paper on the preview image.

**Warning signs:**
- Consistent failure reports from users who describe white/light flooring
- `findContours` returns zero results or only noise contours after the rectification step
- App works perfectly in testing (developers test on dark desk surfaces) but fails in user homes

**Phase to address:**
Phase 1 (CV pipeline) for the detection algorithm. Phase 2 (UX/guided flow) for the instruction copy and preview validation. Both are required — detection alone cannot solve this.

---

### Pitfall 3: OpenCV.js 7.6MB Bundle Blocks First Meaningful Paint

**What goes wrong:**
The default opencv.js file is ~7.6MB (uncompressed) or ~3.5MB gzipped. Loading it synchronously blocks the page from being interactive. On a median 4G mobile connection (~20 Mbps), this is ~1.4 seconds of blocked load just for the WASM binary, before any OpenCV initialization. The Emscripten runtime then runs an async initialization that fires `onRuntimeInitialized` — but many implementations poll or spin-wait on this, causing the UI to appear frozen or unresponsive for 3-6 seconds on mid-range phones.

**Why it happens:**
Documentation examples show `<script src="opencv.js" onload="...">` as a synchronous script tag. Developers copy this pattern without realizing it blocks rendering. Next.js SSR additionally breaks WASM `dynamic import()` under Webpack 5 if not specifically handled, and the error is cryptic (module not found at runtime, not build time).

**How to avoid:**
1. Load OpenCV with `next/dynamic` and `ssr: false`. Never import opencv.js at the top of a module.
2. Show a loading state ("Preparing scanner...") immediately, then initialize OpenCV in a `useEffect` with a lazy import.
3. Host the .wasm and .js files yourself in `public/` — CDN delivery from docs.opencv.org has variable latency and no SLA.
4. Consider a custom minimal build: for this app only Gaussian blur, Canny, `findContours`, `approxPolyDP`, `boundingRect`, and `resize` are needed. A custom build reduces to ~1.8MB gzipped.
5. Show the camera preview immediately (before OpenCV loads) — user can frame the shot while CV initializes.

**Warning signs:**
- Lighthouse First Contentful Paint >4s on mobile
- UI freeze for 3+ seconds after page load on real device testing
- "module is not defined" or "cv is not defined" errors in SSR logs

**Phase to address:**
Phase 1 (core implementation). Loading strategy must be part of the initial architecture, not retrofitted. A frozen loading screen on first use will cause 60%+ abandonment.

---

### Pitfall 4: EXIF Orientation Rotates the Photo 90 Degrees Before CV Processing

**What goes wrong:**
Mobile cameras store the raw sensor data and write rotation metadata in EXIF. When a user holds their phone in portrait orientation and photographs their foot on the floor, the JPEG is often stored landscape (sideways) with EXIF Orientation=6 (rotate 90° CW). When you draw this into a `<canvas>` element via `drawImage()`, some browsers apply the EXIF rotation automatically, others do not. The result is that on some devices the image fed to OpenCV is 90° rotated — the A4 paper appears as a tall thin rectangle instead of a wide flat one. The aspect ratio check fails, contour detection picks the wrong shape, and measurements are completely wrong.

**Why it happens:**
This is a long-standing browser inconsistency. iOS Safari applies EXIF rotation automatically in the `<img>` tag but not always in canvas `drawImage`. Chrome on Android did not apply EXIF rotation consistently until recent versions. The HTML Canvas spec does not require honoring EXIF data.

**How to avoid:**
Before any OpenCV processing, read the EXIF Orientation tag from the image blob using a micro-library (exifr, ~3KB gzipped, or piexifjs). Apply the inverse rotation on the canvas manually before handing the ImageData to OpenCV. This is a one-time fix that must be applied universally — do not make it conditional on platform.

**Warning signs:**
- CV pipeline works perfectly in desktop browser testing but fails on physical phone
- Detected A4 contour has inverted aspect ratio (~1.414 instead of ~0.707)
- Measurements are exactly swapped: length appears as width and vice versa

**Phase to address:**
Phase 1 (CV pipeline). Add EXIF normalization as the first step in the image processing chain before any other transformation.

---

### Pitfall 5: Camera Angle Perspective Distortion Inflates Toe Length Measurements

**What goes wrong:**
The A4 paper calibration assumes the camera is directly overhead (perpendicular to the floor plane). In practice, users hold their phone at 45-70° to get the foot in frame while also seeing it. At a 45° angle, the far edge of the paper appears shorter than the near edge in the image. The pixel-per-mm ratio computed from the near edge of the paper will be correct for objects near the camera but wrong for objects at the far edge (i.e., the toe end of the foot if the heel is closer to the camera). This creates a systematic measurement error — toe box width and foot length both read incorrectly.

**Why it happens:**
The mathematical assumption of the pixel-to-mm conversion is that the image plane is parallel to the floor plane (orthographic projection). A phone held at an angle produces perspective projection. The error magnitude depends on angle and foot-to-height ratio. At 60° tilt with a 30cm foot, length error can exceed 8mm — enough to affect shoe size recommendation by a full size.

**How to avoid:**
1. UX instruction: show an animated diagram of the phone held directly overhead, vertically above the foot. Use explicit language: "Hold your phone directly above your foot, pointing straight down."
2. After A4 detection, perform a perspective correction (homography transform using `getPerspectiveTransform` + `warpPerspective` in OpenCV.js) before measuring. This rectifies the trapezoid to a perfect rectangle first, then all measurements are taken from the rectified image.
3. Add a tilt angle detection check using `DeviceOrientationEvent` — if the phone is more than 20° from vertical, show a warning before capture.

**Warning signs:**
- Detected A4 quadrilateral has top edge significantly shorter than bottom edge (trapezoid shape, not rectangle)
- Foot length measurements are consistently 5-10mm longer than ground truth when tested at angle
- Users report measurements "feel too long"

**Phase to address:**
Phase 1 (CV pipeline) for the perspective correction transform. Phase 2 (UX) for the overhead guidance instructions and tilt detection warning.

---

### Pitfall 6: OpenCV.js WASM Memory Leak — Crashes on Second Scan

**What goes wrong:**
OpenCV.js Mat objects (images, contours, intermediate results) are allocated in WASM heap memory. They are NOT garbage collected by the JavaScript runtime — they must be explicitly deleted by calling `.delete()` on each Mat. If the scan is run multiple times (user retakes photo, fixes foot position, tries again), each run without cleanup accumulates ~20-80MB of WASM heap. Mobile Safari is reported to crash at ~300MB WASM heap allocation. A user who retakes 3-4 times will crash the page and lose all their scan data.

**Why it happens:**
JavaScript developers are not accustomed to manual memory management. The OpenCV.js documentation shows `.delete()` calls in examples but beginners skip them. The JS GC cannot collect WASM memory, so there is no safety net.

**How to avoid:**
Wrap every scan operation in a try/finally block. Create all Mats at the top of the processing function, run all operations, then delete everything in `finally`. Use a helper like `withMats((mat1, mat2) => { ... })` that auto-deletes. Test with 5 consecutive retakes on a mid-range Android device before shipping.

**Warning signs:**
- Page crash or "out of memory" error on second or third scan attempt
- `performance.memory.usedJSHeapSize` growing with each scan (Chrome DevTools)
- Error: "Cannot enlarge memory arrays" in console

**Phase to address:**
Phase 1 (CV pipeline). Build the cleanup pattern into the initial implementation — do not ship without it, as it cannot be easily detected in single-run testing.

---

### Pitfall 7: getUserMedia Camera Permission Never Asked in Shopify iframe Embed

**What goes wrong:**
The embed version of the scanner is loaded in an `<iframe>` on the Shopify storefront. By default, browsers block `getUserMedia` calls from cross-origin iframes entirely — the permission dialog never appears and the call rejects with `NotAllowedError`. This has been the default behavior in Chrome since version 63 (2017) and in Safari since iOS 13. The iframe embed will appear to hang or show a generic permission error with no explanation.

**Why it happens:**
Browsers restrict powerful features (camera, microphone, geolocation) from cross-origin iframes unless the embedding page explicitly grants them via the Permissions Policy (formerly Feature Policy). Shopify theme code does not add this attribute by default.

**How to avoid:**
The iframe embed tag must include `allow="camera"`:
```html
<iframe src="https://scanner.iftheshoefits.co" allow="camera" ...></iframe>
```
The Shopify integration guide must document this as a required attribute. Additionally, the scanner app must detect when it is running inside an iframe and show a clear error if camera permission is unavailable: "Camera access is blocked. Ask the site owner to enable camera permissions for this embed."

**Warning signs:**
- Scanner works perfectly at the standalone URL but fails immediately when embedded
- Console shows `NotAllowedError: Permission denied` from within iframe context
- No permission dialog ever appears to the user

**Phase to address:**
Phase 3 (Shopify embed integration). The standalone version is unaffected — this only matters for the iframe embed. Document the `allow="camera"` requirement in the embed instructions.

---

### Pitfall 8: iOS Safari Asks for Camera Permission on Every Page Load

**What goes wrong:**
Unlike Chrome on Android (and desktop browsers), Safari on iOS does not persistently remember camera permissions for web apps. The permission prompt reappears on every full page load. For a scanning app, this means every user must click "Allow" before they can take a photo — even if they allowed it yesterday. More critically: if the user navigates away mid-flow and returns via browser back button (triggering a page reload), they are interrupted by a permission prompt mid-scan.

**Why it happens:**
This is intentional iOS privacy behavior, not a bug. Safari treats web apps as less trusted than native apps and does not persist camera permissions across sessions. PWAs added to the home screen behave slightly better but still have issues with permission persistence when the URL hash changes (documented WebKit bug #215884).

**How to avoid:**
Design the entire scan flow as a single-page navigation. Do not use full page reloads or hash-based navigation changes during the scan flow. Use `router.push()` (Next.js) only at the very end of the flow (after scan + form submit). Keep the camera stream alive from permission grant until the user exits the scanner. Show a UI note: "Tap Allow when asked to access your camera."

**Warning signs:**
- Users report being asked for camera permission multiple times
- QA testing shows camera re-request when navigating between flow steps
- URL hash changes between scanner steps (even /scan#step2 → /scan#step3 can trigger re-request on iOS PWA)

**Phase to address:**
Phase 1 (camera capture) and Phase 2 (UX flow design). Single-page navigation design is a foundational constraint, not an add-on.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Load opencv.js from docs.opencv.org CDN | Zero setup time | CDN outages kill the app, variable load time, no control over version | Never — self-host from day one |
| Skip perspective correction (warpPerspective) | Simpler CV pipeline | Measurements wrong for any angled shot — most users will hold phone at angle | Never — this is the accuracy foundation |
| Copy EXIF normalization from examples without testing | Seems to work in desktop browser | Silently broken on physical devices, wrong measurements for portrait-photo users | Never — test on physical device before shipping |
| Skip Mat.delete() cleanup | Faster to write | Memory leak crashes app on retake — invisible in single-run testing | Never for production |
| Store raw foot image in Supabase without resize | Simple implementation | Each photo is 3-8MB; Supabase free tier storage fills quickly; slow upload on mobile | Resize to max 1200px before upload |
| Use `exact` in facingMode constraint | Predictable camera selection | Throws OverconstrainedError on devices with only one rear camera | Only use `ideal` with resolution hints |
| Skip loading state while OpenCV initializes | Less UI code | Users see blank screen or broken UI, high bounce rate | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage | Upload raw camera photo (3-8MB JPEG) directly | Resize and compress to JPEG ~200KB on canvas before uploading; store as blob URL |
| Supabase Storage | Direct upload via anon key from client with no RLS | Set bucket policies: insert allowed for anon (lead capture needs no auth), but no public read |
| Supabase Storage | Next.js server action for file upload | Server actions have a 1MB body limit by default; use client-side upload to signed URL instead |
| Shopify embed | Using standard `<iframe src="...">` without allow attribute | Add `allow="camera"` to the iframe tag; document this clearly in integration guide |
| Next.js + WASM | SSR compiles OpenCV import and crashes at build time | All OpenCV code must be in `useEffect` + `dynamic(() => import(...), { ssr: false })` |
| getUserMedia | Not stopping tracks after capture | Active camera track keeps camera indicator LED on and drains battery; always call `track.stop()` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Processing full-resolution camera image (12-48MP) | CV takes 10-30 seconds, may OOM | Resize captured image to max 1200x1600 before OpenCV processing | Always — 1200px is sufficient for mm accuracy |
| Loading opencv.js on every page visit | 3-7s load time on repeat visits | Set long-lived cache headers (1 year) on self-hosted opencv.js and .wasm | First and every visit without caching |
| Running CV on main thread | UI freezes during processing | Move CV processing to a Web Worker (but note: threaded WASM has issues; use single-threaded build in worker) | Any device below top-tier |
| Accumulating Mat objects across retakes | OOM crash after 3-4 retakes | Explicit Mat.delete() in finally block after each scan | Second retake on mobile |
| Not debouncing "capture" button | Double-tap submits two scans | Disable button immediately on first tap, re-enable only on error | Users who tap twice quickly |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Supabase anon key in client-side code | Low for this app (anon key is designed for public use) but bucket policies must be tight | Ensure RLS on measurements table: insert only, no update/delete from client; no read of other users' data |
| Storing PII (email, phone, foot measurements) without privacy notice | GDPR/CCPA compliance issue | Add one-sentence privacy disclosure on the lead capture form before submit |
| Allowing arbitrary image uploads to storage bucket | Storage abuse, cost inflation | Validate MIME type is image/jpeg or image/png; set max file size limit in bucket policy (5MB) |
| Exposing measurement data in public Supabase table | Any user can read all other users' measurements | Set RLS: insert allowed for anon, no select; admin reads via service role key only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing technical instructions ("Place foot 10cm from paper edge") | Users ignore or misunderstand, misplace foot, get bad measurements | Use annotated photos showing exactly where foot should go; visual-first instructions |
| No feedback during CV processing (blank screen for 2-4s) | Users think app is broken, tap away or refresh | Show animated processing indicator ("Measuring your foot...") immediately on photo capture |
| Showing raw mm measurements before shoe size | Users don't know what "263mm" means for their shoe size | Lead with shoe size recommendation, show measurements as secondary detail |
| Capture button at bottom of screen, foot takes up 80% of frame | User can't see where their foot is while tapping button | Show full preview then large capture button in corner; or use volume button gesture |
| Form asks email + phone before showing results | Creates friction before value delivery; high abandonment | Show measurements/size recommendation first, then gate download/email of results |
| No "retake" option after poor photo | User stuck with bad measurement | Always show retake button after processing, display the annotated result photo |
| Error messages that say "CV Error: contour not found" | Users have no idea what to do | Map all CV errors to actionable user language: "We couldn't find the paper edges — try a darker surface" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Camera on iOS:** Test on a physical iPhone (not Simulator) — Simulator does not have camera hardware; getUserMedia on Simulator always fails
- [ ] **EXIF orientation:** Test by photographing a document held in portrait on Android; verify the detected rectangle is the correct orientation in the debug overlay
- [ ] **White floor:** Test with paper placed on a white tile floor — if A4 detection fails, the UX warning must appear
- [ ] **Memory leak:** Run 5 consecutive scan attempts without page reload; confirm no memory growth in DevTools and no crash
- [ ] **Perspective correction:** Test at a 45° phone angle; verify measurements are within 3mm of vertical shot
- [ ] **iframe embed:** Embed in a test HTML page on a different origin; confirm camera permission dialog appears (requires `allow="camera"` attribute)
- [ ] **Supabase RLS:** Confirm a new anon session cannot SELECT from the measurements table; can only INSERT
- [ ] **iOS permission re-ask:** Navigate through scan flow steps; confirm permission prompt does not re-appear between steps
- [ ] **Ultra-wide lens:** Test on an iPhone 12 or later running iOS 16.4+; verify paper detection dimensions are plausible
- [ ] **OpenCV load time:** Check Lighthouse mobile score; Time to Interactive should be under 5s on simulated 4G
- [ ] **Shoe size output:** Verify EU/US/UK size conversion against known measurements (US Women's 10 = 265mm length)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Ultra-wide lens regression found post-launch | MEDIUM | Add post-capture paper size validation; display retake prompt if dimensions are implausible |
| Memory leak discovered after launch | LOW | Add Mat.delete() cleanup; ship hotfix; requires no data migration |
| EXIF orientation bug found in production | LOW | Add exifr library, apply normalization; affects no stored data |
| White floor failure causing user drop-off | LOW-MEDIUM | Improve UX copy in instruction step; optionally add manual corner-tap fallback |
| iframe embed broken after Shopify installation | LOW | Document allow="camera" attribute fix; one-line change in Shopify theme editor |
| Supabase RLS misconfiguration exposes data | HIGH | Rotate anon key, apply RLS policies, notify affected users — do this right on day one |
| OpenCV.js loading from external CDN goes down | HIGH | Re-deploy with self-hosted files; 30-min fix but causes 100% downtime until resolved |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Ultra-wide lens bug (iOS 16.4) | Phase 1: Camera capture setup | Test on physical iPhone with iOS 16.4+; paper detection aspect ratio correct |
| White floor A4 detection failure | Phase 1: CV pipeline + Phase 2: UX | Test with white paper on white tile; UX warning appears |
| OpenCV.js bundle blocking load | Phase 1: Architecture/loading strategy | Lighthouse mobile TBT < 300ms |
| EXIF orientation rotation | Phase 1: CV pipeline (image preprocessing) | Test on Android portrait capture; detected contour not rotated |
| Perspective distortion inflating toe length | Phase 1: CV pipeline (homography correction) | Measurement at 45° angle within 3mm of overhead measurement |
| WASM memory leak on retake | Phase 1: CV pipeline (cleanup pattern) | 5 consecutive retakes without crash or memory growth |
| iframe camera permission blocked | Phase 3: Shopify embed integration | Embed test on separate-origin page with allow="camera" |
| iOS permission re-ask on navigation | Phase 2: UX flow design | Full flow on physical iPhone without permission re-prompt |
| Missing Mat.delete() causing OOM | Phase 1: CV pipeline | Memory profiling in DevTools, 5-retake stress test |
| Lead form friction before value | Phase 2: UX flow | A/B test or heuristic review: results shown before email gate |

---

## Sources

- [WebKit Bug 253186 — iOS 16.4 ultra-wide facingMode regression](https://bugs.webkit.org/show_bug.cgi?id=253186)
- [OpenCV.js memory access out of bounds #19397](https://github.com/opencv/opencv/issues/19397)
- [OpenCV.js Memory Management — OpenCV Q&A Forum](https://answers.opencv.org/question/223059/memory-management-in-opencvjs/)
- [OpenCV.js WASM too large — OpenCV Q&A Forum](https://answers.opencv.org/question/229032/opencv_jswasm-is-too-large/)
- [wildoctopus/FeetAndShoeMeasurement — Known limitations](https://github.com/wildoctopus/FeetAndShoeMeasurement)
- [OptiFit: CV-based smartphone foot measurement — PMC/MDPI](https://pmc.ncbi.nlm.nih.gov/articles/PMC9739363/)
- [Mobile Apps for Foot Measurement in Pedorthic Practice: Scoping Review — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7974751/)
- [Camera and Microphone in Cross-Origin Iframes (Permissions Policy)](https://blog.addpipe.com/camera-and-microphone-access-in-cross-oirigin-iframes-with-feature-policy/)
- [iOS getUserMedia resolution constraints — Apple Developer Forums](https://developer.apple.com/forums/thread/113532)
- [WebKit Bug 215884 — getUserMedia permission recurring prompts in PWA](https://bugs.webkit.org/show_bug.cgi?id=215884)
- [Webpack 5 breaks dynamic WASM import for SSR — Next.js #25852](https://github.com/vercel/next.js/issues/25852)
- [Extracting A4 sheet from troubling backgrounds — OpenCV Q&A](https://answers.opencv.org/question/174235/extracting-a4-sheet-out-of-troubling-backgrounds/)
- [Handle image EXIF rotation on mobile (Medium/Wassa)](https://medium.com/wassa/handle-image-rotation-on-mobile-266b7bd5a1e6)
- [Supabase Storage CORS issue #9224](https://github.com/supabase/supabase/issues/9224)
- [WebAssembly memory limit iOS Safari — Emscripten #19374](https://github.com/emscripten-core/emscripten/issues/19374)
- [Getting Started with getUserMedia 2026 — AddPipe](https://blog.addpipe.com/getusermedia-getting-started/)

---
*Pitfalls research for: Browser-based CV foot measurement — OpenCV.js + getUserMedia + A4 reference + iOS Safari + Android Chrome*
*Researched: 2026-03-21*
