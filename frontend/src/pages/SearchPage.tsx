import { useEffect, useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import SearchBar from '../components/search/SearchBar'
import ListenButton from '../components/search/ListenButton'
import UnifiedResultCard from '../components/search/UnifiedResultCard'
import AlbumArt from '../components/search/AlbumArt'
import { useSearch } from '../hooks/useSearch'
import { useDownload } from '../hooks/useDownload'
import { useNavStore } from '../store/navStore'
import { UnifiedResult } from '../api/search'
import { RecognizeResponse } from '../api/recognize'
import { checkLibrary } from '../api/library'

export default function SearchPage() {
  const { query, setQuery, results, loading, error } = useSearch()
  const setLastBrowseRoute = useNavStore((s) => s.setLastBrowseRoute)
  const { download } = useDownload()
  const [downloadedMbids, setDownloadedMbids] = useState<Set<string>>(new Set())
  const [listenResult, setListenResult] = useState<RecognizeResponse | null>(null)

  useEffect(() => { setLastBrowseRoute('/') }, [])

  useEffect(() => {
    const recordings = [...results, ...(listenResult?.results ?? [])].filter((r) => r.type === 'recording')
    if (!recordings.length) { setDownloadedMbids(new Set()); return }
    checkLibrary(recordings.map((r) => ({ mbid: r.mbid, title: r.name, artist: r.artist ?? '' })))
      .then(setDownloadedMbids)
      .catch(() => {})
  }, [results, listenResult])

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

  const handleQueryChange = (v: string) => {
    setListenResult(null)
    setQuery(v)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2">
        <SearchBar value={query} onChange={handleQueryChange} loading={loading} />
        <ListenButton onResult={setListenResult} />
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {listenResult && (
        <div className="mt-6">
          {listenResult.match ? (
            <div className="flex items-center gap-3 mb-3">
              <AlbumArt url={listenResult.match.cover_art_url} title={listenResult.match.title} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300">
                  Identified: <span className="font-semibold text-zinc-100">{listenResult.match.title}</span> by{' '}
                  <span className="font-semibold text-zinc-100">{listenResult.match.artist}</span>
                </p>
              </div>
              <button
                onClick={() => setListenResult(null)}
                aria-label="Dismiss"
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-lg text-zinc-500 active:bg-surface-hover"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle size={16} />
              Couldn't identify that — try again with clearer audio.
            </div>
          )}
          {(listenResult.artist || listenResult.release_group) && (
            <div className="flex flex-col gap-2 mb-2">
              {listenResult.artist && (
                <UnifiedResultCard key={`listen-artist-${listenResult.artist.mbid}`} result={listenResult.artist} />
              )}
              {listenResult.release_group && (
                <UnifiedResultCard key={`listen-rg-${listenResult.release_group.mbid}`} result={listenResult.release_group} />
              )}
            </div>
          )}
          {listenResult.results.length > 0 ? (
            <div className="flex flex-col gap-2">
              {listenResult.results.map((r) => (
                <UnifiedResultCard
                  key={`listen-${r.mbid}`}
                  result={r}
                  onDownload={handleDownload}
                  alreadyDownloaded={downloadedMbids.has(r.mbid)}
                />
              ))}
            </div>
          ) : listenResult.match ? (
            <p className="text-sm text-zinc-500">No exact recording match found in MusicBrainz for this track.</p>
          ) : null}
        </div>
      )}

      {!listenResult && !loading && query && results.length === 0 && !error && (
        <p className="mt-6 text-sm text-zinc-500">No results found for "{query}"</p>
      )}
      {!listenResult && results.length > 0 && (
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
