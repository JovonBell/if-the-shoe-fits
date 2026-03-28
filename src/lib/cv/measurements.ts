/**
 * Foot measurement extraction from contour points.
 * Pure function — no OpenCV dependency, no Mats.
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

function spanInAlongBand(
  points: Array<{ x: number; y: number }>,
  cx: number,
  cy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  alongMin: number,
  alongMax: number
): {
  span: number
  minPt: { x: number; y: number }
  maxPt: { x: number; y: number }
} {
  const band = points.filter(p => {
    const along = (p.x - cx) * ax + (p.y - cy) * ay
    return along >= alongMin && along <= alongMax
  })
  if (band.length === 0) return { span: 0, minPt: { x: 0, y: 0 }, maxPt: { x: 0, y: 0 } }

  let minPerp = Infinity, maxPerp = -Infinity
  let minPt = band[0], maxPt = band[0]
  for (const p of band) {
    const perp = (p.x - cx) * bx + (p.y - cy) * by
    if (perp < minPerp) { minPerp = perp; minPt = p }
    if (perp > maxPerp) { maxPerp = perp; maxPt = p }
  }
  return { span: maxPerp - minPerp, minPt, maxPt }
}

export function extractMeasurements(
  points: Array<{ x: number; y: number }>,
  pixelsPerMm: number,
  scales?: { scaleX?: number; scaleY?: number }
): {
  length_mm: number
  width_mm: number
  arch_mm: number
  toe_box_mm: number
  heel_mm: number
  contour_points: Array<{ x: number; y: number }>
  landmarks: FootLandmarks
} {
  // scales.scaleX/scaleY are px/mm values (replacing pixelsPerMm for each axis)
  const pxPerMmX = scales?.scaleX ?? pixelsPerMm
  const pxPerMmY = scales?.scaleY ?? pixelsPerMm

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

  // Fallback to bounding box for very sparse point sets (< 5 points)
  if (points.length < 5) {
    const ys = points.map(p => p.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const footHeight = maxY - minY
    const length_px = footHeight

    let toeTip = points[0]
    for (const p of points) { if (p.y < toeTip.y) toeTip = p }
    let heelCenter = points[0]
    for (const p of points) { if (p.y > heelCenter.y) heelCenter = p }

    const ballMin = minY + footHeight * 0.30
    const ballMax = minY + footHeight * 0.70
    const ballSpan = xSpanInYBand(points, ballMin, ballMax)
    const width_px = ballSpan.span

    const archMin = minY + footHeight * 0.50
    const archMax = minY + footHeight * 0.70
    const archSpan = xSpanInYBand(points, archMin, archMax)

    const toeMax = minY + footHeight * 0.25
    const toeSpan = xSpanInYBand(points, minY, toeMax)
    const toe_box_px = toeSpan.span

    const heelMin = maxY - footHeight * 0.15
    const heelSpan = xSpanInYBand(points, heelMin, maxY)
    const heel_px = heelSpan.span

    const landmarks: FootLandmarks = {
      toe_tip: toeTip,
      heel_center: heelCenter,
      ball_inner: ballSpan.minPt,
      ball_outer: ballSpan.maxPt,
      arch_inner: archSpan.minPt,
      arch_outer: archSpan.maxPt,
    }

    return {
      length_mm: length_px / pxPerMmY,
      width_mm: width_px / pxPerMmX,
      arch_mm: 0,
      toe_box_mm: toe_box_px / pxPerMmX,
      heel_mm: heel_px / pxPerMmX,
      contour_points: points,
      landmarks,
    }
  }

  // PCA: compute centroid
  let cx = 0, cy = 0
  for (const p of points) { cx += p.x; cy += p.y }
  cx /= points.length
  cy /= points.length

  // 2×2 covariance matrix
  let cxx = 0, cxy = 0, cyy = 0
  for (const p of points) {
    const dx = p.x - cx
    const dy = p.y - cy
    cxx += dx * dx
    cxy += dx * dy
    cyy += dy * dy
  }
  cxx /= points.length
  cxy /= points.length
  cyy /= points.length

  // Analytic eigendecomposition of 2×2 symmetric matrix
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc // larger eigenvalue → principal axis

  // Principal eigenvector for lambda1
  let ax: number, ay: number
  if (Math.abs(cxy) > 1e-10) {
    ax = lambda1 - cyy
    ay = cxy
  } else {
    // Already diagonal — pick axis with larger variance
    ax = cxx >= cyy ? 1 : 0
    ay = cxx >= cyy ? 0 : 1
  }
  const aNorm = Math.sqrt(ax * ax + ay * ay)
  ax /= aNorm
  ay /= aNorm

  // Enforce ay > 0 (principal axis points toward higher Y = heel direction)
  if (ay < 0) { ax = -ax; ay = -ay }

  // Perpendicular axis (rotated 90° CCW)
  const bx = -ay
  const by = ax

  // Project all points along principal and perpendicular axes
  const alongs = points.map(p => (p.x - cx) * ax + (p.y - cy) * ay)
  const heelA = Math.max(...alongs)  // maximum along = heel
  const toeA = Math.min(...alongs)   // minimum along = toe
  const footLen = heelA - toeA

  // Landmarks: toe_tip and heel_center
  let toeTip = points[0], heelCenter = points[0]
  let minAlong = Infinity, maxAlong = -Infinity
  for (let i = 0; i < points.length; i++) {
    if (alongs[i] < minAlong) { minAlong = alongs[i]; toeTip = points[i] }
    if (alongs[i] > maxAlong) { maxAlong = alongs[i]; heelCenter = points[i] }
  }

  // Width zone: 55-70% from heel (along in [heelA - 0.70*footLen, heelA - 0.55*footLen])
  const ballAlongMin = heelA - 0.70 * footLen
  const ballAlongMax = heelA - 0.55 * footLen
  const ballSpanPCA = spanInAlongBand(points, cx, cy, ax, ay, bx, by, ballAlongMin, ballAlongMax)
  const width_px = ballSpanPCA.span

  // Toe box zone: 0-20% from toe → along in [toeA, toeA + 0.20*footLen]
  const toeAlongMin = toeA
  const toeAlongMax = toeA + 0.20 * footLen
  const toeSpanPCA = spanInAlongBand(points, cx, cy, ax, ay, bx, by, toeAlongMin, toeAlongMax)
  const toe_box_px = toeSpanPCA.span

  // Heel zone: 0-15% from heel → along in [heelA - 0.15*footLen, heelA]
  const heelAlongMin = heelA - 0.15 * footLen
  const heelAlongMax = heelA
  const heelSpanPCA = spanInAlongBand(points, cx, cy, ax, ay, bx, by, heelAlongMin, heelAlongMax)
  const heel_px = heelSpanPCA.span

  // Arch zone: 40-65% from toe → along in [toeA + 0.40*footLen, toeA + 0.65*footLen]
  const archAlongMin = toeA + 0.40 * footLen
  const archAlongMax = toeA + 0.65 * footLen
  const archSpanPCA = spanInAlongBand(points, cx, cy, ax, ay, bx, by, archAlongMin, archAlongMax)

  // Arch path length: medial (min-perp) points across arch zone slices
  const sliceCount = Math.max(1, Math.round(footLen * 0.25))
  const medialPoints: Array<{ x: number; y: number }> = []
  for (let i = 0; i < sliceCount; i++) {
    const sliceAlong = archAlongMin + (i / sliceCount) * (archAlongMax - archAlongMin)
    const sliceTol = Math.max((archAlongMax - archAlongMin) / sliceCount * 0.6, 2)
    const slicePts = points.filter(p => {
      const a = (p.x - cx) * ax + (p.y - cy) * ay
      return Math.abs(a - sliceAlong) < sliceTol
    })
    if (slicePts.length > 0) {
      let minPerp = Infinity
      let bestPt = slicePts[0]
      for (const p of slicePts) {
        const perp = (p.x - cx) * bx + (p.y - cy) * by
        if (perp < minPerp) { minPerp = perp; bestPt = p }
      }
      medialPoints.push(bestPt)
    }
  }

  const arch_px = medialPoints.slice(1).reduce((sum, p, i) => {
    const prev = medialPoints[i]
    return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2)
  }, 0)

  const landmarks: FootLandmarks = {
    toe_tip: toeTip,
    heel_center: heelCenter,
    ball_inner: ballSpanPCA.minPt,
    ball_outer: ballSpanPCA.maxPt,
    arch_inner: archSpanPCA.minPt,
    arch_outer: archSpanPCA.maxPt,
  }

  return {
    length_mm: footLen / pxPerMmY,
    width_mm: width_px / pxPerMmX,
    arch_mm: arch_px / pixelsPerMm,
    toe_box_mm: toe_box_px / pxPerMmX,
    heel_mm: heel_px / pxPerMmX,
    contour_points: points,
    landmarks,
  }
}

export function validateMeasurements(m: {
  length_mm: number
  width_mm: number
  heel_mm: number
  toe_box_mm: number
}): { valid: boolean; reason?: string } {
  if (m.length_mm < 200 || m.length_mm > 340) return { valid: false, reason: 'length out of range' }
  if (m.width_mm < 60 || m.width_mm > 130) return { valid: false, reason: 'width out of range' }
  if (m.heel_mm < 40 || m.heel_mm > 100) return { valid: false, reason: 'heel out of range' }
  if (m.toe_box_mm < 60 || m.toe_box_mm > 120) return { valid: false, reason: 'toe box out of range' }
  if (m.width_mm >= m.length_mm) return { valid: false, reason: 'width >= length' }
  if (m.heel_mm >= m.width_mm) return { valid: false, reason: 'heel >= width' }
  return { valid: true }
}
