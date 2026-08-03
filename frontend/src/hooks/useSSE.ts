import { useEffect, useRef } from 'react'

const MAX_BACKOFF_MS = 15000

export function useSSE(url: string, onMessage: (data: unknown) => void, enabled = true) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled) return

    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let stopped = false

    const connect = () => {
      es = new EventSource(url)
      es.onopen = () => {
        attempt = 0
      }
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          onMessageRef.current(data)
        } catch {
          // ignore parse errors
        }
      }
      es.onerror = () => {
        es?.close()
        if (stopped) return
        // Standalone PWAs tear down EventSource when backgrounded/locked —
        // reconnect with capped backoff instead of giving up permanently.
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS)
        attempt += 1
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!es || es.readyState === EventSource.CLOSED)) {
        if (retryTimer) {
          clearTimeout(retryTimer)
          retryTimer = null
        }
        attempt = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      if (retryTimer) clearTimeout(retryTimer)
      es?.close()
    }
  }, [url, enabled])
}
