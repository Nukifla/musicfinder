import { useNavigate, useLocation, NavLink } from 'react-router-dom'
import { Search, ListVideo, History, Settings } from 'lucide-react'
import { useQueueStore } from '../../store/queueStore'

export default function Sidebar() {
  const jobs = useQueueStore((s) => s.jobs)
  const activeCount = Object.values(jobs).filter(
    (j) => j.status !== 'complete' && j.status !== 'error'
  ).length
  const navigate = useNavigate()
  const location = useLocation()

  const isBrowseActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/artist/') ||
    location.pathname.startsWith('/album/')

  const baseClass = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors'
  const activeClass = 'bg-accent text-white'
  const inactiveClass = 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover'

  return (
    <aside className="w-56 shrink-0 bg-surface-card border-r border-surface-border flex flex-col py-4">
      <div className="px-4 mb-6 flex items-center gap-2">
        <span className="text-xl font-bold text-accent-light tracking-tight">MusicFinder</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        <button
          onClick={() => {
            if (location.pathname === '/') return
            const isBrowse =
              location.pathname.startsWith('/artist/') ||
              location.pathname.startsWith('/album/')
            if (isBrowse) navigate('/')
            else navigate(-1)
          }}
          className={`${baseClass} ${isBrowseActive ? activeClass : inactiveClass}`}
        >
          <Search size={16} />
          <span>Search</span>
        </button>

        {[
          { to: '/queue', icon: ListVideo, label: 'Queue' },
          { to: '/history', icon: History, label: 'History' },
          { to: '/settings', icon: Settings, label: 'Settings' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${baseClass} ${isActive ? activeClass : inactiveClass}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            {label === 'Queue' && activeCount > 0 && (
              <span className="ml-auto bg-accent-light text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
