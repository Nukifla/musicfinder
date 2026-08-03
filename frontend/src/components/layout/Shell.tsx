import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomTabs from './BottomTabs'
import UpdateBanner from './UpdateBanner'
import { useUpdateWatcher } from '../../hooks/useUpdateWatcher'
import { useGlobalDownloads } from '../../hooks/useGlobalDownloads'

export default function Shell() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useUpdateWatcher()
  useGlobalDownloads()

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <UpdateBanner />
      <div className="flex flex-1 min-h-0 pl-safe-l pr-safe-r">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 md:p-6 pb-[calc(1rem+3.5rem+env(safe-area-inset-bottom))] md:pb-6"
          >
            <Outlet />
          </main>
        </div>
        <BottomTabs />
      </div>
    </div>
  )
}
