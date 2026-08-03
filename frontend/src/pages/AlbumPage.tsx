import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReleaseGroup, ReleaseGroupDetail, TrackSummary } from '../api/search'
import { useDownload } from '../hooks/useDownload'
import { useQueueStore } from '../store/queueStore'
import { useNavStore } from '../store/navStore'
import { useJobStatusForMbid } from '../hooks/useJobStatusForMbid'
import { checkLibrary } from '../api/library'
import AlbumArt from '../components/search/AlbumArt'
import { ChevronLeft, Download, Clock, DiscAlbum, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface TrackRowProps {
  track: TrackSummary
  downloaded: boolean
  onDownload: (track: TrackSummary) => void
}

function TrackRow({ track, downloaded, onDownload }: TrackRowProps) {
  const job = useJobStatusForMbid(track.mbid)
  const isDownloaded = downloaded || job.status === 'downloaded'
  const isError = job.status === 'error'
  const isBusy = job.status === 'queued' || job.status === 'downloading'
  const label = isError
    ? 'Failed'
    : job.status === 'queued'
      ? 'Queued…'
      : job.status === 'downloading'
        ? 'Downloading…'
        : isDownloaded
          ? 'Downloaded'
          : 'Download'

  return (
    <div
      key={track.mbid}
      className="flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl bg-surface-card border border-surface-border active:bg-surface-hover md:hover:border-accent/40 md:hover:bg-surface-hover transition-all"
    >
      <span className="text-xs text-zinc-600 w-6 text-right shrink-0">{track.position}</span>
      <div className="flex-1 min-w-0">
        <span className="block text-sm text-zinc-200 truncate">
          {track.title}
          {track.duration_ms && (
            <span className="sm:hidden text-zinc-500"> · {formatDuration(track.duration_ms)}</span>
          )}
        </span>
        {isError && job.error && (
          <p className="text-xs text-red-400 mt-0.5 line-clamp-2">{job.error}</p>
        )}
      </div>
      {track.duration_ms && (
        <span className="hidden sm:flex text-xs text-zinc-500 items-center gap-1 shrink-0">
          <Clock size={12} />
          {formatDuration(track.duration_ms)}
        </span>
      )}
      <button
        onClick={() => onDownload(track)}
        disabled={isBusy || isDownloaded}
        aria-label={label}
        title={isError && job.error ? job.error : undefined}
        className={`flex items-center justify-center gap-1.5 min-h-touch min-w-touch sm:min-w-0 px-0 sm:px-3 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 ${
          isError
            ? 'bg-red-950/40 text-red-400 border border-red-800/50 hover:bg-red-950/70'
            : isDownloaded
              ? 'bg-green-900/40 text-green-400 border border-green-700/50 hover:bg-green-900/60'
              : 'bg-accent hover:bg-accent-light'
        }`}
      >
        {isBusy
          ? <Loader2 size={13} className="animate-spin" />
          : isError
            ? <AlertCircle size={13} />
            : isDownloaded
              ? <CheckCircle2 size={13} />
              : <Download size={13} />}
        <span className="hidden sm:inline">{label}</span>
      </button>
    </div>
  )
}

export default function AlbumPage() {
  const { mbid } = useParams<{ mbid: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ReleaseGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadedMbids, setDownloadedMbids] = useState<Set<string>>(new Set())
  const { download } = useDownload()
  const jobs = useQueueStore((s) => s.jobs)
  const { setLastBrowseRoute, albumCache, cacheAlbum } = useNavStore()

  useEffect(() => {
    if (!mbid) return
    setLastBrowseRoute(`/album/${mbid}`)
    const cached = albumCache[mbid]
    if (cached) {
      setDetail(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    getReleaseGroup(mbid)
      .then((data) => { cacheAlbum(mbid, data); setDetail(data) })
      .catch(() => setError('Failed to load album.'))
      .finally(() => setLoading(false))
  }, [mbid])

  useEffect(() => {
    if (!detail) return
    checkLibrary(detail.tracks.map((t) => ({ mbid: t.mbid, title: t.title, artist: detail.artist })))
      .then(setDownloadedMbids)
      .catch(() => {})
  }, [detail])

  const setPageTitle = useNavStore((s) => s.setPageTitle)
  useEffect(() => {
    if (detail) setPageTitle(detail.title)
    return () => setPageTitle(null)
  }, [detail])

  const isMbidDone = (trackMbid: string) =>
    downloadedMbids.has(trackMbid) || Object.values(jobs).some((j) => j.mbid === trackMbid && j.status === 'complete')

  const handleDownloadAll = async () => {
    if (!detail || downloadingAll) return
    setDownloadingAll(true)
    try {
      const missing = detail.tracks.filter((t) => !isMbidDone(t.mbid))
      await Promise.all(
        missing.map((track) =>
          download(track.mbid, track.title, detail.artist, detail.title, detail.release_mbid),
        ),
      )
    } catch {
      // noop
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownload = async (track: TrackSummary) => {
    if (!detail) return
    try {
      // Queues silently — the row's own button reflects live Queued/
      // Downloading/Downloaded/Failed state, so no need to navigate away.
      await download(track.mbid, track.title, detail.artist, detail.title, detail.release_mbid)
    } catch {
      // noop
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <p className="text-zinc-500 text-sm mt-8">Loading…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="max-w-3xl">
        <p className="text-red-400 text-sm mt-8">{error ?? 'Album not found.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() =>
          navigate(detail.artist_mbid ? `/artist/${detail.artist_mbid}` : '/')
        }
        className="hidden md:flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        {detail.artist}
      </button>

      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 md:mb-8">
        <div className="shrink-0 rounded-lg overflow-hidden w-28 sm:w-[120px]">
          <AlbumArt fill url={detail.cover_art_url} title={detail.title} />
        </div>
        <div className="flex flex-col justify-center min-w-0 w-full">
          <h1 className="text-xl md:text-2xl font-bold text-zinc-100 break-words line-clamp-2">{detail.title}</h1>
          <p className="text-sm text-zinc-400 mt-1 truncate">
            {detail.artist}
            {detail.year && <span> · {detail.year}</span>}
            <span> · {detail.tracks.length} track{detail.tracks.length !== 1 ? 's' : ''}</span>
          </p>
          {(() => {
            const allDownloaded = detail.tracks.length > 0 && detail.tracks.every((t) => isMbidDone(t.mbid))
            return (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className={`mt-3 w-full sm:w-auto sm:self-start flex items-center justify-center gap-2 px-4 min-h-touch rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  allDownloaded
                    ? 'bg-green-900/40 text-green-400 border border-green-700/50 hover:bg-green-900/60'
                    : 'bg-accent hover:bg-accent-light'
                }`}
              >
                {allDownloaded ? <CheckCircle2 size={15} /> : <DiscAlbum size={15} />}
                {downloadingAll ? 'Queuing…' : allDownloaded ? 'All Downloaded' : 'Download Album'}
              </button>
            )
          })()}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {detail.tracks.map((track) => (
          <TrackRow key={track.mbid} track={track} downloaded={downloadedMbids.has(track.mbid)} onDownload={handleDownload} />
        ))}
      </div>
    </div>
  )
}
