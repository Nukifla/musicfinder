import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'Search',
  '/queue': 'Download Queue',
  '/history': 'History',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'MusicFinder'

  return (
    <header className="h-12 shrink-0 border-b border-surface-border flex items-center px-6">
      <h1 className="text-sm font-semibold text-zinc-300">{title}</h1>
    </header>
  )
}
