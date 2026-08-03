import { matchPath, useLocation, useNavigate } from 'react-router-dom'
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
  const albumCache = useNavStore((s) => s.albumCache)

  // Back always goes to the logical parent (album -> its artist, artist ->
  // search), never raw browser history — history can contain other tabs
  // (e.g. Queue) visited in between, which would otherwise hijack "back".
  const albumMatch = matchPath('/album/:mbid', pathname)
  const artistMatch = matchPath('/artist/:mbid', pathname)
  const backTo = albumMatch
    ? (() => {
        const artistMbid = albumCache[albumMatch.params.mbid ?? '']?.artist_mbid
        return artistMbid ? `/artist/${artistMbid}` : '/'
      })()
    : artistMatch
      ? '/'
      : null

  const title = pageTitle ?? titles[pathname] ?? 'MusicFinder'

  return (
    <header className="shrink-0 z-30 border-b border-surface-border bg-surface/95 backdrop-blur pt-safe-t select-none">
      <div className="h-12 flex items-center gap-2 px-2 md:px-6">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
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
