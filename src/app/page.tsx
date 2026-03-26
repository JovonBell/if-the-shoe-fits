'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { CVWorkerBridge } from '@/lib/cv/worker-bridge'
import { normalizeOrientation } from '@/lib/cv/exif'
import { resizeImageData } from '@/lib/cv/camera-constraints'
import { ScanSession } from '@/lib/cv/session'
import type { MeasurementResult, FootSide } from '@/lib/cv/types'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import { InstructionsStep } from '@/components/wizard/InstructionsStep'
import { CameraStep } from '@/components/wizard/CameraStep'
import { ProcessingStep } from '@/components/wizard/ProcessingStep'
import { ResultsStep } from '@/components/wizard/ResultsStep'

type WizardStep = 'instructions' | 'camera' | 'processing' | 'results'

export default function Home() {
  const [step, setStep] = useState<WizardStep>('instructions')
  const [session] = useState(() => new ScanSession())
  const [currentSide, setCurrentSide] = useState<FootSide>('left')
  const [latestResult, setLatestResult] = useState<MeasurementResult | null>(null)
  const [capturedImageData, setCapturedImageData] = useState<ImageData | null>(null)
  const [cameraError, setCameraError] = useState<{ code: string; message: string } | null>(null)
  const [workerReady, setWorkerReady] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)

  const bridgeRef = useRef<CVWorkerBridge | null>(null)
  const { videoRef, startCamera, capturePhoto, stopCamera } = useCamera()

  // Logging helper (console only in production)
  const addLog = useCallback((msg: string) => {
    console.log(`[App] ${msg}`)
  }, [])

  // Initialize CV worker on mount
  useEffect(() => {
    addLog('Mounting — creating CV worker...')
    try {
      const bridge = new CVWorkerBridge()
      bridgeRef.current = bridge
      addLog('Worker created OK')

      const interval = setInterval(() => {
        if (bridge.isReady) {
          setWorkerReady(true)
          clearInterval(interval)
          addLog('Worker READY')
        }
      }, 100)

      return () => {
        clearInterval(interval)
        bridge.terminate()
      }
    } catch (err) {
      addLog(`Worker FAILED: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [addLog])

  const handleStart = useCallback(async () => {
    addLog('handleStart called — switching to camera step')
    setStep('camera')
    try {
      addLog('Calling startCamera...')
      await startCamera()
      addLog('Camera started OK')
    } catch (err) {
      addLog(`Camera error: ${err instanceof Error ? err.message : String(err)}`)
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isDenied) {
        setCameraError({
          code: 'CAMERA_DENIED',
          message:
            'Camera access is required. Please allow camera access in your browser settings and refresh.',
        })
      } else {
        setCameraError({
          code: 'CAMERA_ERROR',
          message: err instanceof Error ? err.message : 'Could not start camera.',
        })
      }
    }
  }, [startCamera])

  const handleCapture = useCallback(async () => {
    if (!bridgeRef.current || !workerReady) return

    setStep('processing')
    setCameraError(null)

    try {
      // Step 1: Capture photo from video frame
      const photoCanvas = capturePhoto()

      // Step 2: Convert canvas to Blob for EXIF reading
      const blob = await new Promise<Blob>((res, rej) =>
        photoCanvas.toBlob(
          b => (b ? res(b) : rej(new Error('Canvas toBlob failed'))),
          'image/jpeg',
          0.95,
        ),
      )

      // Step 3: Normalize EXIF orientation (Android rotation fix)
      const normalizedImageData = await normalizeOrientation(blob)

      // Step 4: Resize to max 1200px (prevents 10-30s processing on 48MP shots)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = normalizedImageData.width
      tempCanvas.height = normalizedImageData.height
      tempCanvas.getContext('2d')!.putImageData(normalizedImageData, 0, 0)
      const resizedImageData = resizeImageData(tempCanvas, 1200)

      // Step 5: Store a COPY before transferring — transferable makes original unusable
      const imageDataCopy = new ImageData(
        new Uint8ClampedArray(resizedImageData.data),
        resizedImageData.width,
        resizedImageData.height,
      )
      setCapturedImageData(imageDataCopy)

      // Step 6: Send to worker (buffer is transferred — zero-copy)
      const scanResult = await bridgeRef.current.process(resizedImageData, currentSide)

      if (scanResult.success) {
        session.setResult(currentSide, scanResult.data)
        setLatestResult(scanResult.data)
        stopCamera() // CRITICAL: stop camera LED before transitioning to results
        setStep('results')
      } else {
        const errorMessages: Record<string, string> = {
          A4_NOT_DETECTED:
            'Paper not found. Make sure your A4 paper is fully visible and on a dark surface.',
          FOOT_NOT_DETECTED:
            'Foot not found. Ensure your whole foot is on the paper with good lighting.',
          POOR_LIGHTING: 'Poor lighting detected. Move to a brighter area and try again.',
          CALIBRATION_FAILED:
            'Calibration failed. Make sure the entire A4 paper is in frame.',
        }
        const message =
          errorMessages[scanResult.error.code] ?? 'Something went wrong. Please retake the photo.'
        setCameraError({ code: scanResult.error.code, message })
        setStep('camera')
      }
    } catch {
      setCameraError({
        code: 'CV_ERROR',
        message: 'Something went wrong. Please retake the photo.',
      })
      setStep('camera')
    }
  }, [workerReady, capturePhoto, currentSide, session, stopCamera])

  const handleScanOtherFoot = useCallback(async () => {
    const otherSide: FootSide = currentSide === 'left' ? 'right' : 'left'
    setCurrentSide(otherSide)
    setLatestResult(null)
    setCapturedImageData(null)
    setStep('camera')
    try {
      await startCamera()
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isDenied) {
        setCameraError({
          code: 'CAMERA_DENIED',
          message:
            'Camera access is required. Please allow camera access in your browser settings and refresh.',
        })
      } else {
        setCameraError({
          code: 'CAMERA_ERROR',
          message: err instanceof Error ? err.message : 'Could not start camera.',
        })
      }
    }
  }, [currentSide, startCamera])

  return (
    <main className="min-h-dvh bg-cream flex flex-col font-body text-dark">
      <StepIndicator currentStep={step} />

      <div className="flex-1 flex flex-col">
        {step === 'instructions' && <InstructionsStep onStart={handleStart} />}
        {step === 'camera' && (
          <CameraStep
            videoRef={videoRef}
            side={currentSide}
            onCapture={handleCapture}
            error={cameraError}
          />
        )}
        {step === 'processing' && <ProcessingStep />}
        {step === 'results' && latestResult && (
          <ResultsStep
            session={session}
            latestResult={latestResult}
            capturedImageData={capturedImageData}
            onScanOtherFoot={handleScanOtherFoot}
            formSubmitted={formSubmitted}
            onFormSubmitSuccess={() => setFormSubmitted(true)}
          />
        )}
      </div>
    </main>
  )
}
