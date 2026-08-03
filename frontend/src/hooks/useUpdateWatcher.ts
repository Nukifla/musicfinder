import { useEffect } from 'react'
import { useUpdateStore } from '../store/updateStore'

const CHECK_INTERVAL_MS = 15 * 60 * 1000

/** Mount once for the whole app (in Shell). Polls /version.json periodically
 * and whenever the tab/app regains visibility — the moment a backgrounded
 * standalone PWA is most likely to have missed a deploy. */
export function useUpdateWatcher() {
  const checkNow = useUpdateStore((s) => s.checkNow)

  useEffect(() => {
    checkNow()
    const interval = setInterval(checkNow, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkNow])
}
