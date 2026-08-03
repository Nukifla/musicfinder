import QueuePanel from '../components/queue/QueuePanel'

export default function QueuePage() {
  // Job state is kept in sync app-wide by useGlobalDownloads (mounted once
  // in Shell) — a single global SSE stream plus REST resync on mount/
  // visibility, so this page just renders whatever's in the store.
  return (
    <div>
      <QueuePanel />
    </div>
  )
}
