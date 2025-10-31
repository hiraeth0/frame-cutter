import { type FC } from 'react'
import styles from './file-preview.module.css'
import { IconTrash } from '../../../../icons/icon-trash'
import { Tooltip } from '../../../../components/tooltip/tooltip'

type Props = {
  file: File
  onRemove: () => void
}

export const FilePreview: FC<Props> = ({ file, onRemove }) => {
  const parts = file.name.split('.')

  const fileType = parts.pop()
  const fileName = parts.join('.') ?? 'Неизвестный файл'

  return (
    <section className={styles.root}>
      <div className={styles.fileType}>{fileType?.toUpperCase() ?? '?'}</div>
      <div className={styles.info}>
        <Tooltip showOnlyTruncated content={fileName}>
          <div className={styles.info__title}>{fileName}</div>
        </Tooltip>
        <div className={styles.info__subtitle}>{(file.size / (1024 * 1024)).toFixed(2)} МБ</div>
      </div>
      <button className={styles.icon} onClick={onRemove}>
        <IconTrash />
      </button>
    </section>
  )
}
