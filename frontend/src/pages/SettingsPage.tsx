import { useEffect, useRef, useState } from 'react'
import SettingsForm from '../components/settings/SettingsForm'
import CookieUpload from '../components/settings/CookieUpload'
import { getSettings, getCookieStatus, Settings, CookieStatus } from '../api/settings'
import { getLibraryStatus, scanLibrary, LibraryStatus } from '../api/library'
import { RefreshCw, Library, Sparkles, Trash2 } from 'lucide-react'
import { useUpdateStore, clearCacheAndReload, CURRENT_BUILD_ID } from '../store/updateStore'

function AppUpdateSection() {
  const { updateAvailable, checking, latestVersion, checkNow } = useUpdateStore()
  const [clearing, setClearing] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  const handleCheck = async () => {
    await checkNow()
    setJustChecked(true)
    setTimeout(() => setJustChecked(false), 2000)
  }

  const handleClear = () => {
    setClearing(true)
    clearCacheAndReload()
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
        <Sparkles size={14} />
        App Updates
      </h2>
      <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm">
            <p className="text-zinc-400">
              Running build <span className="text-zinc-200 font-mono">{CURRENT_BUILD_ID}</span>
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {updateAvailable
                ? `New build available: ${latestVersion?.buildId}`
                : justChecked
                  ? 'You are on the latest version.'
                  : 'Checked automatically every 15 minutes.'}
            </p>
          </div>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex items-center justify-center gap-2 px-3 min-h-touch rounded-lg text-xs font-medium bg-surface-hover border border-surface-border hover:border-accent/50 disabled:opacity-50 transition-colors shrink-0 w-full sm:w-auto"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking…' : 'Check for Updates'}
          </button>
        </div>

        <div className="border-t border-surface-border pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-zinc-500">
            If the app looks stuck on an old version after a new release, clear its cache and reload.
          </p>
          <button
            onClick={handleClear}
            disabled={clearing}
            className={`flex items-center justify-center gap-2 px-3 min-h-touch rounded-lg text-xs font-medium disabled:opacity-50 transition-colors shrink-0 w-full sm:w-auto ${
              updateAvailable
                ? 'bg-accent hover:bg-accent-light'
                : 'bg-surface-hover border border-surface-border hover:border-red-500/50 hover:text-red-400'
            }`}
          >
            <Trash2 size={13} />
            {clearing ? 'Clearing…' : 'Clear Cache & Reload'}
          </button>
        </div>
      </div>
    </section>
  )
}

function LibrarySection() {
  const [status, setStatus] = useState<LibraryStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try { setStatus(await getLibraryStatus()) } catch { /* ignore */ }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (status?.scanning) {
      pollRef.current = setInterval(async () => {
        const s = await getLibraryStatus().catch(() => null)
        if (s) {
          setStatus(s)
          if (!s.scanning && pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        }
      }, 2000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status?.scanning])

  const handleScan = async () => {
    await scanLibrary().catch(() => {})
    await load()
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString()
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
        <Library size={14} />
        Music Library
      </h2>
      <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm">
          <p className="text-zinc-400">
            Last scan: <span className="text-zinc-200">{formatDate(status?.last_scan ?? null)}</span>
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {status?.file_count ?? 0} files indexed
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={status?.scanning}
          className="flex items-center justify-center gap-2 px-3 min-h-touch rounded-lg text-xs font-medium bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 w-full sm:w-auto"
        >
          <RefreshCw size={13} className={status?.scanning ? 'animate-spin' : ''} />
          {status?.scanning ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCookieStatus = async () => {
    try {
      setCookieStatus(await getCookieStatus())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    Promise.all([getSettings(), getCookieStatus()])
      .then(([s, c]) => {
        setSettings(s)
        setCookieStatus(c)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (!settings) return <p className="text-sm text-red-400">Failed to load settings</p>

  return (
    <div className="max-w-2xl flex flex-col gap-8">
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Download Settings</h2>
        <SettingsForm initialSettings={settings} onSaved={setSettings} />
      </section>

      <div className="border-t border-surface-border" />

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">YouTube Cookies</h2>
        <CookieUpload status={cookieStatus} onRefresh={loadCookieStatus} />
      </section>

      <div className="border-t border-surface-border" />

      <LibrarySection />

      <div className="border-t border-surface-border" />

      <AppUpdateSection />
    </div>
  )
}
