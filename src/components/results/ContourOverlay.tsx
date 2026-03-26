'use client'

import { useEffect, useRef } from 'react'
import type { MeasurementResult, FootLandmarks } from '@/lib/cv/types'

interface Props {
  imageData: ImageData
  measurements: MeasurementResult
}

/** Compute measurement line endpoints from contour extrema */
function computeMeasurementLines(pts: Array<{ x: number; y: number }>) {
  let minY = Infinity, maxY = -Infinity
  let minYPt = pts[0], maxYPt = pts[0]
  let minX = Infinity, maxX = -Infinity
  let minXPt = pts[0], maxXPt = pts[0]

  for (const p of pts) {
    if (p.y < minY) { minY = p.y; minYPt = p }
    if (p.y > maxY) { maxY = p.y; maxYPt = p }
    if (p.x < minX) { minX = p.x; minXPt = p }
    if (p.x > maxX) { maxX = p.x; maxXPt = p }
  }

  const widthMidY = (minXPt.y + maxXPt.y) / 2

  return {
    length: {
      start: { x: (minYPt.x + maxYPt.x) / 2, y: minY },
      end:   { x: (minYPt.x + maxYPt.x) / 2, y: maxY },
    },
    width: {
      start: { x: minX, y: widthMidY },
      end:   { x: maxX, y: widthMidY },
    },
  }
}

/** Draw a measurement line with end caps and centered label */
function drawMeasurementLine(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  label: string,
  color: string
) {
  const capSize = 6

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  ctx.setLineDash([])
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = -dy / len
  const ny = dx / len

  ctx.beginPath()
  ctx.moveTo(start.x + nx * capSize, start.y + ny * capSize)
  ctx.lineTo(start.x - nx * capSize, start.y - ny * capSize)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(end.x + nx * capSize, end.y + ny * capSize)
  ctx.lineTo(end.x - nx * capSize, end.y - ny * capSize)
  ctx.stroke()

  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const textMetrics = ctx.measureText(label)
  const padding = 4
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillRect(
    midX - textMetrics.width / 2 - padding,
    midY - 8 - padding,
    textMetrics.width + padding * 2,
    16 + padding * 2
  )
  ctx.fillStyle = color
  ctx.fillText(label, midX, midY)

  ctx.restore()
}

/** Draw a landmark dot with optional label */
function drawLandmarkDot(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  color: string,
  radius: number = 6
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

export function ContourOverlay({ imageData, measurements }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !measurements.contour_points?.length) return

    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the captured photo
    ctx.putImageData(imageData, 0, 0)

    const pts = measurements.contour_points

    // Draw contour overlay — maroon semi-transparent fill
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.closePath()
    ctx.fillStyle = 'rgba(133, 3, 33, 0.15)'
    ctx.strokeStyle = '#850321'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()

    // Draw measurement lines
    const lines = computeMeasurementLines(pts)
    const lineColor = '#850321'

    drawMeasurementLine(
      ctx,
      lines.length.start,
      lines.length.end,
      `${measurements.length_mm.toFixed(0)} mm`,
      lineColor
    )

    drawMeasurementLine(
      ctx,
      lines.width.start,
      lines.width.end,
      `${measurements.width_mm.toFixed(0)} mm`,
      lineColor
    )

    // Draw landmark dots
    if (measurements.landmarks) {
      const lm = measurements.landmarks
      const dotColor = '#a855f7' // purple to match reference
      drawLandmarkDot(ctx, lm.toe_tip, dotColor, 7)
      drawLandmarkDot(ctx, lm.heel_center, dotColor, 7)
      drawLandmarkDot(ctx, lm.ball_inner, dotColor, 6)
      drawLandmarkDot(ctx, lm.ball_outer, dotColor, 6)
      drawLandmarkDot(ctx, lm.arch_inner, dotColor, 5)
      drawLandmarkDot(ctx, lm.arch_outer, dotColor, 5)
    }
  }, [imageData, measurements])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto rounded-lg"
      style={{ maxHeight: '280px', objectFit: 'contain' }}
      aria-label="Your foot scan with measurement contour overlay"
    />
  )
}
