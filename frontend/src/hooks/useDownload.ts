import { useQueueStore } from '../store/queueStore'
import { startDownload } from '../api/downloads'

export function useDownload() {
  const { addJob } = useQueueStore()

  const download = async (mbid: string, title: string, artist: string, album: string | null, release_mbid?: string | null) => {
    // Seed the store immediately before SSE connects (avoids race)
    const tempId = `pending-${mbid}`
    addJob({ job_id: tempId, title, artist, album })

    try {
      const res = await startDownload(mbid, release_mbid)
      // Replace temp job with real one
      useQueueStore.getState().removeJob(tempId)
      addJob({ job_id: res.job_id, title: res.title, artist: res.artist, album: res.album })
      return res.job_id
    } catch (e) {
      useQueueStore.getState().removeJob(tempId)
      throw e
    }
  }

  return { download }
}
