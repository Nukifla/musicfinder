import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/search/SearchBar'
import UnifiedResultCard from '../components/search/UnifiedResultCard'
import { useSearch } from '../hooks/useSearch'
import { useDownload } from '../hooks/useDownload'
import { useSSE } from '../hooks/useSSE'
import { useQueueStore } from '../store/queueStore'
import { UnifiedResult } from '../api/search'

export default function SearchPage() {
  const { query, setQuery, results, loading, error } = useSearch()
  const { download } = useDownload()
  const { updateJob } = useQueueStore()
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const navigate = useNavigate()

  useSSE(
    `/api/progress/${activeJobId}`,
    (data) => {
      const event = data as Partial<import('../store/queueStore').Job>
      if (event.job_id) {
        updateJob(event.job_id, event)
      }
    },
    !!activeJobId,
  )

  const handleDownload = async (result: UnifiedResult) => {
    setDownloadingIds((prev) => new Set(prev).add(result.mbid))
    try {
      const jobId = await download(
        result.mbid,
        result.name,
        result.artist ?? '',
        result.album ?? null,
        result.release_mbid,
      )
      setActiveJobId(jobId)
      navigate('/queue')
    } catch {
      // Remove from downloading set on error
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(result.mbid)
        return next
      })
    }
  }

  return (
    <div className="max-w-3xl">
      <SearchBar value={query} onChange={setQuery} loading={loading} />
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!loading && query && results.length === 0 && !error && (
        <p className="mt-6 text-sm text-zinc-500">No results found for "{query}"</p>
      )}
      {results.length > 0 && (
        <div className="flex flex-col gap-2 mt-6">
          {results.map((r) => (
            <UnifiedResultCard
              key={`${r.type}-${r.mbid}`}
              result={r}
              onDownload={r.type === 'recording' ? handleDownload : undefined}
              downloading={downloadingIds.has(r.mbid)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
