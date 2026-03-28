// src/workers/opencv.worker.ts
// CRITICAL: All OpenCV operations here. Never import cv in main thread files.
// Single-threaded WASM only (threaded WASM breaks in Workers — OpenCV.js issue #25790)

import type { MeasurementResult, ScanResult, ScanErrorCode } from '../lib/cv/types'
import { detectA4Corners, applyPerspectiveCorrection, computeCalibrationAccuracy, accuracyToConfidence } from '../lib/cv/a4-detection'
import { extractFootContour, lastGrabCutUsed } from '../lib/cv/foot-contour'
import { extractMeasurements, validateMeasurements } from '../lib/cv/measurements'

declare const cv: any

// Load OpenCV.js WASM — importScripts is the correct pattern for Web Workers
// Do NOT use dynamic import() — it doesn't work with the opencv.js module format
// @ts-ignore
self.importScripts('/cv/opencv.js')

let cvReady = false

function markReady() {
  cvReady = true
  self.postMessage({ type: 'READY' })
}

// importScripts is synchronous. On Chromium the WASM often finishes initializing
// during importScripts, so onRuntimeInitialized has already fired by the time we
// get here — setting it afterward is a no-op and READY is never sent.
// Fix: check cv.Mat first; if it exists WASM is ready, otherwise wait for the callback.
if ((cv as any).Mat) {
  markReady()
} else {
  cv.onRuntimeInitialized = markReady
}

function makeScanError(code: ScanErrorCode, message: string, technical?: string): ScanResult {
  return { success: false, error: { code, message, technical } }
}

function runMeasurementPipeline(imageData: ImageData, footSide: 'left' | 'right'): ScanResult {
  // Declare ALL Mats at top level so finally can always attempt to delete them
  let mat: any, rectified: any

  try {
    mat = cv.matFromImageData(imageData)

    // Step 1: A4 paper detection
    const corners = detectA4Corners(cv, mat)
    if (corners) {
      console.log('[CV Worker] Corners found:', JSON.stringify(corners))
    } else {
      console.log('[CV Worker] No corners — paper not found')
      return makeScanError('A4_NOT_DETECTED', 'Paper not found. Place your US Letter paper on a dark surface with all 4 corners visible.')
    }

    // Step 2: Perspective correction (warpPerspective homography)
    console.log('[CV Worker] Step 2: perspective correction...')
    const { rectified: r, pixelsPerMm, srcScaleX, srcScaleY } = applyPerspectiveCorrection(cv, mat, corners)
    rectified = r
    console.log('[CV Worker] Step 2 done, pixelsPerMm:', pixelsPerMm)

    // Step 3: Calibration accuracy
    console.log('[CV Worker] Step 3: calibration accuracy...')
    const accuracyMm = computeCalibrationAccuracy(corners, pixelsPerMm)
    const confidence = accuracyToConfidence(accuracyMm)
    console.log('[CV Worker] Step 3 done, accuracy:', accuracyMm, 'confidence:', confidence)

    // Step 4: Foot contour extraction (on rectified image)
    console.log('[CV Worker] Step 4: foot contour...')
    const contourPoints = extractFootContour(cv, rectified)
    if (contourPoints && contourPoints.length > 0) {
      const xs = contourPoints.map(p => p.x), ys = contourPoints.map(p => p.y)
      const bboxW = Math.max(...xs) - Math.min(...xs)
      const bboxH = Math.max(...ys) - Math.min(...ys)
      console.log(`[CV Worker] Step 4 done: ${contourPoints.length} pts, bbox ${bboxW}×${bboxH}px = ${(bboxW/pixelsPerMm).toFixed(1)}×${(bboxH/pixelsPerMm).toFixed(1)}mm`)
    } else {
      console.log('[CV Worker] Step 4 done: no valid foot contour found')
    }
    if (!contourPoints) {
      console.log('[CV Worker] Foot not found after all 4 strategies')
      return makeScanError('FOOT_NOT_DETECTED', 'Foot not found. Make sure your foot is fully on the paper with the heel touching the bottom edge.')
    }

    // Step 5: Measurement extraction (pure JS — no cv calls)
    // Pass independent X/Y scales (both SCALE=2 currently, structure ready for anisotropic correction)
    const measurements = extractMeasurements(contourPoints, pixelsPerMm, {
      scaleX: pixelsPerMm,
      scaleY: pixelsPerMm,
    })

    // Step 6: Sock correction (clinical standard)
    measurements.length_mm += 2
    measurements.width_mm += 3
    measurements.heel_mm += 1
    measurements.toe_box_mm += 2

    // Step 7: Anatomical validation — reject physically impossible measurements
    const validation = validateMeasurements(measurements)
    if (!validation.valid) {
      console.warn('[CV Worker] Validation failed:', validation.reason)
      return makeScanError('INVALID_MEASUREMENTS', `Measurement error (${validation.reason}). Please retake — ensure your full foot is on the paper.`)
    }

    // Step 8: Confidence score (Upgrade 10)
    let confidenceScore = 100
    let topPenalty: string | undefined
    let topPenaltyAmount = 0

    function applyPenalty(amount: number, reason: string) {
      confidenceScore -= amount
      if (amount > topPenaltyAmount) {
        topPenaltyAmount = amount
        topPenalty = reason
      }
    }

    // -15 if any paper corner angle deviates > 10° from 90°
    if (corners.length === 4) {
      const pts = corners
      let worstAngleDev = 0
      for (let i = 0; i < 4; i++) {
        const prev = pts[(i + 3) % 4]
        const curr = pts[i]
        const next = pts[(i + 1) % 4]
        const v1x = prev.x - curr.x, v1y = prev.y - curr.y
        const v2x = next.x - curr.x, v2y = next.y - curr.y
        const dot = v1x * v2x + v1y * v2y
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
        if (mag1 > 0 && mag2 > 0) {
          const cosA = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
          const angleDeg = Math.acos(cosA) * 180 / Math.PI
          const dev = Math.abs(angleDeg - 90)
          if (dev > worstAngleDev) worstAngleDev = dev
        }
      }
      if (worstAngleDev > 10) applyPenalty(15, 'paper corners not square')
    }

    // -10 if X/Y scale mismatch > 5%
    if (srcScaleY > 0 && Math.abs(srcScaleX - srcScaleY) / srcScaleY > 0.05) {
      applyPenalty(10, 'paper distortion detected')
    }

    // -10 if GrabCut was used (rough contour)
    if (lastGrabCutUsed) {
      applyPenalty(10, 'rough foot contour (GrabCut used)')
    }

    // -5 if foot coverage < 5% of paper area
    const paperArea = rectified ? rectified.rows * rectified.cols : 1
    const contourArea = contourPoints.length / Math.max(1, paperArea) // rough coverage
    if (contourArea < 0.05) {
      applyPenalty(5, 'foot coverage too small')
    }

    confidenceScore = Math.max(0, Math.min(100, confidenceScore))
    // confidence_score is informational only — we never reject a scan that passed
    // anatomical validation; handheld phones always score lower due to perspective

    const result: MeasurementResult = {
      ...measurements,
      accuracy_mm: accuracyMm,
      confidence,
      confidence_score: confidenceScore,
      confidence_top_penalty: topPenalty,
      calibration_px_per_mm: pixelsPerMm,
      paper_corners: corners,
      foot_side: footSide,
      captured_at: new Date().toISOString(),
    }

    return { success: true, data: result }
  } catch (err) {
    return makeScanError(
      'CV_ERROR',
      'Processing failed. Please retake the photo.',
      err instanceof Error ? err.message : String(err)
    )
  } finally {
    // WASM heap is NOT garbage collected — every Mat MUST be explicitly deleted
    // safeDelete guards against double-delete and partially-initialized Mats
    const safeDelete = (m: any) => {
      try { if (m && !m.isDeleted?.()) m.delete() } catch {}
    }
    safeDelete(mat)
    safeDelete(rectified)
    // Note: detectA4Corners, applyPerspectiveCorrection, extractFootContour
    // each manage their own internal Mats in their own try/finally blocks
  }
}

self.onmessage = (e: MessageEvent) => {
  const { id, type, imageData, footSide } = e.data

  if (type === 'PROCESS') {
    if (!cvReady) {
      // Worker not yet initialized — reject request
      // Caller (CVWorkerBridge) should wait for READY before calling process()
      self.postMessage({
        id,
        result: makeScanError('CV_ERROR', 'CV worker not ready yet. Please try again.', 'cvReady === false')
      })
      return
    }

    // imageData.data.buffer was transferred (zero-copy) — do not use it after this call
    const result = runMeasurementPipeline(imageData, footSide ?? 'left')
    self.postMessage({ id, result })
  }
}
