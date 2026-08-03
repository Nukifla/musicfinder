import { Search, ListMusic, History, Settings, LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: Search, label: 'Search' },
  { to: '/queue', icon: ListMusic, label: 'Queue' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function isBrowseRoute(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/artist/') || pathname.startsWith('/album/')
}
