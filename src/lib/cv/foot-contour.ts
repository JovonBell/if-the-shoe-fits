/**
 * Foot contour extraction from perspective-corrected mat.
 * Receives the rectified (420x594px) mat from applyPerspectiveCorrection.
 * All Mats are deleted in try/finally — no exceptions.
 */

export function extractFootContour(
  cv: any,
  rectifiedMat: any
): Array<{ x: number; y: number }> | null {
  let hsv: any, skinMaskLow: any, skinMaskHigh: any, skinMask: any
  let sockMask: any, combined: any, kernel5: any, kernel3: any
  let contours: any, hierarchy: any

  try {
    hsv = new cv.Mat()
    cv.cvtColor(rectifiedMat, hsv, cv.COLOR_RGBA2HSV)

    // Skin tone masks — two hue ranges (0-30 and 160-180) combined
    skinMaskLow = new cv.Mat()
    skinMaskHigh = new cv.Mat()
    skinMask = new cv.Mat()
    const skinLow1 = new cv.Scalar(0, 20, 70, 0)
    const skinHigh1 = new cv.Scalar(30, 255, 255, 255)
    const skinLow2 = new cv.Scalar(160, 20, 70, 0)
    const skinHigh2 = new cv.Scalar(180, 255, 255, 255)
    cv.inRange(hsv, skinLow1, skinHigh1, skinMaskLow)
    cv.inRange(hsv, skinLow2, skinHigh2, skinMaskHigh)
    cv.bitwise_or(skinMaskLow, skinMaskHigh, skinMask)

    // Dark sock mask — low saturation and value (black/dark)
    sockMask = new cv.Mat()
    const sockLow = new cv.Scalar(0, 0, 0, 0)
    const sockHigh = new cv.Scalar(180, 50, 80, 255)
    cv.inRange(hsv, sockLow, sockHigh, sockMask)

    // Combine masks
    combined = new cv.Mat()
    cv.bitwise_or(skinMask, sockMask, combined)

    // Morphological cleanup: MORPH_CLOSE 5x5 (fill gaps), then MORPH_OPEN 3x3 (remove noise)
    kernel5 = cv.Mat.ones(5, 5, cv.CV_8U)
    kernel3 = cv.Mat.ones(3, 3, cv.CV_8U)
    const anchor = new cv.Point(-1, -1)
    cv.morphologyEx(combined, combined, cv.MORPH_CLOSE, kernel5, anchor, 2)
    cv.morphologyEx(combined, combined, cv.MORPH_OPEN, kernel3, anchor, 1)

    // Find contours
    contours = new cv.MatVector()
    hierarchy = new cv.Mat()
    cv.findContours(combined, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    // Find largest contour within valid area range (5-40% of image)
    const totalArea = rectifiedMat.rows * rectifiedMat.cols
    let bestContour: any = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area >= totalArea * 0.05 && area <= totalArea * 0.40 && area > bestArea) {
        bestArea = area
        bestContour = c
      }
    }

    if (!bestContour) return null

    // Extract contour points from data32S array
    const pts: Array<{ x: number; y: number }> = []
    for (let i = 0; i < bestContour.data32S.length; i += 2) {
      pts.push({ x: bestContour.data32S[i], y: bestContour.data32S[i + 1] })
    }
    return pts
  } finally {
    const safeDelete = (m: any) => {
      try { if (m && !m.isDeleted?.()) m.delete() } catch {}
    }
    ;[hsv, skinMaskLow, skinMaskHigh, skinMask, sockMask, combined,
      kernel5, kernel3, contours, hierarchy].forEach(safeDelete)
  }
}
