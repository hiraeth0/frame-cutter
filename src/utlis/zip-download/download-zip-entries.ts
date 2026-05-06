import { acquireNativeFileDownloadStream, canUseNativeFileDownload } from './native-file-download'
import { acquireServiceWorkerDownloadStream } from './service-worker-download'
import type { ZipEntry } from './types'
import { writeZipEntries } from './zip-writer'

type DownloadZipEntriesOptions = {
  fileName: string
  entries: AsyncIterable<ZipEntry>
}

const acquireDownloadStream = async (fileName: string) => {
  if (canUseNativeFileDownload()) {
    return await acquireNativeFileDownloadStream(fileName)
  }

  return await acquireServiceWorkerDownloadStream(fileName)
}

export const downloadZipEntries = async ({
  fileName,
  entries,
}: DownloadZipEntriesOptions): Promise<void> => {
  const writableStream = await acquireDownloadStream(fileName)

  await writeZipEntries(entries, writableStream)
}
