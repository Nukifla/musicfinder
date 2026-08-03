import { Link, NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS, isBrowseRoute } from './navItems'
import { useActiveJobCount } from '../../hooks/useActiveJobCount'
import { useNavStore } from '../../store/navStore'

const baseClass = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors'
const activeClass = 'bg-accent text-white'
const inactiveClass = 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover'

export default function Sidebar() {
  const location = useLocation()
  const activeCount = useActiveJobCount()
  const lastBrowseRoute = useNavStore((s) => s.lastBrowseRoute)
  const browseActive = isBrowseRoute(location.pathname)

  return (
    <aside className="hidden md:flex w-56 shrink-0 bg-surface-card border-r border-surface-border flex-col py-4 select-none">
      <div className="px-4 mb-6 flex items-center gap-2">
        <span className="text-xl font-bold text-accent-light tracking-tight">MusicFinder</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          if (to === '/') {
            const searchTo = browseActive ? '/' : lastBrowseRoute || '/'
            return (
              <Link key={to} to={searchTo} className={`${baseClass} ${browseActive ? activeClass : inactiveClass}`}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            )
          }
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {label === 'Queue' && activeCount > 0 && (
                <span className="ml-auto bg-accent-light text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {activeCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
