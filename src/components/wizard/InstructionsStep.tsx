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

// US Letter sheet with corner marks icon — maroon line art
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

// Two feet side by side (heels at bottom, toes up) on portrait paper
function TwoFeetIcon() {
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
      {/* Paper outline (portrait) */}
      <rect x="2" y="1" width="20" height="22" rx="1" />
      {/* Left foot — heel at bottom, toes up */}
      <path d="M6 19 C6 19 5 14 6 11 C7 9 8 9 8.5 10 C9 11 9 13 8.5 14 L10 14 C10.5 14 11 14.5 11 15 C11 15.5 10.5 16 10 16 L7 19 Z" />
      {/* Right foot — heel at bottom, toes up (mirrored) */}
      <path d="M18 19 C18 19 19 14 18 11 C17 9 16 9 15.5 10 C15 11 15 13 15.5 14 L14 14 C13.5 14 13 14.5 13 15 C13 15.5 13.5 16 14 16 L17 19 Z" />
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

// "No" / prohibited icon for the warning card
function NoIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
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
        description="Place your US Letter paper on a dark floor, carpet, or surface."
      />

      {/* Card 2 — US Letter paper placement */}
      <StepCard
        icon={<A4Icon />}
        title="Place your US Letter paper"
        description="Lay an 8.5×11 in sheet portrait (tall side up) on a dark surface. Keep all 4 corners visible."
      />

      {/* Card 3 — One foot at a time */}
      <StepCard
        icon={<TwoFeetIcon />}
        title="One foot at a time"
        description="Place your foot with the heel touching the bottom edge of the paper and toes pointing up. You'll scan your left foot first, then your right."
      />

      {/* Card 4 — Camera overhead */}
      <StepCard
        icon={<PhoneDownIcon />}
        title="Hold camera overhead"
        description="Point your camera straight down. Fill the frame with your foot and all 4 corners of the paper."
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
