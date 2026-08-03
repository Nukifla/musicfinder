import { Mic, Loader2, AlertCircle } from 'lucide-react'
import { useListen } from '../../hooks/useListen'
import { RecognizeResponse } from '../../api/recognize'

interface Props {
  onResult: (result: RecognizeResponse) => void
}

export default function ListenButton({ onResult }: Props) {
  const { state, error, listen } = useListen()

  const handleClick = async () => {
    const res = await listen()
    if (res) onResult(res)
  }

  const busy = state === 'listening' || state === 'processing'

  return (
    <div className="relative shrink-0">
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label="Identify a song by listening"
        title={error ?? 'Identify a song playing nearby'}
        className={`h-11 min-w-touch flex items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed ${
          state === 'listening'
            ? 'bg-red-950/40 border-red-800/50 text-red-400'
            : state === 'error'
              ? 'border-red-800/50 text-red-400 active:bg-surface-hover'
              : 'bg-surface-card border-surface-border text-zinc-400 hover:text-zinc-100 hover:border-accent/40 active:bg-surface-hover'
        }`}
      >
        {state === 'listening' ? (
          <Mic size={18} className="animate-pulse" />
        ) : state === 'processing' ? (
          <Loader2 size={18} className="animate-spin" />
        ) : state === 'error' ? (
          <AlertCircle size={18} />
        ) : (
          <Mic size={18} />
        )}
      </button>
      {error && (
        <p className="absolute z-10 top-full mt-1 right-0 w-56 text-xs text-red-400 text-right">{error}</p>
      )}
    </div>
  )
}
