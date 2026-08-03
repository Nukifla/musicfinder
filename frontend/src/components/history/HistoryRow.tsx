import { Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { DownloadRecord } from '../../api/downloads'

interface Props {
  record: DownloadRecord
  onDelete: (id: number) => void
}

const statusIcon = (status: string) => {
  if (status === 'complete') return <CheckCircle size={14} className="text-green-500" />
  if (status === 'error') return <AlertCircle size={14} className="text-red-500" />
  return <Clock size={14} className="text-zinc-500" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function HistoryRow({ record, onDelete }: Props) {
  return (
    <tr className="border-b border-surface-border hover:bg-surface-hover transition-colors">
      <td className="px-4 py-3 text-sm text-zinc-100">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{statusIcon(record.status)}</div>
          <div className="min-w-0">
            <p className="truncate max-w-xs font-medium">{record.title}</p>
            <p className="text-xs text-zinc-500">{record.artist}</p>
            {record.status === 'error' && record.error_msg && (
              <p className="text-xs text-red-400 mt-0.5 max-w-xs line-clamp-2" title={record.error_msg}>
                {record.error_msg}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400 hidden md:table-cell">{record.album ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-zinc-500 hidden lg:table-cell uppercase">{record.file_format ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-zinc-500 hidden lg:table-cell">{formatBytes(record.file_size)}</td>
      <td className="px-4 py-3 text-xs text-zinc-600 hidden xl:table-cell truncate max-w-xs" title={record.file_path ?? ''}>
        {record.file_path ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500 hidden sm:table-cell">{formatDate(record.created_at)}</td>
      <td className="px-2 py-3">
        <button
          onClick={() => onDelete(record.id)}
          aria-label="Delete from history"
          className="h-11 w-11 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 active:bg-surface-hover transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}
