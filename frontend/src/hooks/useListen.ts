import { useCallback, useState } from 'react'
import { recognizeAudio, RecognizeResponse } from '../api/recognize'

export type ListenState = 'idle' | 'listening' | 'processing' | 'error'

const LISTEN_DURATION_MS = 8000

/** Records a short mic clip and sends it to the backend for Shazam-style
 * recognition. Fixed-duration auto-stop (like Shazam's own app) rather than
 * manual start/stop — simpler and matches how people expect "listen" to work. */
export function useListen() {
  const [state, setState] = useState<ListenState>('idle')
  const [error, setError] = useState<string | null>(null)

  const listen = useCallback(async (): Promise<RecognizeResponse | null> => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setError(
        window.isSecureContext
          ? 'Microphone access is not supported in this browser.'
          : 'Microphone access requires HTTPS (this page is loaded over plain HTTP).',
      )
      return null
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setState('error')
      const err = e as DOMException
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : err.name === 'NotFoundError'
            ? 'No microphone was found.'
            : 'Could not access the microphone.',
      )
      return null
    }

    setState('listening')
    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })

    recorder.start()
    await new Promise((r) => setTimeout(r, LISTEN_DURATION_MS))
    recorder.stop()
    await stopped
    stream.getTracks().forEach((t) => t.stop())

    setState('processing')
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      const res = await recognizeAudio(blob)
      setState('idle')
      return res
    } catch {
      setState('error')
      setError('Could not identify the track — try again.')
      return null
    }
  }, [])

  return { state, error, listen }
}
