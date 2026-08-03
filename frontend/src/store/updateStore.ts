import { create } from 'zustand'

export interface VersionInfo {
  buildId: string
  builtAt: string
}

export const CURRENT_BUILD_ID = __APP_BUILD_ID__

interface UpdateStore {
  updateAvailable: boolean
  checking: boolean
  latestVersion: VersionInfo | null
  lastCheckedAt: number | null
  checkNow: () => Promise<void>
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  updateAvailable: false,
  checking: false,
  latestVersion: null,
  lastCheckedAt: null,
  checkNow: async () => {
    if (get().checking) return
    set({ checking: true })
    try {
      const res = await fetch('/version.json', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as VersionInfo
        set({
          latestVersion: data,
          updateAvailable: !!data.buildId && data.buildId !== CURRENT_BUILD_ID,
        })
      }
    } catch {
      // offline, or /version.json doesn't exist (vite dev server) — ignore
    } finally {
      set({ checking: false, lastCheckedAt: Date.now() })
    }
  },
}))

/** Unregisters the service worker, wipes Cache Storage, and force-reloads.
 * This is the "update the app" escape hatch — safe to call at any time,
 * whether or not a new version was actually detected. */
export async function clearCacheAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } finally {
    window.location.href = `${window.location.pathname}?_=${Date.now()}`
  }
}
