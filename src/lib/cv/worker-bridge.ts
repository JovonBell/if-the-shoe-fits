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
    // Use a relative path so Turbopack can resolve the worker module during both
    // dev and production builds. Absolute paths (/workers/...) are not supported
    // by Turbopack's production bundler for new URL() worker construction.
    this.worker = new Worker(
      new URL('../../workers/opencv.worker.ts', import.meta.url),
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

      // 30-second timeout — guards against hung WASM on iOS Safari
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('CV processing timed out — please try again'))
        }
      }, 30_000)

      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r) },
        reject:  (e) => { clearTimeout(timer); reject(e) },
      })

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
