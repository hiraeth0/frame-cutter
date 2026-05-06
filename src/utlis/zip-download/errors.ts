export type ZipStreamingUnavailableReason =
  | 'download-start-timeout'
  | 'insecure-context'
  | 'service-worker-unavailable'
  | 'streams-unavailable'
  | 'worker-not-active'
  | 'worker-ready-timeout'

export class ZipStreamingUnavailableError extends Error {
  readonly reason: ZipStreamingUnavailableReason
  readonly originalError?: unknown

  constructor(
    reason: ZipStreamingUnavailableReason,
    message = 'Streaming ZIP download is unavailable in this browser context',
    originalError?: unknown
  ) {
    super(message)
    this.name = 'ZipStreamingUnavailableError'
    this.reason = reason
    this.originalError = originalError
  }
}

export const createZipStreamingUnavailableError = (
  reason: ZipStreamingUnavailableReason,
  message?: string,
  originalError?: unknown
) => new ZipStreamingUnavailableError(reason, message, originalError)

export const isZipStreamingUnavailableError = (
  error: unknown
): error is ZipStreamingUnavailableError => error instanceof ZipStreamingUnavailableError
