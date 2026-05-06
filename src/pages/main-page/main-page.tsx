import React, { useEffect, useState } from 'react'
import { useFfmpeg } from '../../utlis/ffmpeg-context'
import { FileDropzone } from './file-dropzone/file-dropzone'

import styles from './main-page.module.css'
import { Button } from '../../components/button/button'
import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { ProcessingSettings } from './processing-settings/processing-settings'
import {
  downloadZipEntries,
  isZipStreamingUnavailableError,
  type ZipEntry,
} from '../../utlis/zip-download'
import { showToast } from '../../components/toast-provider/show-toast'

const createUniqueFolderName = (fileName: string, fileIndex: number, folderNames: string[]) => {
  const baseName = fileName.replace(/\.[^/.]+$/, '') || `video_${fileIndex + 1}`

  if (!folderNames.includes(baseName)) {
    folderNames.push(baseName)

    return baseName
  }

  for (let copyIndex = 2; ; copyIndex++) {
    const folderName = `${baseName}_${copyIndex}`

    if (folderNames.includes(folderName)) {
      continue
    }

    folderNames.push(folderName)

    return folderName
  }
}

export const MainPage: React.FC = () => {
  const { ffmpeg, isLoading: isFfmpegLoading, isLoaded: isFfmpegLoaded, loadError } = useFfmpeg()
  const [files, setFiles] = useState<File[]>([])
  const [frameDiff, setFrameDiff] = useState(1)
  const [frameInterval, setFrameInterval] = useState(25)
  const [currentTaskProgress, setCurrentTaskProgress] = useState(0)
  const [archiveProgress, setArchiveProgress] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!loadError) {
      return
    }

    showToast(
      'Не удалось загрузить FFmpeg. Обновите страницу и проверьте подключение к сети.',
      'error'
    )
  }, [loadError])

  useEffect(() => {
    const handleProgress = (event: ProgressEvent) => {
      if (typeof event?.progress === 'number') {
        setCurrentTaskProgress(Math.round(event.progress * 100))

        return
      }

      if ('percent' in event && typeof event.percent === 'number') {
        setCurrentTaskProgress(Math.round(event.percent))
      }
    }

    ffmpeg.on('progress', handleProgress)

    return () => {
      ffmpeg.off?.('progress', handleProgress)
    }
  }, [ffmpeg])

  const progressRatioPerFile = 100 / files.length
  const processingProgressRatio = 0.95
  const archivingProgressRatio = 0.05

  const totalFileProgress =
    doneCount * progressRatioPerFile + currentTaskProgress * (progressRatioPerFile / 100)

  const totalProgress = Math.round(
    totalFileProgress * processingProgressRatio + archiveProgress * archivingProgressRatio
  )

  const isDone = totalProgress >= 100
  const isFfmpegUnavailable = isFfmpegLoading || !isFfmpegLoaded || Boolean(loadError)
  const buttonTitle = (() => {
    if (isFfmpegLoading) {
      return 'Загрузка FFmpeg...'
    }

    if (loadError || !isFfmpegLoaded) {
      return 'FFmpeg не загрузился'
    }

    if (isDone) {
      return 'Загрузить новое видео'
    }

    return 'Нарезать и скачать'
  })()

  const handleProcessing = async () => {
    if (isFfmpegLoading) {
      showToast('FFmpeg ещё загружается. Попробуйте снова через несколько секунд.', 'error')

      return
    }

    if (loadError || !isFfmpegLoaded || !ffmpeg.loaded) {
      showToast('FFmpeg не загрузился. Обновите страницу и проверьте подключение к сети.', 'error')

      return
    }

    setCurrentTaskProgress(0)
    setArchiveProgress(0)
    setDoneCount(0)
    setIsProcessing(true)

    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const zipName = `frames_${ts}.zip`
    const folderNames: string[] = []

    try {
      const deleteFfmpegFile = async (fileName: string) => {
        try {
          await ffmpeg.deleteFile(fileName)
        } catch (error) {
          console.warn(`Failed to delete ${fileName} from ffmpeg FS`, error)
        }
      }

      const generateEntries = async function* (): AsyncGenerator<ZipEntry> {
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          const file = files[fileIndex]

          if (!file) {
            setDoneCount((prev) => prev + 1)

            continue
          }

          const folderName = createUniqueFolderName(file.name, fileIndex, folderNames)
          const inName = `in_${fileIndex}_${file.name}`
          const outPattern = `${folderName}_%03d.png`
          let inputWritten = false

          try {
            const fileData = await fetchFile(file)
            await ffmpeg.writeFile(inName, fileData)
            inputWritten = true

            const vf = `select=gt(scene\\,${frameDiff / 100})+not(mod(n\\,${frameInterval})),mpdecimate=hi=64:lo=32:frac=0.33,showinfo`
            const exitCode = await ffmpeg.exec([
              '-i',
              inName,
              '-vf',
              vf,
              '-vsync',
              '0',
              '-q:v',
              '6',
              outPattern,
            ])

            if (exitCode !== 0) {
              console.error(`ffmpeg returned ${exitCode} for ${file.name}`)
            }
          } finally {
            if (inputWritten) {
              await deleteFfmpegFile(inName)
            }
          }

          setCurrentTaskProgress(100)

          const entries = await ffmpeg.listDir('/')
          const names: string[] = entries.map((entry) => {
            if (typeof entry === 'string') return entry
            if (entry?.name) return entry.name
            if ('path' in entry && typeof entry?.path === 'string') return entry.path

            return String(entry)
          })

          const pngs = names.filter(
            (name) => name.startsWith(`${folderName}_`) && name.toLowerCase().endsWith('.png')
          )

          if (pngs.length === 0) {
            yield {
              name: `${folderName}/README.txt`,
              data: new TextEncoder().encode(`Не удалось создать скриншоты для ${file.name}`),
            }

            setDoneCount((prev) => prev + 1)
            setCurrentTaskProgress(0)

            continue
          }

          for (const pngName of pngs) {
            try {
              const data = await ffmpeg.readFile(pngName)

              yield {
                name: `${folderName}/${pngName}`,
                data: data as Uint8Array,
              }
            } finally {
              await deleteFfmpegFile(pngName)
            }
          }

          setDoneCount((prev) => prev + 1)
          setCurrentTaskProgress(0)
        }
      }

      await downloadZipEntries({
        fileName: zipName,
        entries: generateEntries(),
      })
      setArchiveProgress(100)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setIsProcessing(false)

        return
      }

      if (isZipStreamingUnavailableError(error)) {
        console.warn('Streaming ZIP download is unavailable:', error)
        showToast(
          'Не удалось запустить потоковое сохранение ZIP. Проверьте HTTPS и настройки Service Worker или попробуйте обновить браузер.',
          'error'
        )
        setIsProcessing(false)

        return
      }

      console.error('Processing failed:', error)
      showToast('Ошибка при обработке видео', 'error')
      handleReset()
    }
  }

  const handleReset = () => {
    setFiles([])
    setCurrentTaskProgress(0)
    setDoneCount(0)
    setIsProcessing(false)
    setArchiveProgress(0)
  }

  return (
    <main className={styles.root}>
      <div className={styles.content}>
        <FileDropzone
          files={files}
          progress={isProcessing ? totalProgress : null}
          onChange={setFiles}
        />
        {!isProcessing ? (
          <ProcessingSettings
            frameDiff={frameDiff}
            frameInterval={frameInterval}
            onChangeFrameDiff={setFrameDiff}
            onChangeFrameInterval={setFrameInterval}
          />
        ) : null}
        <Button
          title={buttonTitle}
          disabled={!files.length || isFfmpegUnavailable || (isProcessing && !isDone)}
          onClick={() => {
            if (isDone) {
              handleReset()

              return
            }

            handleProcessing()
          }}
        />
      </div>
    </main>
  )
}
