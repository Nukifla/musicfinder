import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import HistoryTable from '../components/history/HistoryTable'
import { listDownloads, deleteDownload, DownloadRecord } from '../api/downloads'

export default function HistoryPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await listDownloads())
    } catch {
      setError('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    await deleteDownload(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300">{records.length} downloads</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover border border-surface-border transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      <HistoryTable records={records} onDelete={handleDelete} />
    </div>
  )
}
