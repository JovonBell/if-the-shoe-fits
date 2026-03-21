'use client'

export function ProcessingStep() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col py-16">
      {/* Pulsing maroon circle spinner — respects prefers-reduced-motion */}
      <div
        className="w-12 h-12 rounded-full bg-maroon motion-safe:animate-pulse"
        role="status"
        aria-label="Processing"
      />

      {/* Status copy */}
      <p className="font-body text-dark text-base mt-4">
        Analyzing your foot...
      </p>
    </div>
  )
}
