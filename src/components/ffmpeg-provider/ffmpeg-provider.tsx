import { useEffect, useState, type FC, type ReactNode } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { FfmpegContext } from '../../utls/ffmpeg-context'

const loadFfmpeg = async (ffmpeg: FFmpeg) => {
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'

  ffmpeg.on('log', ({ message }) => {
    console.log(message)
  })

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

type Props = {
  children?: ReactNode | ReactNode[]
}

export const FfmpegProvider: FC<Props> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [ffmpegInstance, setFfmpegInstance] = useState(new FFmpeg())

  useEffect(() => {
    loadFfmpeg(ffmpegInstance)
      .then((ffmpeg) => {
        setFfmpegInstance(ffmpeg)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [ffmpegInstance])

  return (
    <FfmpegContext.Provider value={{ ffmpeg: ffmpegInstance, isLoading }}>
      {children}
    </FfmpegContext.Provider>
  )
}
