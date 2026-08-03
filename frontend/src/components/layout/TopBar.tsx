import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useNavStore } from '../../store/navStore'

const titles: Record<string, string> = {
  '/': 'Search',
  '/queue': 'Download Queue',
  '/history': 'History',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageTitle = useNavStore((s) => s.pageTitle)
  const showBack = pathname.startsWith('/artist/') || pathname.startsWith('/album/')
  const title = pageTitle ?? titles[pathname] ?? 'MusicFinder'

  return (
    <header className="shrink-0 z-30 border-b border-surface-border bg-surface/95 backdrop-blur pt-safe-t select-none">
      <div className="h-12 flex items-center gap-2 px-2 md:px-6">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="md:hidden -ml-1 h-11 w-11 shrink-0 flex items-center justify-center rounded-lg text-zinc-400 active:bg-surface-hover transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <h1 className="text-sm font-semibold text-zinc-300 truncate">{title}</h1>
      </div>
    </header>
  )
}
