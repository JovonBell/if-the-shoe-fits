'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useLiveDetection } from '@/hooks/useLiveDetection'
import { CVWorkerBridge } from '@/lib/cv/worker-bridge'
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
  const [capturing, setCapturing] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)

  const bridgeRef = useRef<CVWorkerBridge | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const { videoRef, startCamera, capturePhoto, stopCamera } = useCamera()
  const { footDetected } = useLiveDetection(videoRef, overlayCanvasRef, step === 'camera', currentSide)

  // Initialize CV worker on mount
  useEffect(() => {
    try {
      const bridge = new CVWorkerBridge()
      bridgeRef.current = bridge
      const interval = setInterval(() => {
        if (bridge.isReady) { setWorkerReady(true); clearInterval(interval) }
      }, 100)
      return () => { clearInterval(interval); bridge.terminate() }
    } catch (err) {
      console.error('[App] CV worker failed:', err)
    }
  }, [])

  // Start camera when entering camera step; keep it running during processing (avoids stop/restart race on iOS)
  useEffect(() => {
    if (step === 'camera') {
      // Do NOT clear cameraError here — if we're returning from a failed scan the error
      // message must stay visible so the user knows why capture failed.
      // cameraError is cleared at the start of handleCapture (on next tap).
      startCamera().catch((err: unknown) => {
        const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setCameraError({
          code: isDenied ? 'CAMERA_DENIED' : 'CAMERA_ERROR',
          message: isDenied
            ? 'Camera access is required. Please allow camera access in your browser settings.'
            : err instanceof Error ? err.message : 'Could not start camera.',
        })
      })
    } else if (step === 'results' || step === 'instructions') {
      stopCamera()
    }
  }, [step, startCamera, stopCamera])

  const handleStart = useCallback(() => {
    setCameraError(null)
    setCurrentSide('left')
    setStep('camera')
  }, [])

  const handleCapture = useCallback(async () => {
    if (!bridgeRef.current || !workerReady) {
      setCameraError({ code: 'NOT_READY', message: 'Scanner is still initializing — please wait a moment and try again.' })
      return
    }

    setCameraError(null)
    setCapturing(true)
    setStep('processing')

    try {
      // Capture directly from canvas — no toBlob, no EXIF normalization needed for video frames
      const photoCanvas = capturePhoto()
      const resizedImageData = resizeImageData(photoCanvas, 1200)

      // Copy for display (process() may transfer the buffer)
      const imageCopy = new ImageData(new Uint8ClampedArray(resizedImageData.data), resizedImageData.width, resizedImageData.height)
      setCapturedImageData(imageCopy)

      // Separate copy for processing
      const imageData = new ImageData(new Uint8ClampedArray(resizedImageData.data), resizedImageData.width, resizedImageData.height)

      const scanResult = await bridgeRef.current.process(imageData, currentSide)

      if (!scanResult.success) {
        const messages: Record<string, string> = {
          A4_NOT_DETECTED: 'Paper not found. Place your US Letter paper on a dark surface with all 4 corners clearly visible.',
          FOOT_NOT_DETECTED: 'Foot not found. Try scanning barefoot — white or light-colored socks can blend with the paper. Heel at the bottom edge, toes up.',
          INVALID_MEASUREMENTS: scanResult.error.message,
          CV_ERROR: 'Processing failed. Please try again.',
        }
        setCameraError({
          code: scanResult.error.code,
          message: messages[scanResult.error.code] ?? scanResult.error.message,
        })
        setCapturing(false)
        setStep('camera')
        return
      }

      session.setResult(currentSide, scanResult.data)
      setLatestResult(scanResult.data)
      setStep('results')
    } catch (err) {
      console.error('[App] Capture error:', err)
      setCameraError({ code: 'CV_ERROR', message: 'Something went wrong. Please try again.' })
      setStep('camera')
    }
    setCapturing(false)
  }, [workerReady, capturePhoto, currentSide, session])

  const handleRetake = useCallback(() => {
    setLatestResult(null)
    setCapturedImageData(null)
    setCameraError(null)
    setCapturing(false)
    setStep('camera')
  }, [])

  const handleScanOtherFoot = useCallback(() => {
    const otherSide: FootSide = currentSide === 'left' ? 'right' : 'left'
    setCurrentSide(otherSide)
    setLatestResult(null)
    setCapturedImageData(null)
    setCameraError(null)
    setCapturing(false)
    setStep('camera')
  }, [currentSide])

  return (
    <main className="min-h-dvh bg-cream flex flex-col font-body text-dark">
      <StepIndicator currentStep={step} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {step === 'instructions' && <InstructionsStep onStart={handleStart} />}
        {step === 'camera' && (
          <CameraStep
            videoRef={videoRef}
            overlayCanvasRef={overlayCanvasRef}
            footDetected={footDetected}
            workerReady={workerReady}
            capturing={capturing}
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
            onRetake={handleRetake}
            formSubmitted={formSubmitted}
            onFormSubmitSuccess={() => setFormSubmitted(true)}
          />
        )}
      </div>
    </main>
  )
}
