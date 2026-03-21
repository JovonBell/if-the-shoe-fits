// Stub — full implementation in Plan 02
export type Confidence = 'high' | 'medium' | 'low'

export interface MeasurementResult {
  length_mm: number
  width_mm: number
  arch_mm: number
  toe_box_mm: number
  heel_mm: number
  accuracy_mm: number
  confidence: Confidence
  calibration_px_per_mm: number
  foot_side: 'left' | 'right'
  captured_at: string
}
