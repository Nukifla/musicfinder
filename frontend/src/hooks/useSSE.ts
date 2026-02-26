import { useEffect, useRef } from 'react'

export function useSSE(url: string, onMessage: (data: unknown) => void, enabled = true) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled) return
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRef.current(data)
      } catch {
        // ignore parse errors
      }
    }
    es.onerror = () => {
      es.close()
    }
    return () => es.close()
  }, [url, enabled])
}
