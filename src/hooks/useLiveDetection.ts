'use client'

/**
 * Live foot detection on camera feed.
 *
 * Algorithm:
 *  1. 99th-percentile brightness → lands on paper (paper is the brightest object in scene)
 *  2. Paper detection via connected-component of near-max pixels (≥ paperRef × 0.93).
 *     Connected component prevents scattered bright floor pixels from inflating the bbox.
 *  3. Validate paper bbox: correct size (10–88% of frame), aspect ratio (0.45–1.65),
 *     and fill density (≥ 30% of bbox pixels are "paper" — rejects sparse bright spots).
 *  4. Foot candidates: within INSET paper bbox, pixels < paperRef × 0.76
 *  5. Extend detection 25% below paper bottom for heel visibility
 *  6. Dilate candidates, then keep only largest connected blob (removes sock-logo artifacts)
 *  7. Draw OUTLINE (stroke) of foot blob in brand color — not a filled blob
 */

import { useEffect, useRef, useState } from 'react'

const SAMPLE_W           = 240   // higher resolution → smoother outline, better detection
const DETECT_INTERVAL    = 200   // ms

const PAPER_PERCENTILE   = 0.99  // 99th-pctile → lands on paper (paper is brightest in scene)
const PAPER_STRICT_RATIO = 0.93  // within 7% of max brightness = paper; light floor (~200) excluded
const FOOT_RATIO         = 0.76  // within paper: pixel < paperRef×0.76 → foot candidate
const MIN_PAPER_REF      = 185   // require actual white paper brightness (reject dim/no-paper scenes)
const MIN_FOOT_COVERAGE  = 0.01  // ≥1% of frame
const MAX_FOOT_COVERAGE  = 0.45  // ≤45% of frame
const MIN_PAPER_COVERAGE = 0.05  // ≥5% of frame is the paper component
const DILATION           = 4     // fill sock-texture gaps
const EDGE_INSET         = DILATION + 4  // 8px inset from paper bbox before foot detection

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

      // 99th-percentile brightness → should land on the white paper when paper is in frame
      sortBuf!.set(lumBuf)
      sortBuf!.sort()
      const paperRef = sortBuf![Math.floor(total * PAPER_PERCENTILE)]

      if (paperRef < MIN_PAPER_REF) {
        // No bright white surface visible — scene too dark or no paper
        if (stateRef.current.footDetected) { stateRef.current.footDetected = false; setFootDetected(false) }
        overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
        return
      }

      const strictThresh = paperRef * PAPER_STRICT_RATIO  // within 7% of max = paper
      const footThresh   = paperRef * FOOT_RATIO

      // Pass 1: find paper via largest connected component of near-max brightness pixels.
      // This prevents scattered bright floor pixels from inflating the paper bbox.
      let pMinX = sW, pMaxX = 0, pMinY = sH, pMaxY = 0
      let paperCoverage = 0

      {
        // Uint16Array: handles up to 65535 components (Uint8Array wraps at 256 → infinite loop)
        const labels = new Uint16Array(total)  // 0 = unlabeled
        const compSizes: number[] = []

        for (let i = 0; i < total; i++) {
          if (lumBuf![i] <= strictThresh || labels[i]) continue
          const id = compSizes.length + 1  // 1-indexed
          compSizes.push(0)
          // Mark seed pixel BEFORE pushing so each pixel enters queue exactly once
          labels[i] = id
          const queue = [i]
          let head = 0
          while (head < queue.length) {
            const idx = queue[head++]
            compSizes[id - 1]++
            const r = Math.floor(idx / sW), c = idx % sW
            // Check-and-mark neighbor before pushing — eliminates duplicates entirely
            if (r > 0      && !labels[idx - sW] && lumBuf![idx - sW] > strictThresh) { labels[idx - sW] = id; queue.push(idx - sW) }
            if (r < sH - 1 && !labels[idx + sW] && lumBuf![idx + sW] > strictThresh) { labels[idx + sW] = id; queue.push(idx + sW) }
            if (c > 0      && !labels[idx - 1]  && lumBuf![idx - 1]  > strictThresh) { labels[idx - 1]  = id; queue.push(idx - 1)  }
            if (c < sW - 1 && !labels[idx + 1]  && lumBuf![idx + 1]  > strictThresh) { labels[idx + 1]  = id; queue.push(idx + 1)  }
          }
        }

        if (compSizes.length === 0) {
          if (stateRef.current.footDetected) { stateRef.current.footDetected = false; setFootDetected(false) }
          overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height)
          return
        }

        // Use a loop instead of Math.max(...compSizes) — spread crashes with large arrays
        let bestId = 1, maxSize = 0
        for (let k = 0; k < compSizes.length; k++) {
          if (compSizes[k] > maxSize) { maxSize = compSizes[k]; bestId = k + 1 }
        }
        paperCoverage = maxSize / total

        for (let i = 0; i < total; i++) {
          if (labels[i] !== bestId) continue
          const r = Math.floor(i / sW), c = i % sW
          if (c < pMinX) pMinX = c; if (c > pMaxX) pMaxX = c
          if (r < pMinY) pMinY = r; if (r > pMaxY) pMaxY = r
        }
      }

      // Validate paper bbox: correct size, aspect ratio, and fill density
      const bboxW = pMaxX - pMinX
      const bboxH = pMaxY - pMinY
      const bboxAspect = bboxW / Math.max(1, bboxH)
      // fillRatio: paper component pixels / bbox area — rejects scattered bright spots
      const fillRatio = (paperCoverage * total) / Math.max(1, bboxW * bboxH)

      if (
        paperCoverage < MIN_PAPER_COVERAGE ||
        bboxW < sW * 0.10 || bboxH < sH * 0.10 ||     // paper must cover ≥10% of frame
        bboxW > sW * 0.88 || bboxH > sH * 0.93 ||     // but not the whole frame (= floor)
        bboxAspect < 0.45 || bboxAspect > 1.65 ||     // US Letter portrait/landscape ± generous
        fillRatio < 0.30                               // must be a solid rectangle, not scattered
      ) {
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
        const label = new Uint16Array(total)  // 0 = unlabeled
        const blobSizes: number[] = []
        for (let y = iMinY; y <= drawMaxY; y++) {
          for (let x = iMinX; x <= iMaxX; x++) {
            const i = y * sW + x
            if (!dilatedMask[i] || label[i]) continue
            const id = blobSizes.length + 1  // 1-indexed
            blobSizes.push(0)
            label[i] = id  // mark before pushing
            const queue = [i]
            let head = 0
            while (head < queue.length) {
              const idx = queue[head++]
              blobSizes[id - 1]++
              const iy = Math.floor(idx / sW), ix = idx % sW
              if (iy > iMinY  && dilatedMask[idx - sW] && !label[idx - sW]) { label[idx - sW] = id; queue.push(idx - sW) }
              if (iy < drawMaxY && dilatedMask[idx + sW] && !label[idx + sW]) { label[idx + sW] = id; queue.push(idx + sW) }
              if (ix > iMinX  && dilatedMask[idx - 1]  && !label[idx - 1])  { label[idx - 1]  = id; queue.push(idx - 1)  }
              if (ix < iMaxX  && dilatedMask[idx + 1]  && !label[idx + 1])  { label[idx + 1]  = id; queue.push(idx + 1)  }
            }
          }
        }
        if (blobSizes.length > 1) {
          // Loop instead of Math.max(...spread) to avoid stack overflow with large arrays
          let best = 1, bestSize = 0
          for (let k = 0; k < blobSizes.length; k++) {
            if (blobSizes[k] > bestSize) { bestSize = blobSizes[k]; best = k + 1 }
          }
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
