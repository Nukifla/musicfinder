import { Link, NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS, isBrowseRoute } from './navItems'
import { useActiveJobCount } from '../../hooks/useActiveJobCount'
import { useNavStore } from '../../store/navStore'

const itemClass = (active: boolean) =>
  `relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-touch active:bg-surface-hover transition-colors ${
    active ? 'text-accent-light' : 'text-zinc-500'
  }`

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-light text-white text-[10px] font-semibold leading-[18px] text-center ring-2 ring-surface-card">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function BottomTabs() {
  const location = useLocation()
  const activeCount = useActiveJobCount()
  const lastBrowseRoute = useNavStore((s) => s.lastBrowseRoute)
  const browseActive = isBrowseRoute(location.pathname)

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 select-none
                 bg-surface-card/95 backdrop-blur border-t border-surface-border
                 pb-safe-b pl-safe-l pr-safe-r [-webkit-touch-callout:none]"
    >
      <div className="flex h-14">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          if (to === '/') {
            const searchTo = browseActive ? '/' : lastBrowseRoute || '/'
            return (
              <Link key={to} to={searchTo} aria-label={label} className={itemClass(browseActive)}>
                <Icon size={22} strokeWidth={browseActive ? 2.25 : 1.75} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            )
          }
          return (
            <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => itemClass(isActive)}>
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                    {label === 'Queue' && <Badge count={activeCount} />}
                  </span>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
