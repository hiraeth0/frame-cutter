const DOWNLOAD_ROUTE = '/__frame-cutter-download'
const downloads = new Map()

const createContentDisposition = (fileName) => {
  const asciiFileName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encodedFileName = encodeURIComponent(fileName)

  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`
}

const createMessageError = (error) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const postError = (port, id, error) => {
  port.postMessage({
    type: 'download-error',
    id,
    message: createMessageError(error),
  })
}

const pumpDownload = (download) => {
  if (!download.controller) {
    return
  }

  while (download.queue.length && download.controller.desiredSize > 0) {
    const item = download.queue.shift()

    try {
      download.controller.enqueue(item.chunk)
      download.port.postMessage({
        type: 'chunk-written',
        id: download.id,
        sequence: item.sequence,
      })
    } catch (error) {
      postError(download.port, download.id, error)
      downloads.delete(download.id)

      return
    }
  }

  if (!download.queue.length && download.closeRequested) {
    download.controller.close()
    download.port.postMessage({ type: 'download-closed', id: download.id })
    downloads.delete(download.id)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const message = event.data

  if (!message || message.type !== 'download-start' || !event.ports.length) {
    return
  }

  const port = event.ports[0]
  const download = {
    id: message.id,
    fileName: message.fileName,
    port,
    queue: [],
    closeRequested: false,
    controller: null,
    stream: null,
  }

  download.stream = new ReadableStream({
    start: (controller) => {
      download.controller = controller
      port.postMessage({ type: 'download-ready', id: download.id })
    },
    pull: () => {
      pumpDownload(download)
    },
    cancel: (reason) => {
      postError(port, download.id, reason ?? 'Download cancelled')
      downloads.delete(download.id)
    },
  })

  port.onmessage = (portEvent) => {
    const portMessage = portEvent.data

    if (!portMessage || portMessage.id !== download.id) {
      return
    }

    if (portMessage.type === 'download-chunk') {
      download.queue.push({
        sequence: portMessage.sequence,
        chunk: portMessage.chunk,
      })
      pumpDownload(download)

      return
    }

    if (portMessage.type === 'download-close') {
      download.closeRequested = true
      pumpDownload(download)

      return
    }

    if (portMessage.type === 'download-abort') {
      download.controller?.error(new Error(portMessage.reason))
      downloads.delete(download.id)
    }
  }

  port.start()
  downloads.set(download.id, download)
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (!url.pathname.endsWith(DOWNLOAD_ROUTE)) {
    return
  }

  const id = url.searchParams.get('id')
  const download = downloads.get(id)

  if (!download) {
    event.respondWith(new Response('Download not found', { status: 404 }))

    return
  }

  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': createContentDisposition(download.fileName),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })

  download.port.postMessage({ type: 'download-started', id: download.id })
  event.respondWith(new Response(download.stream, { headers }))
})
