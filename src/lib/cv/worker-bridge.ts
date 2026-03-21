import type { ScanResult, FootSide } from './types'

type PendingRequest = {
  resolve: (result: ScanResult) => void
  reject: (err: Error) => void
}

export class CVWorkerBridge {
  private worker: Worker
  private pending = new Map<string, PendingRequest>()
  private ready = false

  constructor() {
    // Note: Turbopack may require `next dev --webpack` if Worker URL resolution fails
    // See 01-RESEARCH.md Open Question 3
    this.worker = new Worker(
      new URL('/workers/opencv.worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (e: MessageEvent) => {
      const { id, type, result } = e.data

      if (type === 'READY') {
        this.ready = true
        return
      }

      const handler = this.pending.get(id)
      if (!handler) return
      this.pending.delete(id)
      handler.resolve(result as ScanResult)
    }

    this.worker.onerror = (err) => {
      // Reject all pending requests on worker error
      const message = err.message ?? 'Worker crashed'
      this.pending.forEach(h => h.reject(new Error(message)))
      this.pending.clear()
    }
  }

  get isReady(): boolean {
    return this.ready
  }

  async process(imageData: ImageData, footSide: FootSide): Promise<ScanResult> {
    if (!this.ready) {
      throw new Error('CV worker not initialized — wait for isReady before calling process()')
    }

    return new Promise<ScanResult>((resolve, reject) => {
      const id = crypto.randomUUID()
      this.pending.set(id, { resolve, reject })

      // TRANSFERABLE: imageData.data.buffer is transferred to worker (zero-copy)
      // imageData is UNUSABLE on main thread after this line
      this.worker.postMessage(
        { id, type: 'PROCESS', imageData, footSide },
        [imageData.data.buffer]
      )
    })
  }

  terminate(): void {
    this.worker.terminate()
    this.pending.forEach(h => h.reject(new Error('Worker terminated')))
    this.pending.clear()
    this.ready = false
  }
}
