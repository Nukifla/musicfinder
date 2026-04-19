import { useEffect, useRef, useState } from 'react'
import { search } from '../api/search'
import { useSearchStore } from '../store/searchStore'

export function useSearch() {
  const { query, results, setQuery, setResults } = useSearchStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountRef = useRef(true)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    // Cancel any in-flight request immediately on every query change
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    if (!query.trim()) {
      mountRef.current = false
      setResults([])
      setError(null)
      return
    }

    if (mountRef.current && results.length > 0) {
      mountRef.current = false
      return
    }
    mountRef.current = false

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)
      try {
        const data = await search(query, controller.signal)
        setResults(data)
      } catch (e: unknown) {
        const err = e as { name?: string }
        if (err?.name !== 'AbortError' && err?.name !== 'CanceledError') {
          setError('Search failed. Try again.')
        }
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return { query, setQuery, results, loading, error }
}
