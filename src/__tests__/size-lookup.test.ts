/**
 * Size lookup tests — covers UX-03, UX-06
 */
import { describe, it, expect } from 'vitest'
import { lookupSize, getRecommendedSize } from '@/lib/sizing/size-lookup'
import type { MeasurementResult } from '@/lib/cv/types'

// Helper to build a minimal MeasurementResult with a given length
function makeMeasurement(length_mm: number): MeasurementResult {
  return {
    length_mm,
    width_mm: 90,
    arch_mm: 40,
    toe_box_mm: 85,
    heel_mm: 35,
    accuracy_mm: 2,
    confidence: 'high',
    confidence_score: 95,
    calibration_px_per_mm: 2,
    foot_side: 'left',
    captured_at: new Date().toISOString(),
  }
}

describe('lookupSize', () => {
  it('returns US womens 8, EU 38, UK 6 for 237mm', () => {
    const result = lookupSize(237)
    expect(result.us_womens).toBe('8')
    expect(result.eu).toBe('38')
    expect(result.uk).toBe('6')
  })

  it('returns US womens 10, US mens 8, EU 40, UK 7.5 for 254mm', () => {
    const result = lookupSize(254)
    expect(result.us_womens).toBe('10')
    expect(result.us_mens).toBe('8')
    expect(result.eu).toBe('40')
    expect(result.uk).toBe('7.5')
  })

  it('returns all "?" for 100mm (below range)', () => {
    const result = lookupSize(100)
    expect(result.us_womens).toBe('?')
    expect(result.us_mens).toBe('?')
    expect(result.eu).toBe('?')
    expect(result.uk).toBe('?')
  })

  it('returns all "?" for 350mm (above range)', () => {
    const result = lookupSize(350)
    expect(result.us_womens).toBe('?')
    expect(result.us_mens).toBe('?')
    expect(result.eu).toBe('?')
    expect(result.uk).toBe('?')
  })
})

describe('getRecommendedSize', () => {
  it('returns size for larger foot (252mm) when left=245, right=252', () => {
    const left = makeMeasurement(245)
    const right = makeMeasurement(252)
    const result = getRecommendedSize(left, right)
    // 252mm falls in [246, 254) → US womens 9, EU 39, UK 7
    expect(result.us_womens).toBe('9')
    expect(result.eu).toBe('39')
    expect(result.uk).toBe('7')
  })

  it('uses single foot when right is null', () => {
    const left = makeMeasurement(245)
    const result = getRecommendedSize(left, null)
    // 245mm falls in [237, 246) → US womens 8, EU 38, UK 6
    expect(result.us_womens).toBe('8')
    expect(result.eu).toBe('38')
  })

  it('returns all "?" when both feet are null', () => {
    const result = getRecommendedSize(null, null)
    expect(result.us_womens).toBe('?')
    expect(result.us_mens).toBe('?')
    expect(result.eu).toBe('?')
    expect(result.uk).toBe('?')
  })
})
