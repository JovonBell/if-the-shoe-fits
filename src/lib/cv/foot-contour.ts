/**
 * Foot contour extraction from perspective-corrected mat.
 * Receives the rectified (420x594px) mat from applyPerspectiveCorrection.
 * All Mats are deleted in try/finally — no exceptions.
 */

// Find largest contour in a valid area range from a binary mask
function findLargestFootContour(
  cv: any,
  mask: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let contours: any, hierarchy: any
  try {
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let bestContour: any = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area >= totalArea * 0.03 && area <= totalArea * 0.50 && area > bestArea) {
        bestArea = area
        bestContour = c
      }
    }

    if (!bestContour) return null

    const pts: Array<{ x: number; y: number }> = []
    for (let i = 0; i < bestContour.data32S.length; i += 2) {
      pts.push({ x: bestContour.data32S[i], y: bestContour.data32S[i + 1] })
    }
    return pts
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[contours, hierarchy].forEach(safeDelete)
  }
}

// Strategy 1: Non-paper detection with multi-threshold
// Paper is the brightest region (~230+). Foot/sock is darker.
// Uses heavy blur to smooth out printed text, then tries thresholds from high to low.
function detectViaNonPaper(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let gray: any, blurred: any, binary: any, kernel: any
  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    binary = new cv.Mat()

    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)
    // Heavy blur (21x21) smooths out printed text so only the foot shape remains
    cv.GaussianBlur(gray, blurred, new cv.Size(21, 21), 0)

    kernel = cv.Mat.ones(7, 7, cv.CV_8U)

    // Try thresholds from high to low:
    // 220 = only very bright paper excluded (catches light socks ~180-210)
    // 210 = medium
    // 200 = catches darker socks
    // 190 = aggressive
    const thresholds = [220, 210, 200, 190]
    for (const thresh of thresholds) {
      cv.threshold(blurred, binary, thresh, 255, cv.THRESH_BINARY)
      // Invert: pixels ABOVE threshold (paper) → black, below (foot) → white
      cv.bitwise_not(binary, binary)

      // Morphological close (dilate then erode) — fills gaps in foot region
      cv.dilate(binary, binary, kernel)
      cv.dilate(binary, binary, kernel)
      cv.dilate(binary, binary, kernel)
      cv.erode(binary, binary, kernel)
      cv.erode(binary, binary, kernel)
      cv.erode(binary, binary, kernel)

      const result = findLargestFootContour(cv, binary, totalArea)
      if (result) return result
    }

    return null
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, blurred, binary, kernel].forEach(safeDelete)
  }
}

// Strategy 2: Edge-based detection (Canny)
// Finds foot outline via edges, then fills to create a solid blob.
// Works even when foot color is close to paper color.
function detectViaEdges(
  cv: any,
  rectifiedMat: any,
  totalArea: number
): Array<{ x: number; y: number }> | null {
  let gray: any, blurred: any, edges: any, dilateKernel: any, erodeKernel: any
  try {
    gray = new cv.Mat()
    blurred = new cv.Mat()
    edges = new cv.Mat()

    cv.cvtColor(rectifiedMat, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 30, 100)

    // Heavy dilation to connect edge fragments into solid foot shape
    dilateKernel = cv.Mat.ones(11, 11, cv.CV_8U)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)
    cv.dilate(edges, edges, dilateKernel)

    // Erode back to approximate original size
    erodeKernel = cv.Mat.ones(9, 9, cv.CV_8U)
    cv.erode(edges, edges, erodeKernel)
    cv.erode(edges, edges, erodeKernel)
    cv.erode(edges, edges, erodeKernel)
    cv.erode(edges, edges, erodeKernel)

    return findLargestFootContour(cv, edges, totalArea)
  } finally {
    const safeDelete = (m: any) => { try { if (m && !m.isDeleted?.()) m.delete() } catch {} }
    ;[gray, blurred, edges, dilateKernel, erodeKernel].forEach(safeDelete)
  }
}

export function extractFootContour(
  cv: any,
  rectifiedMat: any
): Array<{ x: number; y: number }> | null {
  const totalArea = rectifiedMat.rows * rectifiedMat.cols

  // Try brightness-based first (fast, works for most sock/skin colors)
  // Then edge-based fallback (handles light socks on white paper)
  return detectViaNonPaper(cv, rectifiedMat, totalArea)
    ?? detectViaEdges(cv, rectifiedMat, totalArea)
}
