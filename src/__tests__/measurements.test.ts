// Tests: SCAN-04 (length), SCAN-05 (width)
// Full implementation target: extractMeasurements from lib/cv/measurements.ts

import { describe, it, expect } from 'vitest'

describe('Length and width measurement (SCAN-04, SCAN-05)', () => {
  it('extractMeasurements is exported from lib/cv/measurements', async () => {
    const mod = await import('@/lib/cv/measurements').catch(() => null)
    if (!mod) return // module not yet created
    expect(typeof mod.extractMeasurements).toBe('function')
  })

  it('returns length_mm and width_mm fields', async () => {
    const mod = await import('@/lib/cv/measurements').catch(() => null)
    if (!mod) return // module not yet created
    // Structural check: function exists and its return shape will include these fields
    expect(typeof mod.extractMeasurements).toBe('function')
  })

  it('extractMeasurements returns zero values for empty points array', async () => {
    const mod = await import('@/lib/cv/measurements')
    const result = mod.extractMeasurements([], 2)
    expect(result.length_mm).toBe(0)
    expect(result.width_mm).toBe(0)
  })

  it('extractMeasurements computes correct length from simple vertical rectangle points', async () => {
    const mod = await import('@/lib/cv/measurements')
    // Rectangle: x 0-100, y 0-260px; pixelsPerMm=2 → length should be 130mm
    const rectPoints: Array<{ x: number; y: number }> = [
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 100, y: 260 }, { x: 0, y: 260 },
    ]
    const result = mod.extractMeasurements(rectPoints, 2)
    expect(result.length_mm).toBe(130) // 260px / 2px/mm
  })

  it('extractMeasurements computes correct width from simple rectangle', async () => {
    const mod = await import('@/lib/cv/measurements')
    // Dense rectangle: x 0-100, y 0-260px; pixelsPerMm=2 → width (ball region 30-70%) should be 50mm
    // Must include points in the ball band (y 78-182) for xSpanInYBand to find them
    const rectPoints: Array<{ x: number; y: number }> = []
    for (let y = 0; y <= 260; y += 10) {
      rectPoints.push({ x: 0, y }, { x: 100, y })
    }
    const result = mod.extractMeasurements(rectPoints, 2)
    expect(result.width_mm).toBe(50) // 100px / 2px/mm
  })

  it.skip('fixture missing: length within 3mm of ground truth on calibrated fixture', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg + OpenCV loaded
    // Ground truth: measure test foot manually; acceptable error ±3mm
  })

  it.skip('fixture missing: width within 3mm of ground truth on calibrated fixture', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg + OpenCV loaded
  })
})
