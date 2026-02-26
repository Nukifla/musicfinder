import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReleaseGroup, ReleaseGroupDetail, TrackSummary } from '../api/search'
import { useDownload } from '../hooks/useDownload'
import { useSSE } from '../hooks/useSSE'
import { useQueueStore } from '../store/queueStore'
import AlbumArt from '../components/search/AlbumArt'
import { ChevronLeft, Download, Clock, DiscAlbum } from 'lucide-react'

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AlbumPage() {
  const { mbid } = useParams<{ mbid: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ReleaseGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const { download } = useDownload()
  const { updateJob } = useQueueStore()

  useSSE(
    `/api/progress/${activeJobId}`,
    (data) => {
      const event = data as Partial<import('../store/queueStore').Job>
      if (event.job_id) updateJob(event.job_id, event)
    },
    !!activeJobId,
  )

  useEffect(() => {
    if (!mbid) return
    setLoading(true)
    getReleaseGroup(mbid)
      .then(setDetail)
      .catch(() => setError('Failed to load album.'))
      .finally(() => setLoading(false))
  }, [mbid])

  const handleDownloadAll = async () => {
    if (!detail || downloadingAll) return
    setDownloadingAll(true)
    try {
      await Promise.all(
        detail.tracks.map((track) =>
          download(track.mbid, track.title, detail.artist, detail.title, detail.release_mbid),
        ),
      )
      navigate('/queue')
    } catch {
      // noop
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownload = async (track: TrackSummary) => {
    if (!detail) return
    setDownloadingIds((prev) => new Set(prev).add(track.mbid))
    try {
      const jobId = await download(
        track.mbid,
        track.title,
        detail.artist,
        detail.title,
        detail.release_mbid,
      )
      setActiveJobId(jobId)
      navigate('/queue')
    } catch {
      // noop
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(track.mbid)
        return next
      })
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
          detail.artist_mbid ? navigate(`/artist/${detail.artist_mbid}`) : navigate(-1)
        }
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        {detail.artist}
      </button>

      <div className="flex gap-6 mb-8">
        <div className="shrink-0 rounded-lg overflow-hidden">
          <AlbumArt url={detail.cover_art_url} title={detail.title} size={120} />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-2xl font-bold text-zinc-100 truncate">{detail.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {detail.artist}
            {detail.year && <span> · {detail.year}</span>}
            <span> · {detail.tracks.length} track{detail.tracks.length !== 1 ? 's' : ''}</span>
          </p>
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="mt-3 self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DiscAlbum size={15} />
            {downloadingAll ? 'Queuing…' : 'Download Album'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {detail.tracks.map((track) => (
          <div
            key={track.mbid}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border border-surface-border hover:border-accent/40 hover:bg-surface-hover transition-all"
          >
            <span className="text-xs text-zinc-600 w-6 text-right shrink-0">{track.position}</span>
            <span className="flex-1 text-sm text-zinc-200 truncate">{track.title}</span>
            {track.duration_ms && (
              <span className="text-xs text-zinc-500 flex items-center gap-1 shrink-0">
                <Clock size={12} />
                {formatDuration(track.duration_ms)}
              </span>
            )}
            <button
              onClick={() => handleDownload(track)}
              disabled={downloadingIds.has(track.mbid)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Download size={13} />
              {downloadingIds.has(track.mbid) ? 'Adding…' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
