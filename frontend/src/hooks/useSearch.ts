import { useState, useEffect, useRef } from 'react'
import { search, UnifiedResult } from '../api/search'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnifiedResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      setError(null)
      try {
        const data = await search(query)
        setResults(data)
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string }
        if (err?.name !== 'AbortError' && err?.name !== 'CanceledError') {
          setError('Search failed. Try again.')
        }
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return { query, setQuery, results, loading, error }
}
