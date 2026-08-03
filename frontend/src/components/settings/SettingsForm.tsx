import { useState } from 'react'
import { Save } from 'lucide-react'
import { Settings, updateSettings } from '../../api/settings'

interface Props {
  initialSettings: Settings
  onSaved: (s: Settings) => void
}

export default function SettingsForm({ initialSettings, onSaved }: Props) {
  const [form, setForm] = useState<Settings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateSettings(form)
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">Path Template</label>
        <input
          type="text"
          value={form.path_template}
          onChange={(e) => setForm({ ...form, path_template: e.target.value })}
          className="bg-surface-card border border-surface-border rounded-lg px-3 min-h-touch py-2.5 text-base md:text-sm text-zinc-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
        />
        <p className="text-xs text-zinc-600">
          Variables: {'{artist}'}, {'{album}'}, {'{title}'}, {'{track}'}, {'{year}'}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">Audio Format Selector</label>
        <input
          type="text"
          value={form.default_format}
          onChange={(e) => setForm({ ...form, default_format: e.target.value })}
          className="bg-surface-card border border-surface-border rounded-lg px-3 min-h-touch py-2.5 text-base md:text-sm text-zinc-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
        />
        <p className="text-xs text-zinc-600">yt-dlp format selector. Files are not transcoded — you get Opus or AAC as YouTube provides.</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={form.search_artist_images}
        onClick={() => setForm({ ...form, search_artist_images: !form.search_artist_images })}
        className="flex items-start gap-3 min-h-touch py-2 -my-2 text-left active:bg-surface-hover rounded-lg transition-colors"
      >
        <span
          className={`relative shrink-0 mt-1 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
            form.search_artist_images ? 'bg-accent' : 'bg-zinc-700'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            form.search_artist_images ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </span>
        <span>
          <p className="text-sm text-zinc-200">Show artist photos in search results</p>
          <p className="text-xs text-zinc-600 mt-0.5">Fetches from Wikidata — adds ~1s to cold searches</p>
        </span>
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 px-5 min-h-touch rounded-lg bg-accent hover:bg-accent-light disabled:opacity-50 text-sm font-medium transition-colors w-full sm:w-auto"
      >
        <Save size={14} />
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </form>
  )
}
