/**
 * Foot measurement extraction from contour points.
 * Pure function — no OpenCV dependency, no Mats.
 * Input: contour points from extractFootContour and pixelsPerMm from calibration.
 */

function xSpanInYBand(
  points: Array<{ x: number; y: number }>,
  yMin: number,
  yMax: number
): number {
  const band = points.filter(p => p.y >= yMin && p.y <= yMax)
  if (band.length === 0) return 0
  const xs = band.map(p => p.x)
  return Math.max(...xs) - Math.min(...xs)
}

export function extractMeasurements(
  points: Array<{ x: number; y: number }>,
  pixelsPerMm: number
): {
  length_mm: number
  width_mm: number
  arch_mm: number
  toe_box_mm: number
  heel_mm: number
  contour_points: Array<{ x: number; y: number }>
} {
  if (points.length === 0) {
    return { length_mm: 0, width_mm: 0, arch_mm: 0, toe_box_mm: 0, heel_mm: 0, contour_points: [] }
  }

  const ys = points.map(p => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const footHeight = maxY - minY

  const length_px = footHeight

  // Width: max x-span across middle 30-70% of foot height (ball of foot region)
  const ballMin = minY + footHeight * 0.30
  const ballMax = minY + footHeight * 0.70
  const width_px = xSpanInYBand(points, ballMin, ballMax)

  // Toe box: top 25% of foot height
  const toeMax = minY + footHeight * 0.25
  const toe_box_px = xSpanInYBand(points, minY, toeMax)

  // Heel: bottom 15% of foot height
  const heelMin = maxY - footHeight * 0.15
  const heel_px = xSpanInYBand(points, heelMin, maxY)

  // Arch: medial (minimum X) points in the 40-65% Y band, sum Euclidean distances
  // This is a 2D approximation from a top-down view
  const archBandMin = minY + footHeight * 0.40
  const archBandMax = minY + footHeight * 0.65
  const sliceCount = Math.max(1, Math.round(footHeight * 0.25))
  const medialPoints: Array<{ x: number; y: number }> = []

  for (let i = 0; i < sliceCount; i++) {
    const sliceY = archBandMin + (i / sliceCount) * (archBandMax - archBandMin)
    const slicePoints = points.filter(p => Math.abs(p.y - sliceY) < 2)
    if (slicePoints.length > 0) {
      const minX = Math.min(...slicePoints.map(p => p.x))
      medialPoints.push({ x: minX, y: sliceY })
    }
  }

  const arch_px = medialPoints.slice(1).reduce((sum, p, i) => {
    const prev = medialPoints[i]
    return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2)
  }, 0)

  return {
    length_mm: length_px / pixelsPerMm,
    width_mm: width_px / pixelsPerMm,
    arch_mm: arch_px / pixelsPerMm,
    toe_box_mm: toe_box_px / pixelsPerMm,
    heel_mm: heel_px / pixelsPerMm,
    contour_points: points,
  }
}
