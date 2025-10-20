/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import { fetchFile } from '@ffmpeg/util'
import { useFfmpeg } from '../../utls/ffmpeg-context'

export const HomePage: React.FC = () => {
  const { ffmpeg } = useFfmpeg()
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState('Idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Attach log/progress listeners (new API: ffmpeg.on)
  useEffect(() => {
    if (!ffmpeg) return

    const onLog = (event: any) => {
      // event.message is typical; keep compact
      if (event?.message) {
        const firstLine = String(event.message).split('\n')[0]
        setStatus(firstLine)
      }
    }
    const onProgress = (p: any) => {
      // docs: progress event shape may differ; we show percent if available
      if (typeof p?.progress === 'number') {
        setProgress(Math.round(p.progress * 100))
      } else if (typeof p?.percent === 'number') {
        setProgress(Math.round(p.percent))
      }
    }

    ffmpeg.on('log', onLog)
    ffmpeg.on('progress', onProgress)

    return () => {
      ffmpeg.off?.('log', onLog)
      ffmpeg.off?.('progress', onProgress)
      setProgress(null)
    }
  }, [ffmpeg])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files ? Array.from(e.target.files) : []
    setFiles(chosen)
  }

  async function processAndZip() {
    if (files.length === 0) {
      setStatus('No files selected.')
      return
    }

    setProcessing(true)
    setStatus('Starting processing...')
    setProgress(null)

    const zip = new JSZip()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const zipName = `frames_${ts}.zip`

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setStatus(`Processing ${file.name} (${i + 1}/${files.length})`)

        const safeBase = file.name.replace(/\.[^/.]+$/, '')
        const inName = `in_${i}_${file.name}` // unique input filename
        const fileData = await fetchFile(file) // from @ffmpeg/util — returns Uint8Array
        await ffmpeg.writeFile(inName, fileData) // write into ffmpeg worker FS. :contentReference[oaicite:1]{index=1}

        // // Filter string: avoid shell quoting; escape commas where needed for filter parsing.
        // const vf = 'select=gt(scene\\,0.03)+not(mod(n\\,150)),showinfo'
        // const outPattern = `${safeBase}_%03d.png`

        // // Run ffmpeg command using the new API: ffmpeg.exec([...])
        // // exec prepends "-nostdin" and "-y" by default (per docs).
        // const exitCode = await ffmpeg.exec(['-i', inName, '-vf', vf, outPattern])

        const vf =
          'select=gt(scene\\,0.06)+not(mod(n\\,300)),mpdecimate=hi=64:lo=32:frac=0.33,showinfo'
        const outPattern = `${safeBase}_%03d.png`
        const exitCode = await ffmpeg.exec([
          '-i',
          inName,
          '-vf',
          vf,
          '-vsync',
          '0',
          '-q:v',
          '6',
          outPattern,
        ])

        if (exitCode !== 0) {
          // non-zero exit -> continue but note error
          setStatus(`ffmpeg returned ${exitCode} for ${file.name}`)
        }

        // enumerate files in root and pick outputs that match our base
        const entries = await ffmpeg.listDir('/') // returns FSNode[] (we'll extract names safely). :contentReference[oaicite:2]{index=2}
        const names: string[] = entries.map((e: any) => {
          if (typeof e === 'string') return e
          if (e?.name) return e.name
          if (e?.path) return e.path
          return String(e)
        })

        const pngs = names.filter(
          (n) => n.startsWith(`${safeBase}_`) && n.toLowerCase().endsWith('.png')
        )

        if (pngs.length === 0) {
          zip.file(`${safeBase}/README.txt`, `No screenshots produced for ${file.name}`)
        } else {
          const folder = zip.folder(safeBase) as JSZip
          for (const pngName of pngs) {
            const data = await ffmpeg.readFile(pngName) // returns Uint8Array by default. :contentReference[oaicite:3]{index=3}
            folder.file(pngName, data)
            // cleanup in ffmpeg FS
            await ffmpeg.deleteFile(pngName)
          }
        }

        await ffmpeg.deleteFile(inName)

        setStatus(`Added ${pngs.length} images from ${file.name}`)
      }

      // generate zip
      setStatus('Generating ZIP...')
      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setProgress(Math.round(meta.percent))
      })

      // trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = zipName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setStatus(`Done — downloaded ${zipName}`)
      setProgress(null)
      setFiles([])
    } catch (err: any) {
      console.error(err)
      setStatus(`Error: ${err?.message || String(err)}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Video → Screenshots (ffmpeg.wasm)</h1>

      <div style={styles.card}>
        <input
          ref={inputRef}
          type='file'
          accept='video/*'
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={styles.button}
            onClick={() => inputRef.current?.click()}
            disabled={processing}
          >
            Choose videos…
          </button>

          <button
            style={styles.button}
            onClick={processAndZip}
            disabled={processing || files.length === 0}
          >
            {processing ? 'Processing…' : 'Process & Download ZIP'}
          </button>
        </div>

        <div style={styles.meta}>
          <div>
            <strong>Selected:</strong> {files.length}
          </div>
          <div>
            <strong>Status:</strong> {status}
          </div>
          <div>
            <strong>Progress:</strong> {progress !== null ? `${progress}%` : '—'}
          </div>
        </div>

        {files.length > 0 && (
          <ul style={styles.list}>
            {files.map((f, idx) => (
              <li key={idx}>
                {f.name} — {(f.size / (1024 * 1024)).toFixed(2)} MB
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 920,
    margin: '28px auto',
    fontFamily: 'Arial, Helvetica, sans-serif',
    padding: 12,
  },
  h1: { fontSize: 22, marginBottom: 14 },
  card: { padding: 16, borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff' },
  button: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #bbb',
    background: '#f6f6f6',
    cursor: 'pointer',
  },
  meta: { marginTop: 12, lineHeight: 1.6 },
  list: { marginTop: 12, paddingLeft: 18 },
}
