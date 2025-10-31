import { useRef, useState, type FC } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

import styles from './tooltip.module.css'

export type TooltipProps = {
  children: React.ReactNode
  content: React.ReactNode
  showOnlyTruncated?: boolean
  side?: RadixTooltip.TooltipContentProps['side']
}

export const Tooltip: FC<TooltipProps> = ({
  children,
  showOnlyTruncated = false,
  content,
  side,
}) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  return (
    <RadixTooltip.Provider delayDuration={0}>
      <RadixTooltip.Root
        {...(showOnlyTruncated
          ? {
              open,
              onOpenChange: (value) => {
                if (value) {
                  const child = triggerRef.current?.children[0] as HTMLElement | undefined
                  if (!child) {
                    return
                  }

                  setOpen(child.offsetWidth < child.scrollWidth)
                  return
                }

                setOpen(value)
              },
            }
          : {})}
      >
        <RadixTooltip.Trigger asChild>
          <button ref={triggerRef} type='button' className={styles.trigger}>
            {children}
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={styles.content}
            side={side}
            sideOffset={4}
            onClick={(e) => e.stopPropagation()}
          >
            <RadixTooltip.Arrow className={styles.arrow} />
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
