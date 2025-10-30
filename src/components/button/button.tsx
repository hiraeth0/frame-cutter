import type { FC } from 'react'

import styles from './button.module.css'
import clsx from 'clsx'

type Props = {
  disabled?: boolean
  title: string
  onClick?: () => void
}

export const Button: FC<Props> = ({ title, disabled, onClick }) => (
  <button
    className={clsx(styles.root, disabled && styles['root--disabled'])}
    onClick={() => {
      if (disabled) {
        return
      }

      onClick?.()
    }}
  >
    <div className={styles.title}>{title}</div>
  </button>
)
