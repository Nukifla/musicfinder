import { create } from 'zustand'

export interface Job {
  job_id: string
  mbid: string
  title: string
  artist: string
  album: string | null
  status: string
  progress: number
  stage: string
  speed: string | null
  eta: string | null
  error: string | null
  final_path: string | null
  youtube_url: string | null
  created_at: number
}

interface QueueStore {
  jobs: Record<string, Job>
  /** Insert-or-merge by job_id — used for optimistic seeds, SSE events, and
   * REST sync alike, so there's one code path for "this job now looks like
   * this" regardless of source. */
  upsertJob: (job: Partial<Job> & { job_id: string }) => void
  removeJob: (job_id: string) => void
}

export const useQueueStore = create<QueueStore>((set) => ({
  jobs: {},
  upsertJob: (job) =>
    set((state) => {
      const existing = state.jobs[job.job_id]
      if (existing) {
        return { jobs: { ...state.jobs, [job.job_id]: { ...existing, ...job } } }
      }
      const fresh: Job = {
        job_id: job.job_id,
        mbid: job.mbid ?? '',
        title: job.title ?? '',
        artist: job.artist ?? '',
        album: job.album ?? null,
        status: job.status ?? 'pending',
        progress: job.progress ?? 0,
        stage: job.stage ?? 'pending',
        speed: job.speed ?? null,
        eta: job.eta ?? null,
        error: job.error ?? null,
        final_path: job.final_path ?? null,
        youtube_url: job.youtube_url ?? null,
        created_at: job.created_at ?? Date.now(),
      }
      return { jobs: { ...state.jobs, [job.job_id]: fresh } }
    }),
  removeJob: (job_id) =>
    set((state) => {
      const { [job_id]: _, ...rest } = state.jobs
      return { jobs: rest }
    }),
}))
