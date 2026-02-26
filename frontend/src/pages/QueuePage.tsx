import { useEffect } from 'react'
import QueuePanel from '../components/queue/QueuePanel'
import { useQueueStore } from '../store/queueStore'
import { useSSE } from '../hooks/useSSE'

export default function QueuePage() {
  const { jobs, updateJob } = useQueueStore()
  const activeJobIds = Object.values(jobs)
    .filter((j) => j.status !== 'complete' && j.status !== 'error')
    .map((j) => j.job_id)

  // Subscribe to each active job individually
  return (
    <div>
      {activeJobIds.map((jobId) => (
        <SSESubscriber key={jobId} jobId={jobId} updateJob={updateJob} />
      ))}
      <QueuePanel />
    </div>
  )
}

function SSESubscriber({
  jobId,
  updateJob,
}: {
  jobId: string
  updateJob: (id: string, u: Partial<import('../store/queueStore').Job>) => void
}) {
  useSSE(
    `/api/progress/${jobId}`,
    (data) => {
      updateJob(jobId, data as Partial<import('../store/queueStore').Job>)
    },
    true,
  )
  return null
}
