import { useEffect, useState } from 'react'
import SettingsForm from '../components/settings/SettingsForm'
import CookieUpload from '../components/settings/CookieUpload'
import { getSettings, getCookieStatus, Settings, CookieStatus } from '../api/settings'

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
    </div>
  )
}
