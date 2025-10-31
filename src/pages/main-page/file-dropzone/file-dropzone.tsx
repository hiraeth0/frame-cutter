import { useRef, useState, type FC } from 'react'
import styles from './file-dropzone.module.css'
import { IconUpload } from '../../../icons/icon-upload'
import { FilePreview } from './file-preview/file-preview'
import clsx from 'clsx'

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/avi',
  'video/mp2t',
  'video/3gpp',
  'video/3gpp2',
]
const ALLOWED_EXTENSIONS = [
  '.mp4',
  '.mpeg',
  '.mpg',
  '.ogg',
  '.ogv',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
  '.ts',
  '.mts',
  '.m2ts',
  '.3gp',
  '.3g2',
]

const validateFile = (file: File) => {
  const isVideoType = ALLOWED_VIDEO_TYPES.includes(file.type)
  const hasVideoExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))

  if (!isVideoType && !hasVideoExtension) {
    return false
  }

  if (file.size > MAX_FILE_SIZE) {
    return false
  }

  return true
}

type Props = {
  files: File[]
  progress: number | null
  onChange: (files: File[]) => void
}

export const FileDropzone: FC<Props> = ({ files, progress, onChange }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isProcessing = typeof progress === 'number'

  const handleAppendFiles = (input: File[]) => {
    const validFiles = input.filter(validateFile)

    if (!validFiles.length) {
      return
    }

    onChange([...files, ...validFiles])
  }

  return (
    <article
      className={clsx(styles.root, isDraggingOver && styles['root--highlighted'])}
      onClick={() => {
        if (isProcessing) {
          return
        }

        inputRef.current?.click()
      }}
      onDragOver={(event) => {
        if (isProcessing) {
          return
        }

        event.preventDefault()
        setIsDraggingOver(true)
      }}
      onDrop={(event) => {
        if (isProcessing) {
          return
        }

        event.preventDefault()
        setIsDraggingOver(false)

        if (!event.dataTransfer.files.length) {
          return
        }

        handleAppendFiles(Array.from(event.dataTransfer.files))
      }}
      onDragLeave={(event) => {
        if (isProcessing) {
          return
        }

        event.preventDefault()
        setIsDraggingOver(false)
      }}
    >
      <input
        ref={inputRef}
        type='file'
        accept='video/*'
        multiple
        className={styles.fileInput}
        onChange={(event) => {
          if (isProcessing) {
            return
          }

          if (!event.target.files?.length) {
            return
          }

          handleAppendFiles(Array.from(event.target.files))
        }}
      />

      <div className={clsx(styles.info, isProcessing && styles['info--hidden'])}>
        <IconUpload />

        <div className={styles.hint}>
          <div className={styles.hint__title}>Перетащи файлы сюда или найди сам</div>
          <div className={styles.hint__subtitle}>Максимальный размер 1 ГБ</div>
        </div>
      </div>

      {files.length && !isProcessing ? (
        <>
          <div className={styles.divider} />
          <div className={styles.files} onClick={(event) => event.stopPropagation()}>
            <ul className={styles.files__list}>
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
              {files.map((file, index) => (
                <li key={index}>
                  <FilePreview
                    file={file}
                    onRemove={() => onChange(files.filter((item) => item !== file))}
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {isProcessing ? (
        <>
          <div className={styles.divider} />
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressBar__line} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressMessage}>
              {progress >= 100 ? 'Готово!' : `${progress}%`}
            </div>
          </div>
        </>
      ) : null}
    </article>
  )
}
