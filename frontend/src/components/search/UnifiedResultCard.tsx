import { Download, Clock, User, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AlbumArt from './AlbumArt'
import { UnifiedResult } from '../../api/search'
import { useJobStatusForMbid } from '../../hooks/useJobStatusForMbid'

function ArtistThumb({ url, name }: { url: string | null | undefined; name: string }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
      <User size={20} className="text-accent-light" />
    </div>
  )
}

interface Props {
  result: UnifiedResult
  onDownload?: (result: UnifiedResult) => void
  alreadyDownloaded?: boolean
  onDownloadAlbum?: (result: UnifiedResult) => void
  downloadingAlbum?: boolean
  albumDownloaded?: boolean
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const baseCard =
  'flex items-center gap-3 px-3 py-2.5 md:gap-4 md:px-4 md:py-3 rounded-xl bg-surface-card border border-surface-border transition-all'

export default function UnifiedResultCard({
  result,
  onDownload,
  alreadyDownloaded = false,
  onDownloadAlbum,
  downloadingAlbum = false,
  albumDownloaded = false,
}: Props) {
  const navigate = useNavigate()
  const job = useJobStatusForMbid(result.type === 'recording' ? result.mbid : '')

  if (result.type === 'artist') {
    return (
      <div
        className={`${baseCard} cursor-pointer hover:border-accent/40 hover:bg-surface-hover active:bg-surface-hover`}
        onClick={() => navigate(`/artist/${result.mbid}`)}
      >
        <ArtistThumb url={result.cover_art_url} name={result.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{result.name}</p>
          {result.disambiguation && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{result.disambiguation}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-zinc-500 shrink-0" />
      </div>
    )
  }

  if (result.type === 'release_group') {
    return (
      <div
        className={`${baseCard} cursor-pointer hover:border-accent/40 hover:bg-surface-hover active:bg-surface-hover`}
        onClick={() => navigate(`/album/${result.mbid}`)}
      >
        <AlbumArt url={result.cover_art_url ?? null} title={result.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-100 truncate">{result.name}</p>
            {result.release_type && (
              <span className="shrink-0 max-w-[64px] truncate text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-muted text-accent-light">
                {result.release_type}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {result.artist}
            {result.year && <span className="text-zinc-600"> · {result.year}</span>}
          </p>
        </div>
        {onDownloadAlbum && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDownloadAlbum(result)
            }}
            disabled={downloadingAlbum || albumDownloaded}
            aria-label={albumDownloaded ? 'Album downloaded' : 'Download album'}
            title={albumDownloaded ? 'Album downloaded' : 'Download album'}
            className={`h-11 w-11 shrink-0 flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed ${
              albumDownloaded
                ? 'text-green-400'
                : 'text-zinc-400 hover:text-zinc-100 active:bg-surface-hover'
            }`}
          >
            {downloadingAlbum
              ? <Loader2 size={16} className="animate-spin" />
              : albumDownloaded
                ? <CheckCircle2 size={16} />
                : <Download size={16} />}
          </button>
        )}
        <ChevronRight size={16} className="text-zinc-500 shrink-0" />
      </div>
    )
  }

  // recording
  const downloaded = alreadyDownloaded || job.status === 'downloaded'
  const isError = job.status === 'error'
  const isBusy = job.status === 'queued' || job.status === 'downloading'
  const label = isError
    ? 'Failed'
    : job.status === 'queued'
      ? 'Queued…'
      : job.status === 'downloading'
        ? 'Downloading…'
        : downloaded
          ? 'Downloaded'
          : 'Download'

  return (
    <div className={`${baseCard} hover:border-accent/40 hover:bg-surface-hover group`}>
      <AlbumArt url={result.cover_art_url ?? null} title={result.name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{result.name}</p>
        <p className="text-xs text-zinc-400 truncate mt-0.5">
          {result.artist}
          {result.album && <span className="text-zinc-600"> · {result.album}</span>}
          {result.year && <span className="text-zinc-600"> · {result.year}</span>}
          {result.duration_ms && <span className="text-zinc-600 sm:hidden"> · {formatDuration(result.duration_ms)}</span>}
        </p>
        {isError && job.error && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{job.error}</p>
        )}
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0 self-start md:self-center">
        {result.duration_ms && (
          <span className="hidden sm:flex text-xs text-zinc-500 items-center gap-1">
            <Clock size={12} />
            {formatDuration(result.duration_ms)}
          </span>
        )}
        <button
          onClick={() => onDownload?.(result)}
          disabled={isBusy || downloaded}
          aria-label={label}
          title={isError && job.error ? job.error : undefined}
          className={`flex items-center justify-center gap-1.5 min-h-touch min-w-touch sm:min-w-0 px-0 sm:px-3.5 rounded-lg text-sm sm:text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isError
              ? 'bg-red-950/40 text-red-400 border border-red-800/50 hover:bg-red-950/70'
              : downloaded
                ? 'bg-green-900/40 text-green-400 border border-green-700/50 hover:bg-green-900/60'
                : 'bg-accent hover:bg-accent-light'
          }`}
        >
          {isBusy
            ? <Loader2 size={13} className="animate-spin" />
            : isError
              ? <AlertCircle size={13} />
              : downloaded
                ? <CheckCircle2 size={13} />
                : <Download size={13} />}
          <span className="hidden sm:inline">{label}</span>
        </button>
      </div>
    </div>
  )
}
