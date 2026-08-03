import { useQueueStore } from '../../store/queueStore'
import QueueItem from './QueueItem'

export default function QueuePanel() {
  const { jobs, removeJob } = useQueueStore()
  const list = Object.values(jobs).sort((a, b) => {
    // Active jobs first
    const aActive = a.status !== 'complete' && a.status !== 'error'
    const bActive = b.status !== 'complete' && b.status !== 'error'
    if (aActive !== bActive) return aActive ? -1 : 1
    return 0
  })

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-24 text-zinc-600">
        <p className="text-sm">No downloads in queue</p>
        <p className="text-xs mt-1">Search for a track to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {list.map((job) => (
        <QueueItem key={job.job_id} job={job} onRemove={removeJob} />
      ))}
    </div>
  )
}
