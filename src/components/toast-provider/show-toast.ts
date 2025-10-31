import type { ReactNode } from 'react'
import { toast } from 'react-toastify'

import styles from './toast-provider.module.css'
import clsx from 'clsx'

type ToastType = 'error'

const STYLES_MAP: Record<ToastType, string> = {
  error: styles['toast--error']!,
}

export const showToast = (content: ReactNode, type: ToastType) =>
  toast(content, { className: clsx(styles.toast, STYLES_MAP[type]) })
