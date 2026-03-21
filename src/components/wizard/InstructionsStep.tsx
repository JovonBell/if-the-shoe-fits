'use client'

import { Button } from '@/components/ui/Button'
import { StepCard } from '@/components/ui/StepCard'

interface InstructionsStepProps {
  onStart: () => void
}

// Warning triangle icon — amber stroke for dark surface warning
function WarningIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-amber-600"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// A4 sheet with corner marks icon — maroon line art
function A4Icon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-maroon"
      aria-hidden="true"
    >
      {/* Paper outline */}
      <rect x="4" y="2" width="16" height="20" rx="1" />
      {/* Corner mark top-left */}
      <path d="M4 6h2M4 6v2" />
      {/* Corner mark top-right */}
      <path d="M20 6h-2M20 6v2" />
      {/* Corner mark bottom-left */}
      <path d="M4 18h2M4 18v-2" />
      {/* Corner mark bottom-right */}
      <path d="M20 18h-2M20 18v-2" />
    </svg>
  )
}

// Foot outline on paper icon — maroon line art
function FootIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-maroon"
      aria-hidden="true"
    >
      {/* Paper base */}
      <rect x="2" y="16" width="20" height="6" rx="1" />
      {/* Foot outline */}
      <path d="M8 16 C8 16 7 10 9 8 C10 6 12 6 13 7 C14 8 14 10 13 11 L16 11 C17 11 18 12 18 13 C18 14 17 15 16 15 L9 16 Z" />
    </svg>
  )
}

// Phone pointing down icon — maroon line art
function PhoneDownIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-maroon"
      aria-hidden="true"
    >
      {/* Phone body — landscape orientation pointing down */}
      <rect x="7" y="2" width="10" height="16" rx="2" />
      {/* Home button / bottom indicator */}
      <line x1="12" y1="15" x2="12" y2="15.01" />
      {/* Arrow pointing down */}
      <line x1="12" y1="20" x2="12" y2="22" />
      <polyline points="10 21 12 23 14 21" />
    </svg>
  )
}

export function InstructionsStep({ onStart }: InstructionsStepProps) {
  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Card 1 — Warning: dark surface required (MUST be first) */}
      <StepCard
        variant="warning"
        icon={<WarningIcon />}
        title="Dark surface required"
        description="Place your A4 paper on a dark floor, carpet, or surface."
      />

      {/* Card 2 — A4 paper placement */}
      <StepCard
        icon={<A4Icon />}
        title="Place your A4 paper"
        description="Lay a standard A4 sheet flat. The full page must be visible."
      />

      {/* Card 3 — Foot placement */}
      <StepCard
        icon={<FootIcon />}
        title="Place your foot on the paper"
        description="Stand with your heel at the bottom edge. Keep your weight even."
      />

      {/* Card 4 — Camera overhead */}
      <StepCard
        icon={<PhoneDownIcon />}
        title="Hold camera overhead"
        description="Point your camera straight down. Fill the frame with paper and foot."
      />

      {/* Primary CTA */}
      <div className="mt-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onStart}
        >
          Start Scanning
        </Button>
      </div>
    </div>
  )
}
