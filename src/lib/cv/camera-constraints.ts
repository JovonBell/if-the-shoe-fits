/**
 * Camera constraints for getUserMedia.
 * Resolution hints (width/height ideal) steer iOS 16.4+ away from the ultra-wide lens
 * regression (WebKit bug #253186). Using 'ideal' (not 'exact') preserves compatibility
 * with single-camera devices.
 */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

/**
 * Resize ImageData to maxDim on longest side before sending to worker.
 * Full 12-48MP photos cause 10-30s processing time; 1200px is sufficient for ±1mm accuracy.
 */
export function resizeImageData(source: HTMLCanvasElement, maxDim = 1200): ImageData {
  const scale = Math.min(maxDim / source.width, maxDim / source.height, 1)
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}
