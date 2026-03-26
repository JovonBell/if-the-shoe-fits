/**
 * Foot measurement extraction from contour points.
 * Pure function — no OpenCV dependency, no Mats.
 * Input: contour points from extractFootContour and pixelsPerMm from calibration.
 */

import type { FootLandmarks } from './types'

function xSpanInYBand(
  points: Array<{ x: number; y: number }>,
  yMin: number,
  yMax: number
): { span: number; minPt: { x: number; y: number }; maxPt: { x: number; y: number } } {
  const band = points.filter(p => p.y >= yMin && p.y <= yMax)
  if (band.length === 0) return { span: 0, minPt: { x: 0, y: 0 }, maxPt: { x: 0, y: 0 } }
  let minX = Infinity, maxX = -Infinity
  let minPt = band[0], maxPt = band[0]
  for (const p of band) {
    if (p.x < minX) { minX = p.x; minPt = p }
    if (p.x > maxX) { maxX = p.x; maxPt = p }
  }
  return { span: maxX - minX, minPt, maxPt }
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
  landmarks: FootLandmarks
} {
  const empty: FootLandmarks = {
    toe_tip: { x: 0, y: 0 },
    heel_center: { x: 0, y: 0 },
    ball_inner: { x: 0, y: 0 },
    ball_outer: { x: 0, y: 0 },
    arch_inner: { x: 0, y: 0 },
    arch_outer: { x: 0, y: 0 },
  }

  if (points.length === 0) {
    return { length_mm: 0, width_mm: 0, arch_mm: 0, toe_box_mm: 0, heel_mm: 0, contour_points: [], landmarks: empty }
  }

  const ys = points.map(p => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const footHeight = maxY - minY

  const length_px = footHeight

  // Toe tip: topmost point (min Y)
  let toeTip = points[0]
  for (const p of points) {
    if (p.y < toeTip.y) toeTip = p
  }

  // Heel center: bottommost point (max Y)
  let heelCenter = points[0]
  for (const p of points) {
    if (p.y > heelCenter.y) heelCenter = p
  }

  // Width: max x-span across 30-70% of foot height (ball of foot region)
  const ballMin = minY + footHeight * 0.30
  const ballMax = minY + footHeight * 0.70
  const ballSpan = xSpanInYBand(points, ballMin, ballMax)
  const width_px = ballSpan.span

  // Arch region: 50-70% of foot height (narrowest part)
  const archMin = minY + footHeight * 0.50
  const archMax = minY + footHeight * 0.70
  const archSpan = xSpanInYBand(points, archMin, archMax)

  // Toe box: top 25% of foot height
  const toeMax = minY + footHeight * 0.25
  const toeSpan = xSpanInYBand(points, minY, toeMax)
  const toe_box_px = toeSpan.span

  // Heel: bottom 15% of foot height
  const heelMin = maxY - footHeight * 0.15
  const heelSpan = xSpanInYBand(points, heelMin, maxY)
  const heel_px = heelSpan.span

  // Arch length: medial (minimum X) points in the 40-65% Y band, sum Euclidean distances
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

  const landmarks: FootLandmarks = {
    toe_tip: toeTip,
    heel_center: heelCenter,
    ball_inner: ballSpan.minPt,
    ball_outer: ballSpan.maxPt,
    arch_inner: archSpan.minPt,
    arch_outer: archSpan.maxPt,
  }

  return {
    length_mm: length_px / pixelsPerMm,
    width_mm: width_px / pixelsPerMm,
    arch_mm: arch_px / pixelsPerMm,
    toe_box_mm: toe_box_px / pixelsPerMm,
    heel_mm: heel_px / pixelsPerMm,
    contour_points: points,
    landmarks,
  }
}
