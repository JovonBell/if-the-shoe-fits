/**
 * Foot contour extraction from perspective-corrected mat.
 * Receives the rectified (432x558px) mat from applyPerspectiveCorrection.
 * All Mats are deleted in try/finally — no exceptions.
 */

// Track whether GrabCut was used in the last call
export let lastGrabCutUsed = false

// Side/top margin: paper boundary and background blobs touch these edges
const EDGE_MARGIN = 6

// Validate that a candidate contour is actually a foot and not a paper edge or background blob
function isValidFootContour(
  pts: Array<{ x: number; y: number }>,
  imageW: number,
  imageH: number,
  area: number,
  totalArea: number
): boolean {
  // 1. Area: 8–70% of paper area
  if (area < totalArea * 0.08 || area > totalArea * 0.70) {
    console.log(`[Contour] REJECT area ${(area/totalArea*100).toFixed(1)}% (need 8-70%)`)
    return false
  }

  // 2. Edge-touching: reject contours touching LEFT, RIGHT, or TOP edges.
  //    The BOTTOM edge is intentionally excluded — the heel sits at the bottom of
  //    the paper ("heel at bottom edge") so valid foot contours always touch y ≈ imageH.
  //    Paper boundary blobs touch all 4 edges and will be caught by the top/side check.
  for (const { x, y } of pts) {
    if (x <= EDGE_MARGIN || x >= imageW - EDGE_MARGIN || y <= EDGE_MARGIN) {
      console.log(`[Contour] REJECT edge-touching at (${x},${y}), image ${imageW}×${imageH}`)
      return false
    }
  }

  // 3. Bounding-box aspect ratio: foot is taller than wide (ratio 1.3–6.0).
  //    Ratio outside this range → edge sliver, square blob, or horizontal artifact.
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const bboxW = Math.max(...xs) - Math.min(...xs)
  const bboxH = Math.max(...ys) - Math.min(...ys)
  if (bboxW < 1 || bboxH < 1) return false
  const ratio = bboxH / bboxW
  if (ratio < 1.3 || ratio > 6.0) {
    console.log(`[Contour] REJECT ratio ${ratio.toFixed(2)} (need 1.3-6.0), bbox ${bboxW}×${bboxH}`)
    return false
  }

  // 4. Centroid X in central 80%; centroid Y anywhere in 10-95% (heel can be near bottom)
  const cx = xs.reduce((s, v) => s + v, 0) / xs.length
  const cy = ys.reduce((s, v) => s + v, 0) / ys.length
  if (cx < imageW * 0.10 || cx > imageW * 0.90 || cy < imageH * 0.10 || cy > imageH * 0.95) {
    console.log(`[Contour] REJECT centroid (${cx.toFixed(0)},${cy.toFixed(0)}) out of range`)
    return false
  }

  console.log(`[Contour] ACCEPT area ${(area/totalArea*100).toFixed(1)}%, ratio ${ratio.toFixed(2)}, bbox ${bboxW}×${bboxH}`)
  return true
}

// Find the best (largest valid) foot contour from a binary mask
function findLargestFootContour(
  cv: any,
  mask: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  const imageW = mask.cols
  const imageH = mask.rows
  let contours: any, hierarchy: any
  try {
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    console.log(`[Contour] ${contours.size()} contours found, image ${imageW}×${imageH}`)

    let bestPts: Array<{ x: number; y: number }> | null = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area <= bestArea) continue  // skip if smaller than current best

      const pts: Array<{ x: number; y: number }> = []
      for (let j = 0; j < c.data32S.length; j += 2) {
        pts.push({ x: c.data32S[j], y: c.data32S[j + 1] })
      }

      if (isValidFootContour(pts, imageW, imageH, area, totalArea)) {
        bestArea = area
        bestPts = pts
      }
    }

    return bestPts
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[contours, hierarchy].forEach(safeDelete)
  }
}

// Strategy 1: Relative-threshold non-paper detection
// Uses 90th-percentile brightness as paper reference — same principle as live detection.
// Works for all sock/skin colours including white-on-white.
function detectViaNonPaper(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): { points: Array<{ x: number; y: number }> | null; otsuBinary: any } {
  let gray: any, blurred: any, binary: any, kernel: any
  let resultPoints: Array<{ x: number; y: number }> | null = null
  let savedBinary: any = null
  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    binary = new cv.Mat()

    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)
    // Heavy blur smooths sock texture so only major shape contrast remains
    cv.GaussianBlur(gray, blurred, new cv.Size(21, 21), 0)

    kernel = cv.Mat.ones(7, 7, cv.CV_8U)

    // --- Relative threshold (adapts to actual paper brightness) ---
    // Compute 90th-percentile brightness of the whole paper area
    const pixelBuf = new Uint8Array(blurred.data.buffer, blurred.data.byteOffset, blurred.rows * blurred.cols)
    const sorted = new Uint8Array(pixelBuf).sort()
    const paperRef = sorted[Math.floor(sorted.length * 0.90)]
    // Foot = pixels darker than 93% of paper reference (catches white socks)
    const relThresh = Math.round(paperRef * 0.87)

    // Try relative threshold first, then fall back to absolute thresholds
    const thresholds = [relThresh, 215, 205, 195, 185, 175, 165, 155, 145]
    for (const thresh of thresholds) {
      cv.threshold(blurred, binary, thresh, 255, cv.THRESH_BINARY)
      // Invert: pixels ABOVE threshold (paper) → black, below (foot) → white
      cv.bitwise_not(binary, binary)

      // MORPH_CLOSE fills internal holes caused by sock logos, text, ribbed texture
      cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel)
      // Additional dilation+erode to merge any remaining fragments
      cv.dilate(binary, binary, kernel)
      cv.dilate(binary, binary, kernel)
      cv.erode(binary, binary, kernel)
      cv.erode(binary, binary, kernel)

      const result = findLargestFootContour(cv, binary, totalArea)
      if (result) {
        resultPoints = result
        savedBinary = binary.clone()
        break
      }
    }

    return { points: resultPoints, otsuBinary: savedBinary }
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, blurred, binary, kernel].forEach(safeDelete)
  }
}

// Strategy 2: High-sensitivity edge detection for white sock on white paper.
// Minimal blur preserves fine sock-texture edges; MORPH_CLOSE fills the foot interior.
function detectViaEdges(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let gray: any, blurred: any, edges: any, closeKernel: any, dilateKernel: any, erodeKernel: any
  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    edges = new cv.Mat()

    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)
    // Minimal 3×3 blur — preserves sock texture edges unlike the 5×5 used before
    cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0)
    // Very low Canny thresholds to catch subtle white-on-white sock boundary
    cv.Canny(blurred, edges, 8, 25)

    // Dilate to connect fragmented edge segments into thick bands
    dilateKernel = cv.Mat.ones(13, 13, cv.CV_8U)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)

    // MORPH_CLOSE with a large kernel fills the hollow interior of the foot shape
    closeKernel = cv.Mat.ones(45, 45, cv.CV_8U)
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, closeKernel)

    // Erode back to approximate true foot boundary
    erodeKernel = cv.Mat.ones(11, 11, cv.CV_8U)
    cv.erode(edges, edges, erodeKernel)
    cv.erode(edges, edges, erodeKernel)
    cv.erode(edges, edges, erodeKernel)

    return findLargestFootContour(cv, edges, totalArea)
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, blurred, edges, closeKernel, dilateKernel, erodeKernel].forEach(safeDelete)
  }
}

// Strategy 3: Adaptive threshold — finds local contrast differences.
// White sock on white paper has visible texture (rib pattern) vs smooth paper.
// adaptiveThreshold responds to local variation rather than absolute brightness.
function detectViaAdaptive(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let gray: any, binary: any, closeKernel: any, dilateKernel: any, erodeKernel: any
  try {
    gray = new cv.Mat()
    binary = new cv.Mat()

    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)

    // blockSize 51: large enough to span several sock ribs; C=4: only catch real texture
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 4)
    // Invert: sock texture pixels (below local mean) → white, smooth paper → black
    cv.bitwise_not(binary, binary)

    // Close to merge texture pixels into a solid sock blob, then fill interior
    closeKernel = cv.Mat.ones(25, 25, cv.CV_8U)
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, closeKernel)

    dilateKernel = cv.Mat.ones(15, 15, cv.CV_8U)
    cv.dilate(binary, binary, dilateKernel)
    cv.dilate(binary, binary, dilateKernel)

    // Second large CLOSE to fill any remaining interior holes
    const bigClose = cv.Mat.ones(40, 40, cv.CV_8U)
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, bigClose)
    bigClose.delete()

    erodeKernel = cv.Mat.ones(13, 13, cv.CV_8U)
    cv.erode(binary, binary, erodeKernel)
    cv.erode(binary, binary, erodeKernel)

    return findLargestFootContour(cv, binary, totalArea)
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, binary, closeKernel, dilateKernel, erodeKernel].forEach(safeDelete)
  }
}

// Try GrabCut refinement when Otsu result looks rough (high smoothness ratio)
function tryGrabCut(
  cv: any,
  rectifiedMat: any,
  otsuBinary: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let img3ch: any, mask: any, bgdModel: any, fgdModel: any, grabMask: any
  try {
    // Convert RGBA to BGR (GrabCut requires 8UC3)
    img3ch = new cv.Mat()
    cv.cvtColor(rectifiedMat, img3ch, cv.COLOR_RGBA2BGR)

    // Init mask: 3 (probFg) where Otsu=white, 0 (bg) elsewhere
    mask = new cv.Mat(rectifiedMat.rows, rectifiedMat.cols, cv.CV_8UC1, new cv.Scalar(0))
    for (let r = 0; r < otsuBinary.rows; r++) {
      for (let c = 0; c < otsuBinary.cols; c++) {
        const v = otsuBinary.ucharAt(r, c)
        if (v > 0) {
          mask.ucharPtr(r, c)[0] = 3 // GC_PR_FGD
        }
      }
    }

    bgdModel = cv.Mat.zeros(1, 65, cv.CV_64FC1)
    fgdModel = cv.Mat.zeros(1, 65, cv.CV_64FC1)

    const rect = new cv.Rect(0, 0, 1, 1) // dummy — using INIT_WITH_MASK
    const GC_INIT_WITH_MASK = cv.GC_INIT_WITH_MASK ?? 1
    cv.grabCut(img3ch, mask, rect, bgdModel, fgdModel, 1, GC_INIT_WITH_MASK)

    // Build foreground mask: pixels where mask==1 or mask==3
    grabMask = new cv.Mat(mask.rows, mask.cols, cv.CV_8UC1, new cv.Scalar(0))
    for (let r = 0; r < mask.rows; r++) {
      for (let c = 0; c < mask.cols; c++) {
        const v = mask.ucharAt(r, c)
        if (v === 1 || v === 3) {
          grabMask.ucharPtr(r, c)[0] = 255
        }
      }
    }

    return findLargestFootContour(cv, grabMask, totalArea)
  } catch {
    return null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[img3ch, mask, bgdModel, fgdModel, grabMask].forEach(safeDelete)
  }
}

// Strategy 4: Flood-fill paper exclusion.
// Fill from all 4 corners (paper background is bright) then invert.
// Works for white sock on white paper because the sock has SLIGHTLY different
// texture/brightness than the smooth paper — enough to stop the fill.
function detectViaFloodFill(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let gray: any, filled: any, footMask: any, kernel: any
  try {
    gray = new cv.Mat()
    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)

    // Blur to remove noise but preserve sock/paper boundary
    const blurred = new cv.Mat()
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    gray.delete()
    gray = blurred

    filled = gray.clone()
    const rows = filled.rows
    const cols = filled.cols

    // Flood fill from all 4 corners with tolerance 25
    // Paper background (white, ~240) spreads freely; sock/foot acts as barrier
    const fillColor = new cv.Scalar(128)
    const loDiff = new cv.Scalar(25)
    const upDiff = new cv.Scalar(25)
    const rect = new cv.Rect(0, 0, 1, 1)
    const corners = [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]]
    for (const [cx, cy] of corners) {
      try {
        cv.floodFill(filled, new cv.Mat(), new cv.Point(cx, cy), fillColor, rect, loDiff, upDiff, 4)
      } catch { /* ignore if corner pixel already filled */ }
    }

    // Foot mask: pixels NOT filled (not paper) → binary white
    footMask = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = filled.ucharAt(r, c)
        if (v !== 128) {
          footMask.ucharPtr(r, c)[0] = 255
        }
      }
    }

    // Close and dilate to fill internal holes
    kernel = cv.Mat.ones(15, 15, cv.CV_8U)
    cv.morphologyEx(footMask, footMask, cv.MORPH_CLOSE, kernel)
    cv.dilate(footMask, footMask, kernel)

    return findLargestFootContour(cv, footMask, totalArea)
  } catch {
    return null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, filled, footMask, kernel].forEach(safeDelete)
  }
}

export function extractFootContour(
  cv: any,
  rectifiedMat: any
): Array<{ x: number; y: number }> | null {
  // Reset GrabCut flag
  lastGrabCutUsed = false

  const totalArea = rectifiedMat.rows * rectifiedMat.cols

  // Strategy 1: Relative-threshold brightness (adapts to paper brightness, catches white socks)
  const { points: nonPaperPoints, otsuBinary } = detectViaNonPaper(cv, rectifiedMat, totalArea)

  if (nonPaperPoints && nonPaperPoints.length > 0) {
    // Compute smoothness ratio C² / (4π × A) to determine if GrabCut is needed
    let smoothness = 0
    if (otsuBinary) {
      try {
        let contours: any, hierarchy: any
        try {
          contours = new cv.MatVector()
          hierarchy = new cv.Mat()
          cv.findContours(otsuBinary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
          let bestC: any = null, bestA = 0
          for (let i = 0; i < contours.size(); i++) {
            const c = contours.get(i)
            const a = cv.contourArea(c)
            if (a > bestA) { bestA = a; bestC = c }
          }
          if (bestC && bestA > 0) {
            const peri = cv.arcLength(bestC, true)
            smoothness = (peri * peri) / (4 * Math.PI * bestA)
          }
        } finally {
          const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
          ;[contours, hierarchy].forEach(safeDelete)
        }
      } catch { /* ignore */ }
    }

    // Try GrabCut if smoothness > 2.5 and GrabCut is available
    if (smoothness > 2.5 && typeof cv.grabCut === 'function' && otsuBinary) {
      try {
        const grabResult = tryGrabCut(cv, rectifiedMat, otsuBinary, totalArea)
        if (grabResult) {
          lastGrabCutUsed = true
          const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
          safeDelete(otsuBinary)
          return grabResult
        }
      } catch { /* fall through to nonPaper result */ }
    }

    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    safeDelete(otsuBinary)
    return nonPaperPoints
  }

  const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
  safeDelete(otsuBinary)

  // Strategy 2: High-sensitivity edge detection (white sock on white paper)
  const edgeResult = detectViaEdges(cv, rectifiedMat, totalArea)
  if (edgeResult) return edgeResult

  // Strategy 3: Adaptive threshold — catches sock texture vs smooth paper
  const adaptiveResult = detectViaAdaptive(cv, rectifiedMat, totalArea)
  if (adaptiveResult) return adaptiveResult

  // Strategy 4: Flood-fill exclusion — fill paper from corners, invert to find foot
  console.log('[Contour] Trying strategy 4: flood-fill')
  return detectViaFloodFill(cv, rectifiedMat, totalArea)
}
