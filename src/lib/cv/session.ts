import type { MeasurementResult, FootSide } from './types'

export class ScanSession {
  private results: Record<FootSide, MeasurementResult | null> = {
    left: null,
    right: null,
  }

  setResult(side: FootSide, result: MeasurementResult): void {
    this.results[side] = result
  }

  getResult(side: FootSide): MeasurementResult | null {
    return this.results[side]
  }

  isComplete(): boolean {
    return this.results.left !== null && this.results.right !== null
  }

  reset(): void {
    this.results = { left: null, right: null }
  }
}
