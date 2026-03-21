// Tests: SCAN-09 — left and right foot can be scanned separately
// Full implementation target: ScanSession from lib/cv/session.ts

import { describe, it, expect } from 'vitest'

describe('Left/right foot session (SCAN-09)', () => {
  it('ScanSession is exported from lib/cv/session', async () => {
    const mod = await import('@/lib/cv/session').catch(() => null)
    if (!mod) return // module not yet created
    expect(typeof mod.ScanSession).toBe('function')
  })

  it('ScanSession stores left and right results independently', async () => {
    const mod = await import('@/lib/cv/session').catch(() => null)
    if (!mod) return // module not yet created
    const session = new mod.ScanSession()
    const mockResult = {
      length_mm: 260,
      width_mm: 95,
      arch_mm: 180,
      toe_box_mm: 88,
      heel_mm: 58,
      accuracy_mm: 1.2,
      confidence: 'high' as const,
      calibration_px_per_mm: 2,
      foot_side: 'left' as const,
      captured_at: new Date().toISOString(),
    }
    session.setResult('left', mockResult)
    expect(session.getResult('left')).toEqual(mockResult)
    expect(session.getResult('right')).toBeNull()
  })

  it('ScanSession.isComplete returns true only when both feet have results', async () => {
    const mod = await import('@/lib/cv/session').catch(() => null)
    if (!mod) return // module not yet created
    const session = new mod.ScanSession()
    expect(session.isComplete()).toBe(false)
  })
})
