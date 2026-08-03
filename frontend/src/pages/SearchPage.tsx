import { useEffect, useState } from 'react'
import SearchBar from '../components/search/SearchBar'
import UnifiedResultCard from '../components/search/UnifiedResultCard'
import { useSearch } from '../hooks/useSearch'
import { useDownload } from '../hooks/useDownload'
import { useNavStore } from '../store/navStore'
import { UnifiedResult } from '../api/search'
import { checkLibrary } from '../api/library'

export default function SearchPage() {
  const { query, setQuery, results, loading, error } = useSearch()
  const setLastBrowseRoute = useNavStore((s) => s.setLastBrowseRoute)
  const { download } = useDownload()
  const [downloadedMbids, setDownloadedMbids] = useState<Set<string>>(new Set())

  useEffect(() => { setLastBrowseRoute('/') }, [])

  useEffect(() => {
    const recordings = results.filter((r) => r.type === 'recording')
    if (!recordings.length) { setDownloadedMbids(new Set()); return }
    checkLibrary(recordings.map((r) => ({ mbid: r.mbid, title: r.name, artist: r.artist ?? '' })))
      .then(setDownloadedMbids)
      .catch(() => {})
  }, [results])

  const handleDownload = async (result: UnifiedResult) => {
    try {
      // Queues silently — the card's own button reflects live Queued/
      // Downloading/Downloaded state, so no need to navigate away.
      await download(
        result.mbid,
        result.name,
        result.artist ?? '',
        result.album ?? null,
        result.release_mbid,
      )
    } catch {
      // noop
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
              alreadyDownloaded={downloadedMbids.has(r.mbid)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
