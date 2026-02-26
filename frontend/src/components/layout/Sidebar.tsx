import { NavLink } from 'react-router-dom'
import { Search, ListVideo, History, Settings } from 'lucide-react'
import { useQueueStore } from '../../store/queueStore'

const links = [
  { to: '/', icon: Search, label: 'Search' },
  { to: '/queue', icon: ListVideo, label: 'Queue' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const jobs = useQueueStore((s) => s.jobs)
  const activeCount = Object.values(jobs).filter(
    (j) => j.status !== 'complete' && j.status !== 'error'
  ).length

  return (
    <aside className="w-56 shrink-0 bg-surface-card border-r border-surface-border flex flex-col py-4">
      <div className="px-4 mb-6 flex items-center gap-2">
        <span className="text-xl font-bold text-accent-light tracking-tight">MusicFinder</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover'
              }`
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
