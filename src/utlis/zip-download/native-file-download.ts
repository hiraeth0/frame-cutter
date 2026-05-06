export const canUseNativeFileDownload = () => typeof window.showSaveFilePicker === 'function'

export const acquireNativeFileDownloadStream = async (
  fileName: string
): Promise<WritableStream<Uint8Array>> => {
  const handle = await window.showSaveFilePicker?.({
    suggestedName: fileName,
    types: [
      {
        description: 'ZIP Archive',
        accept: { 'application/zip': ['.zip'] },
      },
    ],
  })

  if (!handle) {
    throw new Error('Native file picker is unavailable')
  }

  return await handle.createWritable()
}
