import { ToastContainer, Slide, type CloseButtonProps } from 'react-toastify'
import styles from './toast-provider.module.css'
import { IconClose } from '../../icons/icon-close'

const CloseButton = ({ closeToast }: CloseButtonProps) => (
  <button className={styles.close} onClick={closeToast}>
    <IconClose />
  </button>
)

export const ToastProvider: React.FC = () => {
  return (
    <ToastContainer
      position='top-center'
      autoClose={false}
      hideProgressBar
      newestOnTop
      rtl={false}
      pauseOnFocusLoss
      draggable={false}
      pauseOnHover
      transition={Slide}
      closeButton={CloseButton}
      toastClassName={styles.toast}
      limit={10}
    />
  )
}
