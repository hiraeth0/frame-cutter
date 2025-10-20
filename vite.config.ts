import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
  css: {
    postcss: './postcss.config.js',
  },
})
