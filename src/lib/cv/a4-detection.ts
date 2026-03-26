/**
 * A4 paper detection, perspective correction, and calibration accuracy.
 * All functions receive `cv` as a parameter to avoid Worker/main-thread coupling.
 * Every function that creates Mats manages them in try/finally blocks.
 */

export const A4_ASPECT_RATIO = 210 / 297 // ~0.707
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const SCALE = 2 // px per mm → 420×594 output

// Sorts 4 corners clockwise: top-left, top-right, bottom-right, bottom-left
function sortCornersClockwise(
  pts: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const sorted = [...pts]
  sorted.sort((a, b) => a.x + a.y - (b.x + b.y))
  const topLeft = sorted[0]
  const bottomRight = sorted[sorted.length - 1]
  const remaining = sorted.slice(1, 3)
  remaining.sort((a, b) => a.x - b.x)
  const bottomLeft = remaining[0]
  const topRight = remaining[1]
  return [topLeft, topRight, bottomRight, bottomLeft]
}

// Aspect ratio tolerance: covers both A4 (0.707) and US Letter (0.773)
const ASPECT_RATIO_TOLERANCE = 0.15

// Try to find a 4-corner quad from contours using approxPolyDP (strict)
function findBestQuadStrict(
  cv: any,
  contours: any,
  minArea: number,
  epsilon: number
): Array<{ x: number; y: number }> | null {
  let bestQuad: Array<{ x: number; y: number }> | null = null
  let bestArea = 0

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i)
    const area = cv.contourArea(contour)
    if (area < minArea) continue

    const peri = cv.arcLength(contour, true)
    const approx = new cv.Mat()
    cv.approxPolyDP(contour, approx, epsilon * peri, true)

    if (approx.rows === 4) {
      const pts = Array.from({ length: 4 }, (_, j) => ({
        x: approx.data32S[j * 2],
        y: approx.data32S[j * 2 + 1],
      }))
      const xs = pts.map(p => p.x)
      const ys = pts.map(p => p.y)
      const w = Math.max(...xs) - Math.min(...xs)
      const h = Math.max(...ys) - Math.min(...ys)
      const ratio = Math.min(w, h) / Math.max(w, h)

      if (Math.abs(ratio - A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE && area > bestArea) {
        bestArea = area
        bestQuad = pts
      }
    }
    approx.delete()
  }

  return bestQuad
}

// Find best rectangle using minAreaRect (robust — works with noisy contours)
// Returns 4 corner points of the rotated rect if aspect ratio matches paper
function findBestQuadRect(
  cv: any,
  contours: any,
  minArea: number
): Array<{ x: number; y: number }> | null {
  let bestQuad: Array<{ x: number; y: number }> | null = null
  let bestArea = 0

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i)
    const area = cv.contourArea(contour)
    if (area < minArea) continue

    // minAreaRect fits a rotated rectangle to any contour — no need for 4 clean corners
    const rect = cv.minAreaRect(contour)
    const w = Math.min(rect.size.width, rect.size.height)
    const h = Math.max(rect.size.width, rect.size.height)
    if (h === 0) continue
    const ratio = w / h

    if (Math.abs(ratio - A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE && area > bestArea) {
      bestArea = area
      // OpenCV.js RotatedRect: center/size may be {x,y}/{width,height} or plain objects
      const cx = rect.center?.x ?? rect.center?.[0] ?? 0
      const cy = rect.center?.y ?? rect.center?.[1] ?? 0
      const sw = rect.size?.width ?? rect.size?.[0] ?? 0
      const sh = rect.size?.height ?? rect.size?.[1] ?? 0
      const rw = sw / 2
      const rh = sh / 2
      const angle = ((rect.angle ?? 0) * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      bestQuad = [
        { x: Math.round(cx - rw * cos - rh * sin), y: Math.round(cy - rw * sin + rh * cos) },
        { x: Math.round(cx + rw * cos - rh * sin), y: Math.round(cy + rw * sin + rh * cos) },
        { x: Math.round(cx + rw * cos + rh * sin), y: Math.round(cy + rw * sin - rh * cos) },
        { x: Math.round(cx - rw * cos + rh * sin), y: Math.round(cy - rw * sin - rh * cos) },
      ]
      // Guard: if any coord is NaN, discard
      if (bestQuad.some(p => isNaN(p.x) || isNaN(p.y))) bestQuad = null
    }
  }

  return bestQuad
}

// Strategy 1: Canny edge-based detection (original approach)
function detectViaCanny(
  cv: any,
  gray: any,
  imageArea: number
): Array<{ x: number; y: number }> | null {
  let blurred: any, edges: any, contours: any, hierarchy: any, kernel: any
  try {
    blurred = new cv.Mat()
    edges = new cv.Mat()
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()

    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 50, 150) // Lower thresholds for low-contrast scenes

    kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    // Dilate twice (OpenCV.js doesn't support iterations param reliably)
    cv.dilate(edges, edges, kernel)
    cv.dilate(edges, edges, kernel)

    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const minArea = imageArea * 0.05
    // Try strict polygon, then looser, then rotated rect fallback
    return findBestQuadStrict(cv, contours, minArea, 0.02)
      ?? findBestQuadStrict(cv, contours, minArea, 0.04)
      ?? findBestQuadRect(cv, contours, minArea)
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[blurred, edges, contours, hierarchy, kernel].forEach(safeDelete)
  }
}

// Strategy 2: Heavy-blur threshold detection
// Heavy blur (31x31) smooths out carpet texture AND paper text,
// leaving only the overall brightness difference between paper and background
function detectViaThreshold(
  cv: any,
  gray: any,
  imageArea: number
): Array<{ x: number; y: number }> | null {
  let blurred: any, binary: any, contours: any, hierarchy: any, kernel: any
  try {
    blurred = new cv.Mat()
    binary = new cv.Mat()
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()

    // Heavy blur smooths out carpet pattern + paper text
    cv.GaussianBlur(gray, blurred, new cv.Size(31, 31), 0)

    // Try multiple thresholds — different lighting conditions need different values
    const thresholds = [190, 170, 150, 210]
    for (const thresh of thresholds) {
      cv.threshold(blurred, binary, thresh, 255, cv.THRESH_BINARY)

      // Aggressive close to merge any remaining holes
      kernel = cv.Mat.ones(25, 25, cv.CV_8U)
      const anchor = new cv.Point(-1, -1)
      cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel, anchor, 2)
      // Erode slightly to tighten edges back
      const smallKernel = cv.Mat.ones(5, 5, cv.CV_8U)
      cv.erode(binary, binary, smallKernel)
      smallKernel.delete()

      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

      const minArea = imageArea * 0.05
      const quad = findBestQuadStrict(cv, contours, minArea, 0.04)
        ?? findBestQuadStrict(cv, contours, minArea, 0.06)
        ?? findBestQuadStrict(cv, contours, minArea, 0.08)
        ?? findBestQuadRect(cv, contours, minArea)
      if (quad) {
        kernel.delete()
        return quad
      }
      kernel.delete()
    }

    return null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[blurred, binary, contours, hierarchy].forEach(safeDelete)
  }
}

// Returns 4 corner points sorted clockwise (TL, TR, BR, BL), or null if not found
// Tries edge-based detection first, then falls back to brightness threshold
export function detectA4Corners(
  cv: any,
  mat: any
): Array<{ x: number; y: number }> | null {
  let gray: any
  try {
    gray = new cv.Mat()
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY)

    const imageArea = mat.rows * mat.cols
    const corners = detectViaCanny(cv, gray, imageArea)
      ?? detectViaThreshold(cv, gray, imageArea)
    return corners ? sortCornersClockwise(corners) : null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    safeDelete(gray)
  }
}

// Applies getPerspectiveTransform + warpPerspective homography
// Returns rectified mat (caller must .delete() it) and pixelsPerMm
export function applyPerspectiveCorrection(
  cv: any,
  mat: any,
  corners: Array<{ x: number; y: number }>
): { rectified: any; pixelsPerMm: number } {
  const A4_W = A4_WIDTH_MM * SCALE  // 420
  const A4_H = A4_HEIGHT_MM * SCALE // 594

  // CV_32FC2 = 13 (hardcoded — cv.CV_32FC2 may be undefined in some OpenCV.js builds)
  const CV_32FC2 = cv.CV_32FC2 ?? 13
  const srcPoints = cv.matFromArray(4, 1, CV_32FC2,
    corners.flatMap(p => [p.x, p.y]))
  const dstPoints = cv.matFromArray(4, 1, CV_32FC2,
    [0, 0, A4_W, 0, A4_W, A4_H, 0, A4_H])

  const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
  const rectified = new cv.Mat()
  cv.warpPerspective(mat, rectified, M, new cv.Size(A4_W, A4_H))

  srcPoints.delete()
  dstPoints.delete()
  M.delete()

  return { rectified, pixelsPerMm: SCALE }
}

// Returns worst-case reprojection error in mm (0 = perfect)
// Used to compute accuracy_mm and confidence level in MeasurementResult
export function computeCalibrationAccuracy(
  detectedCorners: Array<{ x: number; y: number }>,
  pixelsPerMm: number
): number {
  const idealCorners = [
    { x: 0, y: 0 },
    { x: A4_WIDTH_MM * pixelsPerMm, y: 0 },
    { x: A4_WIDTH_MM * pixelsPerMm, y: A4_HEIGHT_MM * pixelsPerMm },
    { x: 0, y: A4_HEIGHT_MM * pixelsPerMm },
  ]
  const errors = detectedCorners.map((p, i) => {
    const ideal = idealCorners[i]
    return Math.sqrt((p.x - ideal.x) ** 2 + (p.y - ideal.y) ** 2)
  })
  return Math.max(...errors) / pixelsPerMm
}

// Helper: maps accuracy_mm to confidence string
export function accuracyToConfidence(accuracyMm: number): 'high' | 'medium' | 'low' {
  if (accuracyMm < 2) return 'high'
  if (accuracyMm < 5) return 'medium'
  return 'low'
}
