import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { FfmpegContext } from '../../utlis/ffmpeg-context'
import { devLog } from '../../utlis/dev-log'

const createError = (error: unknown) => {
  if (error instanceof Error) {
    return error
  }

  return new Error(String(error))
}

const loadFfmpeg = async (ffmpeg: FFmpeg) => {
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'

  ffmpeg.on('log', ({ message }) => {
    devLog(message)
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
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const ffmpegInstanceRef = useRef(new FFmpeg())

  useEffect(() => {
    let isMounted = true

    loadFfmpeg(ffmpegInstanceRef.current)
      .then(() => {
        if (!isMounted) {
          return
        }

        setIsLoaded(true)
        setLoadError(null)
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        const loadError = createError(error)
        console.error('Failed to load ffmpeg:', loadError)
        setLoadError(loadError)
        setIsLoaded(false)
      })
      .finally(() => {
        if (!isMounted) {
          return
        }

        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <FfmpegContext.Provider
      value={{ ffmpeg: ffmpegInstanceRef.current, isLoading, isLoaded, loadError }}
    >
      {children}
    </FfmpegContext.Provider>
  )
}
