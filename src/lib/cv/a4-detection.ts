// Stub — full implementation in Plan 02
export const A4_ASPECT_RATIO = 210 / 297 // ~0.707

export function detectA4Corners(_imageData: ImageData): Array<{ x: number; y: number }> | null {
  throw new Error('Not implemented')
}

export function computeCalibrationAccuracy(
  corners: Array<{ x: number; y: number }>,
  pixelsPerMm: number
): number {
  // For perfect A4 corners (210mm x 297mm), compute error
  const width = Math.abs(corners[1].x - corners[0].x)
  const height = Math.abs(corners[2].y - corners[1].y)
  const expectedWidth = 210 * pixelsPerMm
  const expectedHeight = 297 * pixelsPerMm
  const widthError = Math.abs(width - expectedWidth)
  const heightError = Math.abs(height - expectedHeight)
  return (widthError + heightError) / 2 / pixelsPerMm
}
