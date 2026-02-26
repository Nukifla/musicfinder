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
        <div className="flex items-center gap-2">
          {statusIcon(record.status)}
          <div>
            <p className="truncate max-w-xs font-medium">{record.title}</p>
            <p className="text-xs text-zinc-500">{record.artist}</p>
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
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(record.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}
