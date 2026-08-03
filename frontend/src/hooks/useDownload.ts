import { useQueueStore } from '../store/queueStore'
import { startDownload } from '../api/downloads'

export function useDownload() {
  const upsertJob = useQueueStore((s) => s.upsertJob)

  const download = async (mbid: string, title: string, artist: string, album: string | null, release_mbid?: string | null) => {
    // Seed the store immediately before SSE connects (avoids race) — shows
    // as "Queued" right away.
    const tempId = `pending-${mbid}`
    upsertJob({ job_id: tempId, mbid, title, artist, album, status: 'pending', stage: 'pending' })

    try {
      const res = await startDownload(mbid, release_mbid)
      // Replace temp job with real one
      useQueueStore.getState().removeJob(tempId)
      upsertJob({ job_id: res.job_id, mbid, title: res.title, artist: res.artist, album: res.album, status: 'pending', stage: 'pending' })
      return res.job_id
    } catch (e) {
      useQueueStore.getState().removeJob(tempId)
      throw e
    }
  }

  return { download }
}
