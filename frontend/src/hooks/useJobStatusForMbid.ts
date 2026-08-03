import { useQueueStore } from '../store/queueStore'

export type DownloadDisplayStatus = 'idle' | 'queued' | 'downloading' | 'downloaded' | 'error'

export interface JobStatusInfo {
  status: DownloadDisplayStatus
  error: string | null
}

const DOWNLOADING_STAGES = new Set(['downloading', 'download_done', 'tagging'])

/** Live status for a track's download button, derived from whichever job in
 * the queue store matches this recording mbid (there can be more than one
 * across time — e.g. a re-download before the old job is GC'd — so the most
 * recently created one wins). */
export function useJobStatusForMbid(mbid: string): JobStatusInfo {
  return useQueueStore((s) => {
    let best: (typeof s.jobs)[string] | undefined
    for (const job of Object.values(s.jobs)) {
      if (job.mbid !== mbid) continue
      if (!best || job.created_at > best.created_at) best = job
    }
    if (!best) return { status: 'idle', error: null }
    if (best.status === 'complete') return { status: 'downloaded', error: null }
    if (best.status === 'error') return { status: 'error', error: best.error }
    if (DOWNLOADING_STAGES.has(best.stage)) return { status: 'downloading', error: null }
    return { status: 'queued', error: null }
  })
}
