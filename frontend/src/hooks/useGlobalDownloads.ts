import { useEffect } from 'react'
import { useQueueStore, Job } from '../store/queueStore'
import { useSSE } from './useSSE'
import { listDownloads } from '../api/downloads'

/** Mount once for the whole app (in Shell). Keeps the queue store in sync
 * with every in-flight download regardless of which page started it, via a
 * single global SSE stream plus a REST resync on mount/visibility. This is
 * what lets any download button (search results, album tracklist, artist
 * album tiles) show live Queued/Downloading/Downloaded state without each
 * needing its own SSE subscription — and lets multiple downloads run and
 * report progress concurrently. */
export function useGlobalDownloads() {
  const upsertJob = useQueueStore((s) => s.upsertJob)

  useEffect(() => {
    const sync = () => {
      listDownloads(50).then((records) => {
        for (const r of records) {
          if (r.status === 'complete' || r.status === 'error') continue
          upsertJob({
            job_id: r.job_id,
            mbid: r.mbid ?? '',
            title: r.title,
            artist: r.artist,
            album: r.album ?? null,
            status: r.status,
            error: r.error_msg ?? null,
            final_path: r.file_path ?? null,
            youtube_url: r.youtube_url ?? null,
            created_at: new Date(r.created_at).getTime(),
          })
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

  useSSE(
    '/api/progress/all',
    (data) => {
      const event = data as Partial<Job> & { job_id?: string; keepalive?: boolean }
      if (event.job_id) upsertJob(event as Partial<Job> & { job_id: string })
    },
    true,
  )
}
