'use client'

import dynamic from 'next/dynamic'
import type { MeasurementResult } from '@/lib/cv/types'
import type { ScanSession } from '@/lib/cv/session'
import { ContourOverlay } from '@/components/results/ContourOverlay'
import { MeasurementCards } from '@/components/results/MeasurementCards'
import { SizeRecommendation } from '@/components/results/SizeRecommendation'
import { Button } from '@/components/ui/Button'

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
}

export function ResultsStep({ session, latestResult, capturedImageData, onScanOtherFoot }: Props) {
  const left = session.getResult('left')
  const right = session.getResult('right')
  const bothFeetDone = session.isComplete()

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Hero headline */}
      <div className="text-center px-4">
        <h1 className="font-heading text-[28px] font-bold text-dark leading-tight">
          Your feet are unique — now your shoes will be too
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
          Accuracy: ±{latestResult.accuracy_mm.toFixed(1)}mm ({latestResult.confidence} confidence)
        </p>
      </div>

      {/* Size recommendation */}
      <div className="px-4">
        <SizeRecommendation left={left} right={right} />
      </div>

      {/* CTAs */}
      <div className="px-4 flex flex-col gap-3">
        {!bothFeetDone && (
          <Button variant="primary" onClick={onScanOtherFoot}>
            Scan Your Other Foot
          </Button>
        )}
      </div>
    </div>
  )
}
