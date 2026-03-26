export type FootSide = 'left' | 'right'

export interface FootLandmarks {
  toe_tip: { x: number; y: number }
  heel_center: { x: number; y: number }
  ball_inner: { x: number; y: number }
  ball_outer: { x: number; y: number }
  arch_inner: { x: number; y: number }
  arch_outer: { x: number; y: number }
}

export interface MeasurementResult {
  length_mm: number
  width_mm: number
  arch_mm: number
  toe_box_mm: number
  heel_mm: number
  accuracy_mm: number
  confidence: 'high' | 'medium' | 'low'
  contour_points?: Array<{ x: number; y: number }>
  landmarks?: FootLandmarks
  paper_corners?: Array<{ x: number; y: number }>
  calibration_px_per_mm: number
  foot_side: FootSide
  captured_at: string  // ISO timestamp
}

export type ScanErrorCode =
  | 'A4_NOT_DETECTED'
  | 'FOOT_NOT_DETECTED'
  | 'POOR_LIGHTING'
  | 'CALIBRATION_FAILED'
  | 'CV_ERROR'

export interface ScanError {
  code: ScanErrorCode
  message: string
  technical?: string
}

export type ScanResult =
  | { success: true; data: MeasurementResult }
  | { success: false; error: ScanError }
