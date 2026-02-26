import { create } from 'zustand'

export interface Job {
  job_id: string
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
}

interface QueueStore {
  jobs: Record<string, Job>
  addJob: (job: Omit<Job, 'progress' | 'stage' | 'speed' | 'eta' | 'error' | 'final_path' | 'youtube_url' | 'status'>) => void
  updateJob: (job_id: string, update: Partial<Job>) => void
  removeJob: (job_id: string) => void
}

export const useQueueStore = create<QueueStore>((set) => ({
  jobs: {},
  addJob: (job) =>
    set((state) => ({
      jobs: {
        ...state.jobs,
        [job.job_id]: {
          ...job,
          status: 'pending',
          progress: 0,
          stage: 'pending',
          speed: null,
          eta: null,
          error: null,
          final_path: null,
          youtube_url: null,
        },
      },
    })),
  updateJob: (job_id, update) =>
    set((state) => {
      const existing = state.jobs[job_id]
      if (!existing) return state
      return {
        jobs: {
          ...state.jobs,
          [job_id]: { ...existing, ...update },
        },
      }
    }),
  removeJob: (job_id) =>
    set((state) => {
      const { [job_id]: _, ...rest } = state.jobs
      return { jobs: rest }
    }),
}))
