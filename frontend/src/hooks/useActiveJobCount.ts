import { useQueueStore } from '../store/queueStore'

export function useActiveJobCount(): number {
  const jobs = useQueueStore((s) => s.jobs)
  return Object.values(jobs).filter((j) => j.status !== 'complete' && j.status !== 'error').length
}
