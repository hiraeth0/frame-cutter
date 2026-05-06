import { createContext } from 'react'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { useNonNullContext } from './use-non-null-context'

export const FfmpegContext = createContext<{
  ffmpeg: FFmpeg
  isLoading: boolean
  isLoaded: boolean
  loadError: Error | null
} | null>(null)

export const useFfmpeg = () => useNonNullContext(FfmpegContext)
