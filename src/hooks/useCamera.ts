'use client'

import { useRef, useCallback } from 'react'
import { CAMERA_CONSTRAINTS } from '@/lib/cv/camera-constraints'

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const startCamera = useCallback(async () => {
    // Stop any existing stream before requesting a new one
    streamRef.current?.getTracks().forEach(t => t.stop())

    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
    streamRef.current = stream

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      // play() can throw on iOS if not triggered by user gesture — let caller handle
      await videoRef.current.play()
    }
  }, [])

  const capturePhoto = useCallback((): HTMLCanvasElement => {
    const video = videoRef.current
    if (!video) throw new Error('Video element not available')

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    ctx.drawImage(video, 0, 0)
    return canvas
  }, [])

  const stopCamera = useCallback(() => {
    // MUST stop all tracks — keeps camera LED on and drains battery otherwise
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  return { videoRef, startCamera, capturePhoto, stopCamera }
}
