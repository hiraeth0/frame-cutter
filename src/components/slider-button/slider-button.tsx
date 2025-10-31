import { useRef, type FC, type PointerEvent as ReactPointerEvent } from 'react'

import styles from './slider-button.module.css'

type Props = {
  value: number
  min: number
  max: number
  caption: string
  inverseSensitivity?: number
  onChange: (value: number) => void
}

export const SliderButton: FC<Props> = ({
  value,
  min,
  max,
  caption,
  inverseSensitivity = 5,
  onChange,
}) => {
  const rootRef = useRef<HTMLButtonElement | null>(null)
  const startXRef = useRef(0)
  const startValueRef = useRef(value)

  const clamp = (v: number) => {
    if (v < min) return min
    if (v > max) return max
    return v
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const element = rootRef.current
    if (!element) return

    try {
      element.setPointerCapture?.(event.pointerId)
    } catch {
      // ignore
    }

    startXRef.current = event.clientX
    startValueRef.current = value

    const onMove = (moveEvent: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const deltaX = moveEvent.clientX - startXRef.current
      const range = max - min
      const change = Math.round(((deltaX / width) * range) / inverseSensitivity)
      const newVal = clamp(startValueRef.current + change)
      if (newVal !== value) onChange(newVal)
    }

    const onUp = () => {
      try {
        element.releasePointerCapture?.(event.pointerId)
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <button type='button' ref={rootRef} className={styles.root} onPointerDown={handlePointerDown}>
      <div className={styles.value}>{value}</div>
      <div className={styles.caption}>{caption}</div>
    </button>
  )
}
