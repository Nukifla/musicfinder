import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import ProgressBar from './ProgressBar'
import { Job } from '../../store/queueStore'

interface Props {
  job: Job
  onRemove: (id: string) => void
}

const stageLabels: Record<string, string> = {
  pending: 'Pending…',
  searching: 'Searching YouTube…',
  matched: 'Matched — preparing download',
  downloading: 'Downloading audio',
  download_done: 'Processing…',
  tagging: 'Writing metadata & cover art',
  complete: 'Complete',
  error: 'Error',
}

export default function QueueItem({ job, onRemove }: Props) {
  const isDone = job.status === 'complete'
  const isError = job.status === 'error'

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-surface-card border border-surface-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isDone ? (
            <CheckCircle size={16} className="text-green-500 shrink-0" />
          ) : isError ? (
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          ) : (
            <Loader2 size={16} className="text-accent-light shrink-0 animate-spin" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">{job.title}</p>
            <p className="text-xs text-zinc-500 truncate">{job.artist}{job.album ? ` · ${job.album}` : ''}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(job.job_id)}
          aria-label="Remove from queue"
          className="h-11 w-11 -mr-2 -mt-1 flex items-center justify-center rounded-lg shrink-0 text-zinc-500 hover:text-zinc-300 active:bg-surface-hover transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <ProgressBar progress={job.progress} status={job.status} />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span className="min-w-0 truncate">{stageLabels[job.stage] ?? job.stage}</span>
        <div className="flex items-center gap-3 shrink-0">
          {job.speed && <span>{job.speed}</span>}
          {job.eta && <span>ETA {job.eta}</span>}
          {!isError && <span>{job.progress}%</span>}
        </div>
      </div>

      {isError && job.error && (
        <p className="text-xs text-red-400 break-words">{job.error}</p>
      )}
      {isDone && job.final_path && (
        <p className="text-xs text-zinc-600 break-all line-clamp-2">{job.final_path}</p>
      )}
    </div>
  )
}
