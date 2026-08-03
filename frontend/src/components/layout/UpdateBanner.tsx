import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useUpdateStore, clearCacheAndReload } from '../../store/updateStore'

export default function UpdateBanner() {
  const updateAvailable = useUpdateStore((s) => s.updateAvailable)
  const [updating, setUpdating] = useState(false)

  if (!updateAvailable) return null

  return (
    <div className="shrink-0 z-30 flex items-center justify-between gap-3 px-4 py-2 bg-accent text-white text-sm pl-safe-l pr-safe-r select-none">
      <span className="truncate">A new version of MusicFinder is available.</span>
      <button
        onClick={() => {
          setUpdating(true)
          clearCacheAndReload()
        }}
        disabled={updating}
        className="flex items-center gap-1.5 px-3 min-h-touch rounded-lg bg-white/15 active:bg-white/25 disabled:opacity-60 font-medium shrink-0 transition-colors"
      >
        <RefreshCw size={13} className={updating ? 'animate-spin' : ''} />
        {updating ? 'Updating…' : 'Update Now'}
      </button>
    </div>
  )
}
