import React, { useEffect, useState } from 'react'
import { useFfmpeg } from '../../utlis/ffmpeg-context'
import { FileDropzone } from './file-dropzone/file-dropzone'

import styles from './main-page.module.css'
import { Button } from '../../components/button/button'
import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import JSZip from 'jszip'

export const MainPage: React.FC = () => {
  const { ffmpeg } = useFfmpeg()
  const [files, setFiles] = useState<File[]>([])

  const [currentTaskProgress, setCurrentTaskProgress] = useState(0)
  const [archiveProgress, setArchiveProgress] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

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

  const handleProcessing = async () => {
    setCurrentTaskProgress(0)
    setIsProcessing(true)

    const zip = new JSZip()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const zipName = `frames_${ts}.zip`

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!file) {
        setDoneCount((prev) => prev + 1)

        continue
      }

      const safeBase = file.name.replace(/\.[^/.]+$/, '')
      const inName = `in_${i}_${file.name}`
      const fileData = await fetchFile(file)
      await ffmpeg.writeFile(inName, fileData)

      const vf =
        'select=gt(scene\\,0.05)+not(mod(n\\,250)),mpdecimate=hi=64:lo=32:frac=0.33,showinfo'
      const outPattern = `${safeBase}_%03d.png`
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

      const entries = await ffmpeg.listDir('/')
      const names: string[] = entries.map((entry) => {
        if (typeof entry === 'string') {
          return entry
        }
        if (entry?.name) {
          return entry.name
        }
        if ('path' in entry && typeof entry?.path === 'string') {
          return entry.path
        }
        return String(entry)
      })

      const pngs = names.filter(
        (n) => n.startsWith(`${safeBase}_`) && n.toLowerCase().endsWith('.png')
      )

      if (pngs.length === 0) {
        zip.file(`${safeBase}/README.txt`, `Не удалось создать скриншоты для ${file.name}`)
      } else {
        const folder = zip.folder(safeBase) as JSZip
        for (const pngName of pngs) {
          const data = await ffmpeg.readFile(pngName)
          folder.file(pngName, data)
          await ffmpeg.deleteFile(pngName)
        }
      }

      setDoneCount((prev) => prev + 1)
      setCurrentTaskProgress(0)
      await ffmpeg.deleteFile(inName)
    }

    const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
      setArchiveProgress(Math.round(meta.percent))
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
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
        <Button
          title={isDone ? 'Загрузить новое видео' : 'Нарезать и скачать'}
          disabled={!files.length || (isProcessing && !isDone)}
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
