import { Search, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  loading: boolean
}

export default function SearchBar({ value, onChange, loading }: Props) {
  return (
    <div className="relative max-w-2xl w-full">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 size={18} className="text-zinc-500 animate-spin" />
        ) : (
          <Search size={18} className="text-zinc-500" />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a track, artist, or album…"
        className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        autoFocus
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
