import type { FC } from 'react'
import styles from './processing-settings.module.css'
import { SliderButton } from '../../../components/slider-button/slider-button'
import { IconInfo } from '../../../icons/icon-info'
import { Tooltip } from '../../../components/tooltip/tooltip'

type Props = {
  frameDiff: number
  frameInterval: number
  onChangeFrameDiff: (value: number) => void
  onChangeFrameInterval: (value: number) => void
}

export const ProcessingSettings: FC<Props> = ({
  frameDiff,
  frameInterval,
  onChangeFrameDiff,
  onChangeFrameInterval,
}) => (
  <article className={styles.root}>
    <div className={styles.side}>
      <div className={styles.title}>
        <div>Разница кадров</div>
        <Tooltip
          content={
            <div className={styles.tooltipMessage}>
              <div>Порог различия между кадрами в процентах.</div>
              <div>
                Определяет, насколько кадр должен отличаться от предыдущего скриншота, чтобы
                получить новый скриншот в заданный интервал.
              </div>
              <div>
                <b>Выше — меньше скриншотов</b>
                <br />
                <b>Ниже — больше скриншотов</b>
              </div>
            </div>
          }
        >
          <IconInfo />
        </Tooltip>
      </div>
      <SliderButton value={frameDiff} max={100} min={1} caption='%' onChange={onChangeFrameDiff} />
    </div>
    <div className={styles.side}>
      <div className={styles.title}>
        <div>Скриншот раз в</div>
        <Tooltip
          content={
            <div className={styles.tooltipMessage}>
              <div>Минимальный интервал между скриншотами в кадрах.</div>
              <div>
                Определяет, через сколько кадров можно проверить порог различия и сделать следующий
                скриншот.
              </div>
              <div>
                <b>Выше — меньше скриншотов</b>
                <br />
                <b>Ниже — больше скриншотов</b>
              </div>
            </div>
          }
        >
          <IconInfo />
        </Tooltip>
      </div>
      <SliderButton
        value={frameInterval}
        max={1000}
        min={1}
        caption='Кадров'
        onChange={onChangeFrameInterval}
      />
    </div>
  </article>
)
