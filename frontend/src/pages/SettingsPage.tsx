import { useEffect, useRef, useState } from 'react'
import SettingsForm from '../components/settings/SettingsForm'
import CookieUpload from '../components/settings/CookieUpload'
import { getSettings, getCookieStatus, Settings, CookieStatus } from '../api/settings'
import { getLibraryStatus, scanLibrary, LibraryStatus } from '../api/library'
import { RefreshCw, Library } from 'lucide-react'

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
      <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
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
    </div>
  )
}
