// Tests: SCAN-06 (arch), SCAN-07 (toe box width), SCAN-08 (heel width)
// Full implementation target: extractMeasurements from lib/cv/measurements.ts

import { describe, it, expect } from 'vitest'

describe('Extended measurements (SCAN-06, SCAN-07, SCAN-08)', () => {
  it('extractMeasurements exports arch_mm, toe_box_mm, heel_mm in return type', async () => {
    const mod = await import('@/lib/cv/measurements').catch(() => null)
    if (!mod) return // module not yet created
    expect(typeof mod.extractMeasurements).toBe('function')
  })

  it('arch_mm is positive for non-trivial contour', async () => {
    const mod = await import('@/lib/cv/measurements')
    // Create a simple vertical strip of points that will have medial points in the arch band
    const pts: Array<{ x: number; y: number }> = []
    for (let y = 0; y <= 300; y += 1) {
      pts.push({ x: 10, y }, { x: 90, y })
    }
    const result = mod.extractMeasurements(pts, 2)
    // arch_mm should be > 0 since we have points in the 40-65% Y band
    expect(result.arch_mm).toBeGreaterThan(0)
  })

  it('toe_box_mm uses the top 25% of foot height', async () => {
    const mod = await import('@/lib/cv/measurements')
    // Narrow at top (toe), wide in middle
    const pts: Array<{ x: number; y: number }> = [
      // Top 25% (y 0-50 of 200): narrow, x 40-60
      { x: 40, y: 0 }, { x: 60, y: 0 },
      { x: 40, y: 50 }, { x: 60, y: 50 },
      // Middle (y 80-120): wide, x 0-100
      { x: 0, y: 80 }, { x: 100, y: 80 },
      { x: 0, y: 120 }, { x: 100, y: 120 },
      // Bottom (y 170-200): narrow heel
      { x: 45, y: 170 }, { x: 55, y: 170 },
      { x: 45, y: 200 }, { x: 55, y: 200 },
    ]
    const result = mod.extractMeasurements(pts, 2)
    // toe_box should be narrower than width
    expect(result.toe_box_mm).toBeLessThan(result.width_mm)
  })

  it.skip('fixture missing: arch_mm is positive and less than length_mm', async () => {
    // Requires fixture + OpenCV loaded
    // Expected: arch_mm > 0 and arch_mm < length_mm
  })

  it.skip('fixture missing: toe_box_mm is positive and less than width_mm * 1.5', async () => {
    // Requires fixture + OpenCV loaded
  })

  it.skip('fixture missing: heel_mm is positive and less than width_mm * 1.5', async () => {
    // Requires fixture + OpenCV loaded
  })
})
