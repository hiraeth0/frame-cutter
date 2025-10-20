import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import { HomePage } from './pages/home-page/home-page.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HomePage />
  </StrictMode>
)
