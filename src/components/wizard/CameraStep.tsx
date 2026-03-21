'use client'

import React from 'react'

interface CameraStepProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  side: 'left' | 'right'
  onCapture: () => void
  error: { code: string; message: string } | null
}

export function CameraStep({ videoRef, side, onCapture, error }: CameraStepProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Side label */}
      <h2 className="font-heading font-semibold text-dark text-xl text-center capitalize">
        Scan your {side} foot
      </h2>

      {/* Video preview */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full aspect-video bg-black rounded-lg object-cover"
      />

      {/* Inline error banner — shown above capture button when error exists */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-destructive rounded-lg p-3 font-body text-sm"
          role="alert"
        >
          {error.message}
        </div>
      )}

      {/* Capture button — 72px diameter circle, maroon with inner white ring */}
      <div className="flex justify-center mt-2 mb-4">
        <button
          type="button"
          onClick={onCapture}
          aria-label="Capture photo"
          className="w-[72px] h-[72px] rounded-full bg-maroon flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 cursor-pointer transition-colors duration-200 hover:bg-maroon/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Inner white ring design */}
          <div className="w-[56px] h-[56px] rounded-full border-2 border-cream" />
        </button>
      </div>
    </div>
  )
}
