import { useEffect } from 'react'
import QueuePanel from '../components/queue/QueuePanel'
import { useQueueStore } from '../store/queueStore'
import { useSSE } from '../hooks/useSSE'
import { listDownloads } from '../api/downloads'

export default function QueuePage() {
  const { jobs, addJob, updateJob } = useQueueStore()

  useEffect(() => {
    const sync = () => {
      listDownloads(50).then((records) => {
        for (const r of records) {
          if (r.status === 'complete' || r.status === 'error') continue
          const current = useQueueStore.getState().jobs
          if (!current[r.job_id]) {
            addJob({ job_id: r.job_id, title: r.title, artist: r.artist, album: r.album ?? null })
          }
          // Re-sync status even for already-tracked jobs — a backgrounded
          // standalone PWA can miss SSE events entirely while suspended.
          updateJob(r.job_id, { status: r.status, error: r.error_msg ?? null, final_path: r.file_path ?? null, youtube_url: r.youtube_url ?? null })
        }
      }).catch(() => {})
    }

    sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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
