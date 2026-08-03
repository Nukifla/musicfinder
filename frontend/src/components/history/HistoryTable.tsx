import { DownloadRecord } from '../../api/downloads'
import HistoryRow from './HistoryRow'
import HistoryCard from './HistoryCard'

interface Props {
  records: DownloadRecord[]
  onDelete: (id: number) => void
}

export default function HistoryTable({ records, onDelete }: Props) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-24 text-zinc-600">
        <p className="text-sm">No download history yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="md:hidden flex flex-col gap-2">
        {records.map((r) => (
          <HistoryCard key={r.id} record={r} onDelete={onDelete} />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-card border-b border-surface-border">
              <th className="px-4 py-2 text-xs font-medium text-zinc-500">Track</th>
              <th className="px-4 py-2 text-xs font-medium text-zinc-500 hidden md:table-cell">Album</th>
              <th className="px-4 py-2 text-xs font-medium text-zinc-500 hidden lg:table-cell">Format</th>
              <th className="px-4 py-2 text-xs font-medium text-zinc-500 hidden lg:table-cell">Size</th>
              <th className="px-4 py-2 text-xs font-medium text-zinc-500 hidden xl:table-cell">Path</th>
              <th className="px-4 py-2 text-xs font-medium text-zinc-500 hidden sm:table-cell">Downloaded</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <HistoryRow key={r.id} record={r} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
