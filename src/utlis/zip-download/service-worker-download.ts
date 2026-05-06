import { createZipStreamingUnavailableError, type ZipStreamingUnavailableReason } from './errors'

const DOWNLOAD_WORKER_FILE_NAME = 'streaming-download-worker.js'
const DOWNLOAD_ROUTE = '__frame-cutter-download'
const DOWNLOAD_START_TIMEOUT_MS = 10000

const createDownloadId = () => {
  if (window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

const getAppBaseUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin)

const createTimedPromise = (
  reason: ZipStreamingUnavailableReason,
  message: string
): {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
} => {
  let resolvePromise: (() => void) | null = null
  let rejectPromise: ((error: Error) => void) | null = null

  const promise = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(createZipStreamingUnavailableError(reason, message))
    }, DOWNLOAD_START_TIMEOUT_MS)

    resolvePromise = () => {
      window.clearTimeout(timeout)
      resolve()
    }
    rejectPromise = (error) => {
      window.clearTimeout(timeout)
      reject(error)
    }
  })

  return {
    promise,
    resolve: () => resolvePromise?.(),
    reject: (error) => rejectPromise?.(error),
  }
}

const getDownloadWorker = async (): Promise<ServiceWorker> => {
  if (!window.isSecureContext) {
    throw createZipStreamingUnavailableError('insecure-context')
  }

  if (!('serviceWorker' in navigator)) {
    throw createZipStreamingUnavailableError('service-worker-unavailable')
  }

  const baseUrl = getAppBaseUrl()
  const workerUrl = new URL(DOWNLOAD_WORKER_FILE_NAME, baseUrl)
  const registration = await navigator.serviceWorker.register(workerUrl, {
    scope: baseUrl.pathname,
  })
  const readyRegistration = await navigator.serviceWorker.ready
  const worker = readyRegistration.active ?? registration.active

  if (!worker) {
    throw createZipStreamingUnavailableError(
      'worker-not-active',
      'Streaming download service worker is not active'
    )
  }

  return worker
}

const triggerServiceWorkerDownload = (downloadId: string, fileName: string) => {
  const downloadUrl = new URL(DOWNLOAD_ROUTE, getAppBaseUrl())
  downloadUrl.searchParams.set('id', downloadId)

  const iframe = document.createElement('iframe')
  iframe.hidden = true
  iframe.src = downloadUrl.toString()
  iframe.title = fileName
  document.body.appendChild(iframe)

  return iframe
}

const createTransferableChunk = (chunk: Uint8Array) => {
  if (
    chunk.buffer instanceof ArrayBuffer &&
    chunk.byteOffset === 0 &&
    chunk.byteLength === chunk.buffer.byteLength
  ) {
    return chunk
  }

  return chunk.slice()
}

export const acquireServiceWorkerDownloadStream = async (
  fileName: string
): Promise<WritableStream<Uint8Array>> => {
  if (typeof WritableStream === 'undefined' || typeof MessageChannel === 'undefined') {
    throw createZipStreamingUnavailableError('streams-unavailable')
  }

  const worker = await getDownloadWorker()
  const downloadId = createDownloadId()
  const channel = new MessageChannel()
  const port = channel.port1
  const pendingWrites = new Map<
    number,
    {
      resolve: () => void
      reject: (error: Error) => void
    }
  >()
  const ready = createTimedPromise(
    'worker-ready-timeout',
    'Streaming download worker did not respond'
  )
  let downloadStarted: ReturnType<typeof createTimedPromise> | null = null
  let iframe: HTMLIFrameElement | null = null
  let nextSequence = 0
  let streamError: Error | null = null
  let resolveClose: (() => void) | null = null
  let rejectClose: ((error: Error) => void) | null = null

  const cleanup = () => {
    port.close()
    iframe?.remove()
  }

  const rejectPendingOperations = (error: Error) => {
    streamError = error

    for (const pendingWrite of pendingWrites.values()) {
      pendingWrite.reject(error)
    }

    pendingWrites.clear()
    ready.reject(error)
    downloadStarted?.reject(error)
    rejectClose?.(error)
  }

  port.onmessage = (event) => {
    const message = event.data

    if (!message || message.id !== downloadId) {
      return
    }

    if (message.type === 'download-ready') {
      ready.resolve()

      return
    }

    if (message.type === 'download-started') {
      downloadStarted?.resolve()

      return
    }

    if (message.type === 'chunk-written') {
      const pendingWrite = pendingWrites.get(message.sequence)
      pendingWrites.delete(message.sequence)
      pendingWrite?.resolve()

      return
    }

    if (message.type === 'download-closed') {
      resolveClose?.()

      return
    }

    if (message.type === 'download-error') {
      rejectPendingOperations(new Error(message.message ?? 'Streaming download failed'))
    }
  }

  port.start()
  worker.postMessage(
    {
      type: 'download-start',
      id: downloadId,
      fileName,
    },
    [channel.port2]
  )

  try {
    await ready.promise
    downloadStarted = createTimedPromise(
      'download-start-timeout',
      'Streaming download did not start'
    )
    iframe = triggerServiceWorkerDownload(downloadId, fileName)
    await downloadStarted.promise
  } catch (error) {
    cleanup()

    throw error
  }

  return new WritableStream<Uint8Array>({
    write: (chunk) => {
      if (streamError) {
        throw streamError
      }

      nextSequence++
      const sequence = nextSequence
      const transferableChunk = createTransferableChunk(chunk)
      const writePromise = new Promise<void>((resolve, reject) => {
        pendingWrites.set(sequence, { resolve, reject })
      })

      try {
        port.postMessage(
          {
            type: 'download-chunk',
            id: downloadId,
            sequence,
            chunk: transferableChunk,
          },
          [transferableChunk.buffer]
        )
      } catch (error) {
        pendingWrites.delete(sequence)

        throw error
      }

      return writePromise
    },
    close: () => {
      if (streamError) {
        throw streamError
      }

      const closePromise = new Promise<void>((resolve, reject) => {
        resolveClose = resolve
        rejectClose = reject
      })

      port.postMessage({ type: 'download-close', id: downloadId })

      return closePromise.finally(cleanup)
    },
    abort: (reason) => {
      port.postMessage({
        type: 'download-abort',
        id: downloadId,
        reason: String(reason ?? 'Download aborted'),
      })
      cleanup()

      return Promise.resolve()
    },
  })
}
