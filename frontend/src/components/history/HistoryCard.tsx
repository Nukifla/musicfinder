import { Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { DownloadRecord } from '../../api/downloads'

interface Props {
  record: DownloadRecord
  onDelete: (id: number) => void
}

const statusIcon = (status: string) => {
  if (status === 'complete') return <CheckCircle size={14} className="text-green-500 shrink-0" />
  if (status === 'error') return <AlertCircle size={14} className="text-red-500 shrink-0" />
  return <Clock size={14} className="text-zinc-500 shrink-0" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export default function HistoryCard({ record, onDelete }: Props) {
  const meta = [formatDateShort(record.created_at), formatBytes(record.file_size)].filter(Boolean).join(' · ')
  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-surface-card border border-surface-border">
      <div className="mt-0.5">{statusIcon(record.status)}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100 truncate">{record.title}</p>
        <p className="text-xs text-zinc-500 truncate">
          {record.artist}
          {record.album ? ` · ${record.album}` : ''}
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">{meta}</p>
        {record.status === 'error' && record.error_msg && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{record.error_msg}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(record.id)}
        aria-label="Delete from history"
        className="h-11 w-11 -mr-2 -mt-1 flex items-center justify-center rounded-lg shrink-0 text-zinc-600 active:text-red-400 active:bg-surface-hover transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
