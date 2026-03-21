'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { CVWorkerBridge } from '@/lib/cv/worker-bridge'
import { normalizeOrientation } from '@/lib/cv/exif'
import { resizeImageData } from '@/lib/cv/camera-constraints'
import type { ScanResult } from '@/lib/cv/types'

type AppState = 'loading' | 'ready' | 'capturing' | 'processing' | 'result' | 'error'

export default function Home() {
  const { videoRef, startCamera, capturePhoto, stopCamera } = useCamera()
  const bridgeRef = useRef<CVWorkerBridge | null>(null)
  const [workerReady, setWorkerReady] = useState(false)
  const [appState, setAppState] = useState<AppState>('loading')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize worker on mount
  useEffect(() => {
    const bridge = new CVWorkerBridge()
    bridgeRef.current = bridge

    // Poll for worker ready — READY message fires asynchronously
    const interval = setInterval(() => {
      if (bridge.isReady) {
        setWorkerReady(true)
        clearInterval(interval)
      }
    }, 100)

    return () => {
      clearInterval(interval)
      bridge.terminate()
    }
  }, [])

  // Start camera when worker is ready
  useEffect(() => {
    if (!workerReady) return
    startCamera()
      .then(() => setAppState('ready'))
      .catch(err => {
        setErrorMsg(`Camera error: ${err.message}`)
        setAppState('error')
      })
  }, [workerReady, startCamera])

  const handleCapture = useCallback(async () => {
    if (!bridgeRef.current || appState !== 'ready') return

    setAppState('processing')
    setResult(null)
    setErrorMsg(null)

    try {
      // Step 1: Capture photo from video frame
      const photoCanvas = capturePhoto()

      // Step 2: Convert canvas to Blob for EXIF reading
      const blob = await new Promise<Blob>((res, rej) =>
        photoCanvas.toBlob(b => b ? res(b) : rej(new Error('Canvas toBlob failed')), 'image/jpeg', 0.95)
      )

      // Step 3: Normalize EXIF orientation (Android rotation fix)
      const normalizedImageData = await normalizeOrientation(blob)

      // Step 4: Resize to max 1200px (prevents 10-30s processing on 48MP shots)
      // normalizedImageData is already an ImageData — draw to canvas first for resizeImageData
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = normalizedImageData.width
      tempCanvas.height = normalizedImageData.height
      tempCanvas.getContext('2d')!.putImageData(normalizedImageData, 0, 0)
      const resizedImageData = resizeImageData(tempCanvas, 1200)

      // Step 5: Send to worker (buffer is transferred — zero-copy)
      const scanResult = await bridgeRef.current.process(resizedImageData, 'left')

      setResult(scanResult)
      setAppState('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setAppState('error')
    }
  }, [appState, capturePhoto])

  const handleRetake = useCallback(() => {
    setResult(null)
    setErrorMsg(null)
    setAppState('ready')
    // Camera stream is already running — no need to restart
  }, [])

  return (
    <main style={{ fontFamily: 'monospace', padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '8px' }}>
        CV Pipeline Test Harness — Phase 1
      </h1>

      <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
        Worker: {workerReady ? '✓ ready' : '⏳ loading OpenCV WASM...'}
        {' | '}
        State: {appState}
      </p>

      {/* Camera preview */}
      <video
        ref={videoRef}
        playsInline   // Required for iOS Safari autoplay
        muted
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'block',
          background: '#000',
          marginBottom: '12px',
        }}
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleCapture}
          disabled={appState !== 'ready'}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {appState === 'processing' ? 'Processing...' : 'Capture + Process'}
        </button>

        {(appState === 'result' || appState === 'error') && (
          <button onClick={handleRetake} style={{ padding: '8px 16px', fontSize: '14px' }}>
            Retake
          </button>
        )}
      </div>

      {/* Error display */}
      {errorMsg && (
        <div style={{ padding: '12px', background: '#fff0f0', border: '1px solid #f00', marginBottom: '12px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Results display */}
      {result && (
        <div style={{ padding: '12px', background: '#f0fff0', border: '1px solid #0a0', marginBottom: '12px' }}>
          {result.success ? (
            <>
              <strong>Measurements (mm):</strong>
              <pre style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
{`Length:   ${result.data.length_mm.toFixed(1)}mm
Width:    ${result.data.width_mm.toFixed(1)}mm
Arch:     ${result.data.arch_mm.toFixed(1)}mm
Toe box:  ${result.data.toe_box_mm.toFixed(1)}mm
Heel:     ${result.data.heel_mm.toFixed(1)}mm
Accuracy: ±${result.data.accuracy_mm.toFixed(1)}mm (${result.data.confidence})`}
              </pre>
            </>
          ) : (
            <>
              <strong>Scan Error [{result.error.code}]:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{result.error.message}</p>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <details style={{ fontSize: '12px', color: '#666' }}>
        <summary>Test checklist (SCAN-01, SCAN-11, SCAN-13)</summary>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>SCAN-01: Camera preview renders on iOS Safari and Android Chrome</li>
          <li>SCAN-11: Retake 5× — verify no WASM heap growth (DevTools Memory tab)</li>
          <li>SCAN-13: Video continues to render during processing (no main-thread freeze)</li>
          <li>A4 detection: Place foot on A4 paper on dark surface, capture</li>
          <li>EXIF: Test on Android holding phone portrait — measurements should not be swapped</li>
          <li>White floor: Test on white surface — should get clear A4_NOT_DETECTED error</li>
        </ul>
      </details>
    </main>
  )
}
