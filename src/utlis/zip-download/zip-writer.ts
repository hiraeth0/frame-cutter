import { Zip, ZipPassThrough } from 'fflate'
import type { ZipEntry } from './types'

export const writeZipEntries = async (
  entries: AsyncIterable<ZipEntry>,
  writableStream: WritableStream<Uint8Array>
): Promise<void> => {
  const zip = new Zip()
  const writer = writableStream.getWriter()
  let pendingWrite: Promise<void> | undefined

  zip.ondata = (error, data, final) => {
    if (error) {
      pendingWrite = (pendingWrite ?? Promise.resolve()).then(() => {
        throw error
      })

      return
    }

    pendingWrite = (pendingWrite ?? Promise.resolve())
      .then(() => writer.write(data))
      .then(() => {
        if (!final) {
          return
        }

        return writer.close()
      })
  }

  try {
    for await (const entry of entries) {
      if (pendingWrite) await pendingWrite

      const file = new ZipPassThrough(entry.name)
      zip.add(file)
      file.push(entry.data, true)
      if (pendingWrite) await pendingWrite
    }

    zip.end()
    if (pendingWrite) await pendingWrite
  } catch (error) {
    try {
      await writer.abort()
    } catch {
      // best-effort cleanup
    }

    throw error
  }
}
