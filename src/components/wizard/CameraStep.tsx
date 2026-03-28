'use client'

import React from 'react'

interface CameraStepProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>
  footDetected: boolean
  workerReady: boolean
  capturing: boolean
  side: 'left' | 'right'
  onCapture: () => void
  error: { code: string; message: string } | null
}

export function CameraStep({
  videoRef,
  overlayCanvasRef,
  footDetected,
  workerReady,
  capturing,
  side,
  onCapture,
  error,
}: CameraStepProps) {
  const sideLabel = side === 'left' ? 'Left' : 'Right'
  const stepNum = side === 'left' ? '1 of 2' : '2 of 2'
  const buttonDisabled = !workerReady || capturing

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="text-center px-4">
        <p className="font-body text-xs text-dark/40 uppercase tracking-widest mb-1">{stepNum}</p>
        <h2 className="font-heading font-bold text-dark text-2xl">Scan Your {sideLabel} Foot</h2>
        <p className="font-body text-sm text-dark/60 mt-1">
          Heel at the bottom edge of the paper, toes pointing up
        </p>
      </div>

      {/* Portrait camera container */}
      <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Green foot highlight drawn by useLiveDetection */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        />

        {/* Detection badge */}
        <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
          {capturing ? (
            <span className="bg-blue-600/90 text-white text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm shadow">
              Hold still — capturing…
            </span>
          ) : footDetected ? (
            <span className="bg-green-600/90 text-white text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm shadow">
              {sideLabel} foot detected ✓ — ready to capture
            </span>
          ) : (
            <span className="bg-black/60 text-white/80 text-sm px-4 py-1.5 rounded-full backdrop-blur-sm">
              Align your {side} foot on the paper
            </span>
          )}
        </div>

        {/* Capture button — container must NOT have pointer-events-none on iOS Safari:
            WebKit does not recurse hit-testing into children with pointer-events:auto
            when an absolutely-positioned ancestor has pointer-events:none. */}
        <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onCapture}
            disabled={buttonDisabled}
            aria-label="Capture photo"
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: capturing ? '#1d4ed8' : footDetected ? '#850321' : '#6b7280' }}
          >
            <div className="w-[58px] h-[58px] rounded-full border-2 border-white/80" />
          </button>
          {!workerReady && (
            <span className="pointer-events-none text-xs text-white/60 bg-black/40 px-2 py-0.5 rounded-full">
              Initializing scanner…
            </span>
          )}
          {workerReady && !capturing && !footDetected && (
            <span className="pointer-events-none text-xs text-white/60 bg-black/40 px-2 py-0.5 rounded-full">
              Tap to capture
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 bg-red-50 border border-red-200 text-destructive rounded-lg p-4 font-body text-sm" role="alert">
          <p className="font-semibold mb-1">Scan failed — tap to try again</p>
          <p>{error.message}</p>
        </div>
      )}

      {!footDetected && !error && (
        <p className="text-center text-sm text-dark/50 font-body px-6">
          Hold your phone directly overhead with your {side} foot filling the paper
        </p>
      )}
    </div>
  )
}
