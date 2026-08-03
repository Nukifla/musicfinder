import { Search, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  loading: boolean
}

export default function SearchBar({ value, onChange, loading }: Props) {
  return (
    <div className="relative max-w-2xl w-full flex-1 min-w-0">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 size={18} className="text-zinc-500 animate-spin" />
        ) : (
          <Search size={18} className="text-zinc-500" />
        )}
      </div>
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a track, artist, or album…"
        className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-12 py-3 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 active:bg-surface-hover"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}
