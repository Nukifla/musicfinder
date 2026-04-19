import { Download, Clock, User, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AlbumArt from './AlbumArt'
import { UnifiedResult } from '../../api/search'

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
  downloading?: boolean
  alreadyDownloaded?: boolean
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const baseCard = 'flex items-center gap-4 px-4 py-3 rounded-xl bg-surface-card border border-surface-border transition-all'

export default function UnifiedResultCard({ result, onDownload, downloading = false, alreadyDownloaded = false }: Props) {
  const navigate = useNavigate()

  if (result.type === 'artist') {
    return (
      <div
        className={`${baseCard} cursor-pointer hover:border-accent/40 hover:bg-surface-hover`}
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
        className={`${baseCard} cursor-pointer hover:border-accent/40 hover:bg-surface-hover`}
        onClick={() => navigate(`/album/${result.mbid}`)}
      >
        <AlbumArt url={result.cover_art_url ?? null} title={result.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-100 truncate">{result.name}</p>
            {result.release_type && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-muted text-accent-light">
                {result.release_type}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {result.artist}
            {result.year && <span className="text-zinc-600"> · {result.year}</span>}
          </p>
        </div>
        <ChevronRight size={16} className="text-zinc-500 shrink-0" />
      </div>
    )
  }

  // recording
  return (
    <div className={`${baseCard} hover:border-accent/40 hover:bg-surface-hover group`}>
      <AlbumArt url={result.cover_art_url ?? null} title={result.name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{result.name}</p>
        <p className="text-xs text-zinc-400 truncate mt-0.5">
          {result.artist}
          {result.album && <span className="text-zinc-600"> · {result.album}</span>}
          {result.year && <span className="text-zinc-600"> · {result.year}</span>}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {result.duration_ms && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(result.duration_ms)}
          </span>
        )}
        <button
          onClick={() => onDownload?.(result)}
          disabled={downloading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            alreadyDownloaded
              ? 'bg-green-900/40 text-green-400 border border-green-700/50 hover:bg-green-900/60'
              : 'bg-accent hover:bg-accent-light'
          }`}
        >
          {alreadyDownloaded
            ? <CheckCircle2 size={13} />
            : <Download size={13} />}
          {downloading ? 'Adding…' : alreadyDownloaded ? 'Downloaded' : 'Download'}
        </button>
      </div>
    </div>
  )
}
