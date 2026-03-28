'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { MeasurementResult } from '@/lib/cv/types'
import type { ScanSession } from '@/lib/cv/session'
import { exportFootSTL } from '@/lib/stl/export'
import { ContourOverlay } from '@/components/results/ContourOverlay'
import { MeasurementCards } from '@/components/results/MeasurementCards'
import { SizeRecommendation } from '@/components/results/SizeRecommendation'
import { Button } from '@/components/ui/Button'
import { LeadForm } from '@/components/wizard/LeadForm'

// Dynamic import with SSR disabled -- Three.js accesses window/WebGL at import time
// (RESEARCH.md Pitfall 2)
const FootModel3D = dynamic(
  () => import('@/components/results/FootModel3D'),
  { ssr: false }
)

interface Props {
  session: ScanSession
  latestResult: MeasurementResult
  capturedImageData: ImageData | null
  onScanOtherFoot: () => void
  onRetake: () => void
  formSubmitted: boolean
  onFormSubmitSuccess: () => void
}

export function ResultsStep({
  session,
  latestResult,
  capturedImageData,
  onScanOtherFoot,
  onRetake,
  formSubmitted,
  onFormSubmitSuccess,
}: Props) {
  const left = session.getResult('left')
  const right = session.getResult('right')
  const bothFeetDone = session.isComplete()
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadSTL() {
    setDownloading(true)
    try {
      const stlBuffer = await exportFootSTL(latestResult)
      const blob = new Blob([stlBuffer], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `foot-scan-${Date.now()}.stl`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Retake prompt — only shown when estimated flag is set (should be rare now) */}
      {latestResult.estimated && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
          <p className="font-body font-semibold text-sm text-amber-900">
            Could not measure your foot accurately
          </p>
          <p className="font-body text-xs text-amber-800">
            {latestResult.confidence_top_penalty}. Please retake with your foot fully on the paper.
          </p>
          <Button variant="primary" onClick={onRetake}>
            Retake Scan
          </Button>
        </div>
      )}

      {/* Hero headline */}
      <div className="text-center px-4">
        <h1 className="font-heading text-[28px] font-bold text-dark leading-tight">
          {latestResult.estimated ? 'Estimated measurements' : 'Your feet are unique — now your shoes will be too'}
        </h1>
      </div>

      {/* 3D foot model hero */}
      <div className="w-full md:h-[380px]">
        <FootModel3D measurements={latestResult} />
      </div>

      {/* Contour overlay on captured photo */}
      {capturedImageData && latestResult.contour_points && (
        <div className="px-4">
          <ContourOverlay
            imageData={capturedImageData}
            measurements={latestResult}
          />
        </div>
      )}

      {/* Measurement cards */}
      <div className="px-4">
        <MeasurementCards measurements={latestResult} />
      </div>

      {/* Accuracy indicator */}
      <div className="px-4 text-center">
        <p className="font-body text-sm text-dark/60">
          Accuracy: ±{(latestResult.accuracy_mm / 25.4).toFixed(3)}in ({latestResult.confidence} confidence)
        </p>
        <p className="font-body text-sm text-dark/60">
          Scan confidence: {latestResult.confidence_score ?? 100}%
          {' '}({latestResult.confidence} accuracy)
        </p>
        <p className="font-body text-xs text-dark/40 mt-1">
          Includes standard sock correction (+2mm length, +3mm width).{' '}
          For maximum accuracy, remove socks and rescan.
        </p>
      </div>

      {/* Size recommendation — only when confidence is acceptable and measurements are real */}
      {!latestResult.estimated && (latestResult.confidence_score ?? 100) >= 60 && (
        <div className="px-4">
          <SizeRecommendation left={left} right={right} />
        </div>
      )}
      {!latestResult.estimated && (latestResult.confidence_score ?? 100) < 60 && (
        <div className="mx-4 bg-amber-50 border border-amber-200 rounded-xl p-4 font-body text-sm text-amber-900">
          <p className="font-semibold mb-1">Confidence too low for size recommendation</p>
          <p className="text-xs text-amber-800">Scan confidence is {latestResult.confidence_score}%. Retake for a size recommendation — try better lighting and ensure all 4 paper corners are visible.</p>
        </div>
      )}

      {/* CTAs */}
      <div className="px-4 flex flex-col gap-3">
        {!bothFeetDone && (
          <Button variant="primary" onClick={onScanOtherFoot}>
            Scan Your Other Foot
          </Button>
        )}
      </div>

      {/* Lead Form / Success */}
      <div className="px-4">
        {!formSubmitted ? (
          <LeadForm
            session={session}
            latestResult={latestResult}
            onSubmitSuccess={onFormSubmitSuccess}
          />
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center gap-4 text-center">
            <h2 className="font-heading text-xl font-bold text-dark">
              You&apos;re all set!
            </h2>
            <p className="font-body text-sm text-dark/70">
              We&apos;ll be in touch about your custom fit.
            </p>
            <Button
              variant="ghost"
              onClick={handleDownloadSTL}
              disabled={downloading}
            >
              {downloading ? 'Preparing...' : 'Download 3D Foot Model'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
