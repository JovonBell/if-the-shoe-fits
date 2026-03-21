// src/workers/opencv.worker.ts
// CRITICAL: All OpenCV operations here. Never import cv in main thread files.
// Single-threaded WASM only (threaded WASM breaks in Workers — OpenCV.js issue #25790)

import type { MeasurementResult, ScanResult, ScanErrorCode } from '../lib/cv/types'
import { detectA4Corners, applyPerspectiveCorrection, computeCalibrationAccuracy, accuracyToConfidence } from '../lib/cv/a4-detection'
import { extractFootContour } from '../lib/cv/foot-contour'
import { extractMeasurements } from '../lib/cv/measurements'

declare const cv: any

// Load OpenCV.js WASM — importScripts is the correct pattern for Web Workers
// Do NOT use dynamic import() — it doesn't work with the opencv.js module format
// @ts-ignore
self.importScripts('/cv/opencv.js')

let cvReady = false

// CRITICAL: cv.onRuntimeInitialized must be set BEFORE any cv.Mat() calls
// The WASM module is NOT ready immediately after importScripts — it compiles asynchronously
cv.onRuntimeInitialized = () => {
  cvReady = true
  self.postMessage({ type: 'READY' })
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
    if (!corners) {
      return makeScanError(
        'A4_NOT_DETECTED',
        'Make sure all 4 corners of the A4 paper are visible and the paper is on a dark surface.',
        'detectA4Corners returned null'
      )
    }

    // Step 2: Perspective correction (warpPerspective homography)
    const { rectified: r, pixelsPerMm } = applyPerspectiveCorrection(cv, mat, corners)
    rectified = r

    // Step 3: Calibration accuracy
    const accuracyMm = computeCalibrationAccuracy(corners, pixelsPerMm)
    const confidence = accuracyToConfidence(accuracyMm)

    // Step 4: Foot contour extraction (on rectified image)
    const contourPoints = extractFootContour(cv, rectified)
    if (!contourPoints) {
      return makeScanError(
        'FOOT_NOT_DETECTED',
        'Could not detect your foot. Ensure your bare foot or sock is clearly visible against the paper.',
        'extractFootContour returned null'
      )
    }

    // Step 5: Measurement extraction (pure JS — no cv calls)
    const measurements = extractMeasurements(contourPoints, pixelsPerMm)

    const result: MeasurementResult = {
      ...measurements,
      accuracy_mm: accuracyMm,
      confidence,
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
