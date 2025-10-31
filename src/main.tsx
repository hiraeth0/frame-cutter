import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import { FfmpegProvider } from './components/ffmpeg-provider/ffmpeg-provider.tsx'
import { MainPage } from './pages/main-page/main-page.tsx'
import { ToastProvider } from './components/toast-provider/toast-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FfmpegProvider>
      <ToastProvider />
      <MainPage />
    </FfmpegProvider>
  </StrictMode>
)
