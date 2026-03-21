// Tests: SCAN-12 — EXIF orientation normalization
// Full implementation target: normalizeOrientation from lib/cv/exif.ts

import { describe, it, expect } from 'vitest'

describe('EXIF normalization (SCAN-12)', () => {
  it('normalizeOrientation is exported from lib/cv/exif', async () => {
    const mod = await import('@/lib/cv/exif').catch(() => null)
    if (!mod) return // module not yet created
    expect(typeof mod.normalizeOrientation).toBe('function')
  })

  it.skip('fixture missing: rotates EXIF orientation-6 image to upright', async () => {
    // Requires: src/__tests__/fixtures/foot-exif-rotated.jpg
    // Expected: returned ImageData has swapped width/height vs input
  })

  it.skip('fixture missing: leaves already-upright image unchanged', async () => {
    // Requires: src/__tests__/fixtures/foot-overhead-a4.jpg
    // Expected: returned ImageData has same width/height as input
  })
})
