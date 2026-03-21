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

// Returns 4 corner points sorted clockwise (TL, TR, BR, BL), or null if not found
// cv: any = the global cv object from OpenCV.js (passed in to avoid Worker/non-Worker coupling)
export function detectA4Corners(
  cv: any,
  mat: any
): Array<{ x: number; y: number }> | null {
  let gray: any, blurred: any, edges: any, contours: any, hierarchy: any, kernel: any

  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    edges = new cv.Mat()
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()

    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 75, 200)

    kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    cv.dilate(edges, edges, kernel)

    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let bestQuad: Array<{ x: number; y: number }> | null = null
    let bestArea = 0
    const minArea = mat.rows * mat.cols * 0.10

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)
      if (area < minArea) continue

      const peri = cv.arcLength(contour, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(contour, approx, 0.02 * peri, true)

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

        if (Math.abs(ratio - A4_ASPECT_RATIO) < 0.07 && area > bestArea) {
          bestArea = area
          bestQuad = pts
        }
      }
      approx.delete()
    }

    return bestQuad ? sortCornersClockwise(bestQuad) : null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, blurred, edges, contours, hierarchy, kernel].forEach(safeDelete)
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

  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2,
    corners.flatMap(p => [p.x, p.y]))
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2,
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
