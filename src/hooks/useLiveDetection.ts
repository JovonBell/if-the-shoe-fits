'use client'

/**
 * Live foot detection on camera feed.
 *
 * Algorithm:
 *  1. 92nd-percentile brightness — ensures we sample actual paper (not skin/carpet)
 *  2. Strict paper pixels: brightness ≥ paperRef × 0.88 (excludes ankle skin ~140-180)
 *  3. Paper bbox computed ONLY from strict paper pixels
 *  4. Foot candidates: within INSET paper bbox, pixels < paperRef × 0.76
 *  5. Dilate candidates to fill sock-texture gaps
 *  6. Draw OUTLINE (stroke) of foot blob in brand color — not a filled blob
 */

import { useEffect, useRef, useState } from 'react'

const SAMPLE_W           = 240   // higher resolution → smoother outline, better detection
const DETECT_INTERVAL    = 200   // ms

const PAPER_PERCENTILE   = 0.92  // 92nd-pctile lands on paper pixels, not skin
const PAPER_STRICT_RATIO = 0.88  // brightness > paperRef×0.88 → definite paper (excludes ankle)
const PAPER_BBOX_RATIO   = 0.85  // loose threshold for paperCoverage count
const FOOT_RATIO         = 0.76  // within paper: pixel < paperRef×0.76 → foot candidate
const MIN_PAPER_REF      = 170   // require actual paper brightness; 100 was too low (included skin)
const MIN_FOOT_COVERAGE  = 0.01  // ≥1% of frame
const MAX_FOOT_COVERAGE  = 0.45  // ≤45% of frame
const MIN_PAPER_COVERAGE = 0.06  // ≥6% of frame looks like paper
const DILATION           = 4     // fill sock-texture gaps
const EDGE_INSET         = DILATION + 2  // inset from strict paper bbox before foot detection

export function useLiveDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  active: boolean,
  side: 'left' | 'right' = 'left'
): { footDetected: boolean } {
  const [footDetected, setFootDetected] = useState(false)
  const stateRef = useRef({ active, lastRun: 0, footDetected: false, side })
  useEffect(() => { stateRef.current.active = active }, [active])
  useEffect(() => { stateRef.current.side = side }, [side])

  useEffect(() => {
    const sampleCanvas = document.createElement('canvas')
    const maskCanvas   = document.createElement('canvas')
    const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })!

    let lumBuf:  Float32Array | null = null
    let sortBuf: Float32Array | null = null

    function detect() {
      const video   = videoRef.current
      const overlay = overlayCanvasRef.current
      if (!video || !overlay || video.readyState < 2 || !video.videoWidth) return

      const vW = video.videoWidth,  vH = video.videoHeight
      const dW = overlay.clientWidth  || vW
      const dH = overlay.clientHeight || vH
      const displayAspect = dW / dH
      const videoAspect   = vW / vH

      let srcX: number, srcY: number, srcW: number, srcH: number
      if (videoAspect > displayAspect) {
        srcH = vH; srcW = Math.round(vH * displayAspect)
        srcX = Math.round((vW - srcW) / 2); srcY = 0
      } else {
        srcW = vW; srcH = Math.round(vW / displayAspect)
        srcX = 0;  srcY = Math.round((vH - srcH) / 2)
      }

      const sW    = SAMPLE_W
      const sH    = Math.max(1, Math.round(SAMPLE_W * srcH / srcW))
      const total = sW * sH

      if (!lumBuf || lumBuf.length !== total) {
        lumBuf  = new Float32Array(total)
        sortBuf = new Float32Array(total)
      }

      sampleCanvas.width = sW; sampleCanvas.height = sH
      sCtx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, sW, sH)
      const { data } = sCtx.getImageData(0, 0, sW, sH)

      for (let i = 0; i < total; i++) {
        lumBuf[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
      }

      // 92nd-percentile — lands on paper pixels in a scene with dark background
      sortBuf!.set(lumBuf)
      sortBuf!.sort()
      const paperRef = sortBuf![Math.floor(total * PAPER_PERCENTILE)]

      if (paperRef < MIN_PAPER_REF) {
        // No paper visible — scene too dark
        if (stateRef.current.footDetected) { stateRef.current.footDetected = false; setFootDetected(false) }
        overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
        return
      }

      const strictThresh = paperRef * PAPER_STRICT_RATIO  // definite paper pixels
      const looseThresh  = paperRef * PAPER_BBOX_RATIO    // for paperCoverage count
      const footThresh   = paperRef * FOOT_RATIO

      // Pass 1: paper bbox from STRICT paper pixels only (excludes ankle skin 140-180)
      let pMinX = sW, pMaxX = 0, pMinY = sH, pMaxY = 0, looseCount = 0
      for (let y = 0; y < sH; y++) {
        for (let x = 0; x < sW; x++) {
          const l = lumBuf![y * sW + x]
          if (l > looseThresh) looseCount++
          if (l > strictThresh) {
            if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x
            if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y
          }
        }
      }
      const paperCoverage = looseCount / total

      if (pMaxX < pMinX || pMaxY < pMinY || paperCoverage < MIN_PAPER_COVERAGE) {
        if (stateRef.current.footDetected) { stateRef.current.footDetected = false; setFootDetected(false) }
        overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
        return
      }

      // Inset bbox to avoid edge contamination (left/right/top only — bottom allows heel)
      const iMinX = Math.min(pMinX + EDGE_INSET, pMaxX)
      const iMaxX = Math.max(pMaxX - EDGE_INSET, pMinX)
      const iMinY = Math.min(pMinY + EDGE_INSET, pMaxY)
      const iMaxY = Math.max(pMaxY - EDGE_INSET, pMinY)

      // Extend detection 25% of paper height below the paper edge for heel visibility
      const heelExtend = Math.round((pMaxY - pMinY) * 0.25)
      const drawMaxY = Math.min(pMaxY + heelExtend, sH - 1)

      // Pass 2: foot candidate pixels — count only within paper (for detection threshold),
      //         but mark below paper too (for heel drawing)
      const footMask = new Uint8Array(total)
      let footCount = 0
      for (let y = iMinY; y <= drawMaxY; y++) {
        for (let x = iMinX; x <= iMaxX; x++) {
          if (lumBuf![y * sW + x] < footThresh) {
            footMask[y * sW + x] = 1
            if (y <= iMaxY) footCount++
          }
        }
      }

      // Pass 3: dilate foot mask → solid blob (fills sock-texture gaps, merges heel)
      const dilatedMask = new Uint8Array(total)
      for (let y = iMinY; y <= drawMaxY; y++) {
        for (let x = iMinX; x <= iMaxX; x++) {
          outer: for (let dy = -DILATION; dy <= DILATION; dy++) {
            const ny = y + dy
            if (ny < iMinY || ny > drawMaxY) continue
            for (let dx = -DILATION; dx <= DILATION; dx++) {
              const nx = x + dx
              if (nx >= iMinX && nx <= iMaxX && footMask[ny * sW + nx]) {
                dilatedMask[y * sW + x] = 1
                break outer
              }
            }
          }
        }
      }

      // Pass 3b: keep only the largest connected blob — removes sock-logo artifacts
      {
        const label = new Int32Array(total).fill(-1)
        const blobSizes: number[] = []
        for (let y = iMinY; y <= drawMaxY; y++) {
          for (let x = iMinX; x <= iMaxX; x++) {
            const i = y * sW + x
            if (!dilatedMask[i] || label[i] >= 0) continue
            const id = blobSizes.length
            blobSizes.push(0)
            const stack = [i]
            while (stack.length) {
              const idx = stack.pop()!
              if (label[idx] >= 0) continue
              label[idx] = id
              blobSizes[id]++
              const iy = Math.floor(idx / sW), ix = idx % sW
              if (iy > iMinY && dilatedMask[idx - sW]) stack.push(idx - sW)
              if (iy < drawMaxY && dilatedMask[idx + sW]) stack.push(idx + sW)
              if (ix > iMinX && dilatedMask[idx - 1]) stack.push(idx - 1)
              if (ix < iMaxX && dilatedMask[idx + 1]) stack.push(idx + 1)
            }
          }
        }
        if (blobSizes.length > 1) {
          const best = blobSizes.indexOf(Math.max(...blobSizes))
          for (let i = 0; i < total; i++) {
            if (dilatedMask[i] && label[i] !== best) dilatedMask[i] = 0
          }
        }
      }

      const footCoverage = footCount / total
      const detected =
        footCoverage  >= MIN_FOOT_COVERAGE  &&
        footCoverage  <= MAX_FOOT_COVERAGE  &&
        paperCoverage >= MIN_PAPER_COVERAGE

      if (detected !== stateRef.current.footDetected) {
        stateRef.current.footDetected = detected
        setFootDetected(detected)
      }

      // Draw overlay
      if (overlay.width !== dW || overlay.height !== dH) { overlay.width = dW; overlay.height = dH }
      const oCtx = overlay.getContext('2d')!
      oCtx.clearRect(0, 0, dW, dH)

      if (!detected) return

      // Brand colors: left = maroon, right = teal
      const isLeft = stateRef.current.side === 'left'
      const [r, g, b] = isLeft ? [133, 3, 33] : [13, 148, 136]

      // Build mask image at sample resolution
      maskCanvas.width = sW; maskCanvas.height = sH
      const mCtx = maskCanvas.getContext('2d')!
      const mImg = mCtx.createImageData(sW, sH)
      const d = mImg.data

      for (let y = iMinY; y <= drawMaxY; y++) {
        for (let x = iMinX; x <= iMaxX; x++) {
          const idx = y * sW + x
          if (!dilatedMask[idx]) continue

          // Outline pixel: any 4-neighbor outside mask (or at boundary)
          const isOutline =
            y === iMinY || y === drawMaxY || x === iMinX || x === iMaxX ||
            !dilatedMask[(y - 1) * sW + x] ||
            !dilatedMask[(y + 1) * sW + x] ||
            !dilatedMask[y * sW + (x - 1)] ||
            !dilatedMask[y * sW + (x + 1)]

          const p = idx * 4
          d[p]   = r
          d[p+1] = g
          d[p+2] = b
          d[p+3] = isOutline ? 230 : 25  // bright outline, subtle interior fill
        }
      }

      mCtx.putImageData(mImg, 0, 0)

      // Upscale to display with smoothing, then apply blur for anti-aliased outline
      oCtx.imageSmoothingEnabled = true
      oCtx.imageSmoothingQuality = 'high'
      oCtx.filter = 'blur(2px)'
      oCtx.drawImage(maskCanvas, 0, 0, dW, dH)
      oCtx.filter = 'none'

      // Draw paper rectangle outline (shows the "ruler" was found)
      const paperColor = 'rgba(34, 197, 94, 0.8)'  // green
      oCtx.strokeStyle = paperColor
      oCtx.lineWidth = 2
      oCtx.setLineDash([8, 4])
      const px = pMinX / sW * dW
      const py = pMinY / sH * dH
      const pw = (pMaxX - pMinX) / sW * dW
      const ph = (pMaxY - pMinY) / sH * dH
      oCtx.strokeRect(px, py, pw, ph)
      oCtx.setLineDash([])
    }

    let rafId: number
    function tick(ts: number) {
      if (stateRef.current.active && ts - stateRef.current.lastRun >= DETECT_INTERVAL) {
        stateRef.current.lastRun = ts
        detect()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [videoRef, overlayCanvasRef])

  useEffect(() => {
    if (!active) {
      setFootDetected(false)
      stateRef.current.footDetected = false
      const overlay = overlayCanvasRef.current
      if (overlay) overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
    }
  }, [active, overlayCanvasRef])

  return { footDetected }
}
