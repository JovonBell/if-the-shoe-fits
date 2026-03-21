// Stub — full implementation in Plan 02
import type { MeasurementResult } from './types'

export class ScanSession {
  private results: { left: MeasurementResult | null; right: MeasurementResult | null } = {
    left: null,
    right: null,
  }

  setResult(side: 'left' | 'right', result: MeasurementResult): void {
    this.results[side] = result
  }

  getResult(side: 'left' | 'right'): MeasurementResult | null {
    return this.results[side]
  }

  isComplete(): boolean {
    return this.results.left !== null && this.results.right !== null
  }
}
