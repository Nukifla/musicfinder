import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtist, ArtistDetail, ArtistReleaseGroup } from '../api/search'
import AlbumArt from '../components/search/AlbumArt'
import { ChevronLeft } from 'lucide-react'

const TYPE_ORDER = ['Album', 'EP', 'Single', 'Other']

export default function ArtistPage() {
  const { mbid } = useParams<{ mbid: string }>()
  const navigate = useNavigate()
  const [artist, setArtist] = useState<ArtistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mbid) return
    setLoading(true)
    getArtist(mbid)
      .then(setArtist)
      .catch(() => setError('Failed to load artist.'))
      .finally(() => setLoading(false))
  }, [mbid])

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-zinc-500 text-sm mt-8">Loading…</p>
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="max-w-4xl">
        <p className="text-red-400 text-sm mt-8">{error ?? 'Artist not found.'}</p>
      </div>
    )
  }

  const grouped: Record<string, ArtistReleaseGroup[]> = {}
  for (const rg of artist.release_groups) {
    const key = TYPE_ORDER.includes(rg.release_type) ? rg.release_type : 'Other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(rg)
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-zinc-100">{artist.name}</h1>
      {artist.disambiguation && (
        <p className="text-sm text-zinc-500 mt-1">{artist.disambiguation}</p>
      )}

      {TYPE_ORDER.map((type) => {
        const items = grouped[type]
        if (!items?.length) return null
        return (
          <section key={type} className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              {type === 'EP' ? 'EPs' : type === 'Other' ? 'Other Releases' : `${type}s`}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((rg) => (
                <div
                  key={rg.mbid}
                  onClick={() => navigate(`/album/${rg.mbid}`)}
                  className="cursor-pointer group"
                >
                  <div className="rounded-lg overflow-hidden">
                    <AlbumArt url={rg.cover_art_url} title={rg.title} size={160} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                    {rg.title}
                  </p>
                  {rg.year && (
                    <p className="text-xs text-zinc-500">{rg.year}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {artist.release_groups.length === 0 && (
        <p className="text-sm text-zinc-500 mt-8">No releases found.</p>
      )}
    </div>
  )
}
