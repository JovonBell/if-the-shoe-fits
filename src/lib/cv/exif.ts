import * as exifr from 'exifr'

/**
 * Normalize EXIF orientation before sending to CV worker.
 * Must run on main thread — uses OffscreenCanvas.
 * Handles iOS Safari autorotation quirk via exifr.rotation() (not raw EXIF Orientation tag).
 */
export async function normalizeOrientation(blob: Blob): Promise<ImageData> {
  const rotation = await exifr.rotation(blob).catch(() => null)
  const img = await createImageBitmap(blob)
  const { deg = 0, scaleX = 1 } = rotation ?? {}

  const radians = (deg * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const outW = Math.round(img.width * cos + img.height * sin)
  const outH = Math.round(img.width * sin + img.height * cos)

  const canvas = new OffscreenCanvas(outW, outH)
  const ctx = canvas.getContext('2d')!

  ctx.translate(outW / 2, outH / 2)
  if (scaleX === -1) ctx.scale(-1, 1)
  ctx.rotate(radians)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)

  img.close()
  return ctx.getImageData(0, 0, outW, outH)
}
