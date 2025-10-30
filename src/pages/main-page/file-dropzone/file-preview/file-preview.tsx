import { type FC } from 'react'
import styles from './file-preview.module.css'
import { IconTrash } from '../../../../icons/icon-trash'

type Props = {
  file: File
  onRemove: () => void
}

export const FilePreview: FC<Props> = ({ file, onRemove }) => {
  const parts = file.name.split('.')

  const fileType = parts.pop()
  const fileName = parts.join('.')

  return (
    <section className={styles.root}>
      <div className={styles.fileType}>{fileType?.toUpperCase() ?? '?'}</div>
      <div className={styles.info}>
        <div className={styles.info__title}>{fileName ?? 'Неизвестный файл'}</div>
        <div className={styles.info__subtitle}>{(file.size / (1024 * 1024)).toFixed(2)} МБ</div>
      </div>
      <button className={styles.icon} onClick={onRemove}>
        <IconTrash />
      </button>
    </section>
  )
}
