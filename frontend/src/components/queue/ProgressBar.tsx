interface Props {
  progress: number
  status: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-zinc-600',
  searching: 'bg-yellow-500',
  matched: 'bg-blue-500',
  downloading: 'bg-accent-light',
  tagging: 'bg-purple-400',
  complete: 'bg-green-500',
  error: 'bg-red-500',
}

export default function ProgressBar({ progress, status }: Props) {
  const color = statusColors[status] ?? 'bg-accent'
  return (
    <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
