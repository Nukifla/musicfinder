import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { uploadCookies, getCookieStatus, CookieStatus } from '../../api/settings'

interface Props {
  status: CookieStatus | null
  onRefresh: () => void
}

export default function CookieUpload({ status, onRefresh }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      await uploadCookies(file)
      onRefresh()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Info size={14} />
        <span>Upload a Netscape-format cookies.txt to enable YouTube Premium audio quality.</span>
      </div>

      {status && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          status.present && status.valid ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-400'
        }`}>
          {status.present && status.valid ? (
            <><CheckCircle size={14} /> Cookie file present and valid ({status.size_bytes ? `${Math.round(status.size_bytes / 1024)} KB` : ''})</>
          ) : status.present ? (
            <><AlertCircle size={14} /> Cookie file present but invalid</>
          ) : (
            <><AlertCircle size={14} /> No cookie file uploaded</>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-hover text-sm text-zinc-300 hover:text-zinc-100 hover:border-accent/50 disabled:opacity-50 transition-colors w-fit"
      >
        <Upload size={14} />
        {uploading ? 'Uploading…' : 'Upload cookies.txt'}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
