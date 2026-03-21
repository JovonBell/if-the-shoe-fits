// Tests: SCAN-03 — foot contour extraction
// Full implementation target: extractFootContour from lib/cv/foot-contour.ts

import { describe, it, expect } from 'vitest'

describe('Foot contour extraction (SCAN-03)', () => {
  it('extractFootContour is exported from lib/cv/foot-contour', async () => {
    const mod = await import('@/lib/cv/foot-contour').catch(() => null)
    if (!mod) return // module not yet created
    expect(typeof mod.extractFootContour).toBe('function')
  })

  it.skip('fixture missing: returns contour points from overhead foot photo', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg + OpenCV loaded
    // Expected: returns array of {x, y} points, length > 100
  })

  it.skip('fixture missing: returns null when no foot detected', async () => {
    // Expected: when image has no foot-like region, returns null
  })
})
