'use client'

import type { MeasurementResult } from '@/lib/cv/types'

interface Props {
  measurements: MeasurementResult
}

const MEASUREMENT_LABELS = [
  { key: 'length_mm' as const, label: 'Your length' },
  { key: 'width_mm' as const, label: 'Your width' },
  { key: 'arch_mm' as const, label: 'Your arch' },
  { key: 'toe_box_mm' as const, label: 'Your toe box' },
  { key: 'heel_mm' as const, label: 'Your heel' },
]

export function MeasurementCards({ measurements }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {MEASUREMENT_LABELS.map(({ key, label }) => (
        <div
          key={key}
          className="bg-cream-dark rounded-lg p-4 border-l-4 border-maroon"
        >
          <p className="font-body text-sm text-dark/70 font-medium">{label}</p>
          <p className="font-heading text-xl font-bold text-dark mt-1">
            {measurements[key].toFixed(1)}
            <span className="text-sm font-normal text-dark/60 ml-1">mm</span>
          </p>
        </div>
      ))}
    </div>
  )
}
