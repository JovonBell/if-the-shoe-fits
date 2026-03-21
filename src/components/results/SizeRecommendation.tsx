'use client'

import type { MeasurementResult } from '@/lib/cv/types'
import { getRecommendedSize } from '@/lib/sizing/size-lookup'

interface Props {
  left: MeasurementResult | null
  right: MeasurementResult | null
}

export function SizeRecommendation({ left, right }: Props) {
  const size = getRecommendedSize(left, right)
  const bothFeet = left !== null && right !== null
  const feetDiffer = bothFeet && left.length_mm !== right.length_mm

  const chips = [
    { label: 'US', value: size.us_womens || size.us_mens },
    { label: 'EU', value: size.eu },
    { label: 'UK', value: size.uk },
  ].filter(c => c.value && c.value !== '?')

  return (
    <div className="bg-cream-dark rounded-lg p-6">
      <h3 className="font-heading text-lg font-semibold text-dark">
        Your recommended size
      </h3>

      <div className="flex gap-3 mt-4">
        {chips.map(({ label, value }) => (
          <div
            key={label}
            className="bg-maroon text-cream rounded-lg px-4 py-2 text-center min-w-[64px]"
          >
            <p className="font-body text-xs font-medium opacity-80">{label}</p>
            <p className="font-heading text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {feetDiffer && (
        <p className="font-body text-sm text-dark/70 mt-3">
          Sized to your larger foot for the best fit
        </p>
      )}

      <p className="font-body text-xs text-dark/50 mt-4">
        Based on standard Brannock measurements. Your custom shoes will be fitted precisely to your scan.
      </p>
    </div>
  )
}
