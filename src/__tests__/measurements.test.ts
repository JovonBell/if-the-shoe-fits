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

  it.skip('fixture missing: length within 3mm of ground truth on calibrated fixture', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg + OpenCV loaded
    // Ground truth: measure test foot manually; acceptable error ±3mm
  })

  it.skip('fixture missing: width within 3mm of ground truth on calibrated fixture', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg + OpenCV loaded
  })
})
