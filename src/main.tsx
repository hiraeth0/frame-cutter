import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import { FfmpegProvider } from './components/ffmpeg-provider/ffmpeg-provider.tsx'
import { HomePage } from './pages/home-page/home-page.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FfmpegProvider>
      <HomePage />
    </FfmpegProvider>
  </StrictMode>
)
