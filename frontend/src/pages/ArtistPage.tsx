import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtist, getReleaseGroup, ArtistDetail, ArtistReleaseGroup } from '../api/search'
import { useDownload } from '../hooks/useDownload'
import { useNavStore } from '../store/navStore'
import { checkLibrary } from '../api/library'
import AlbumArt from '../components/search/AlbumArt'
import { ChevronLeft, User, Download, Loader2, CheckCircle2, Clock } from 'lucide-react'

const TYPE_ORDER = ['Album', 'EP', 'Single', 'Other']

function ArtistAvatar({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shrink-0 ring-2 ring-surface-border"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-surface-hover flex items-center justify-center shrink-0 ring-2 ring-surface-border">
      <User size={28} className="text-accent-light" />
    </div>
  )
}

export default function ArtistPage() {
  const { mbid } = useParams<{ mbid: string }>()
  const navigate = useNavigate()
  const [artist, setArtist] = useState<ArtistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingRg, setDownloadingRg] = useState<string | null>(null)
  const [downloadingType, setDownloadingType] = useState<string | null>(null)
  const [downloadedRgMbids, setDownloadedRgMbids] = useState<Set<string>>(new Set())
  const [checkedRgMbids, setCheckedRgMbids] = useState<Set<string>>(new Set())
  const [scanningMbid, setScanningMbid] = useState<string | null>(null)
  const { download } = useDownload()
  const { setLastBrowseRoute, setPageTitle, artistCache, albumCache, cacheArtist, cacheAlbum } = useNavStore()

  useEffect(() => {
    if (artist) setPageTitle(artist.name)
    return () => setPageTitle(null)
  }, [artist])

  useEffect(() => {
    if (!mbid) return
    setLastBrowseRoute(`/artist/${mbid}`)
    const cached = artistCache[mbid]
    if (cached) {
      setArtist(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    getArtist(mbid)
      .then((data) => { cacheArtist(mbid, data); setArtist(data) })
      .catch(() => setError('Failed to load artist.'))
      .finally(() => setLoading(false))
  }, [mbid])

  // Check which cached albums are fully downloaded
  useEffect(() => {
    if (!artist) return
    const toCheck: { rgMbid: string; tracks: { mbid: string; title: string; artist: string }[] }[] = []
    for (const rg of artist.release_groups) {
      const cached = albumCache[rg.mbid]
      if (cached) {
        toCheck.push({
          rgMbid: rg.mbid,
          tracks: cached.tracks.map((t) => ({ mbid: t.mbid, title: t.title, artist: cached.artist })),
        })
      }
    }
    if (!toCheck.length) return
    const allTracks = toCheck.flatMap((x) => x.tracks)
    checkLibrary(allTracks).then((downloaded) => {
      const fully = new Set<string>()
      for (const { rgMbid, tracks } of toCheck) {
        if (tracks.length > 0 && tracks.every((t) => downloaded.has(t.mbid))) fully.add(rgMbid)
      }
      setDownloadedRgMbids(fully)
      setCheckedRgMbids(new Set(toCheck.map((x) => x.rgMbid)))
    }).catch(() => {})
  }, [artist, albumCache])

  // Prefetch album tracklists in the background so clicking an album loads instantly
  useEffect(() => {
    if (!artist) return
    const uncached = artist.release_groups.filter(rg => !albumCache[rg.mbid])
    if (uncached.length === 0) return

    let cancelled = false
    ;(async () => {
      await new Promise(r => setTimeout(r, 500))
      for (const rg of uncached) {
        if (cancelled || albumCache[rg.mbid]) continue
        setScanningMbid(rg.mbid)
        try {
          const data = await getReleaseGroup(rg.mbid)
          if (!cancelled) cacheAlbum(rg.mbid, data)
        } catch { /* non-critical */ }
        if (!cancelled) await new Promise(r => setTimeout(r, 300))
      }
      if (!cancelled) setScanningMbid(null)
    })()

    return () => { cancelled = true; setScanningMbid(null) }
  }, [artist])

  const handleDownloadAlbum = async (e: React.MouseEvent, rg: ArtistReleaseGroup) => {
    e.stopPropagation()
    if (downloadingRg) return
    setDownloadingRg(rg.mbid)
    try {
      const detail = await getReleaseGroup(rg.mbid)
      cacheAlbum(rg.mbid, detail)
      const downloaded = await checkLibrary(
        detail.tracks.map((t) => ({ mbid: t.mbid, title: t.title, artist: detail.artist }))
      )
      const missing = detail.tracks.filter((t) => !downloaded.has(t.mbid))
      if (missing.length === 0) {
        setDownloadedRgMbids((prev) => new Set([...prev, rg.mbid]))
      } else {
        await Promise.all(
          missing.map((track) =>
            download(track.mbid, track.title, detail.artist, detail.title, detail.release_mbid),
          ),
        )
      }
    } catch {
      // noop
    } finally {
      setDownloadingRg(null)
    }
  }

  const handleDownloadAll = async (type: string, items: ArtistReleaseGroup[]) => {
    if (downloadingType) return
    setDownloadingType(type)
    try {
      for (const rg of items) {
        const detail = await getReleaseGroup(rg.mbid)
        cacheAlbum(rg.mbid, detail)
        const downloaded = await checkLibrary(
          detail.tracks.map((t) => ({ mbid: t.mbid, title: t.title, artist: detail.artist }))
        )
        const missing = detail.tracks.filter((t) => !downloaded.has(t.mbid))
        if (missing.length === 0) {
          setDownloadedRgMbids((prev) => new Set([...prev, rg.mbid]))
          continue
        }
        await Promise.all(
          missing.map((track) =>
            download(track.mbid, track.title, detail.artist, detail.title, detail.release_mbid),
          ),
        )
      }
    } catch {
      // noop
    } finally {
      setDownloadingType(null)
    }
  }

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
        onClick={() => navigate('/')}
        className="hidden md:flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <div className="flex items-center gap-4 sm:gap-5 mb-2">
        <ArtistAvatar url={artist.image_url} name={artist.name} />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 break-words">{artist.name}</h1>
          {artist.disambiguation && (
            <p className="text-sm text-zinc-500 mt-0.5 truncate">{artist.disambiguation}</p>
          )}
        </div>
      </div>

      {TYPE_ORDER.map((type) => {
        const items = grouped[type]
        if (!items?.length) return null
        return (
          <section key={type} className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {type === 'EP' ? 'EPs' : type === 'Other' ? 'Other Releases' : `${type}s`}
              </h2>
              {(type === 'Album' || type === 'Single') && (
                <button
                  onClick={() => handleDownloadAll(type, items)}
                  disabled={!!downloadingType}
                  className="flex items-center gap-1.5 min-h-touch px-3 -mr-3 rounded-lg text-xs text-zinc-400 active:bg-surface-hover hover:text-zinc-100 disabled:opacity-50 transition-colors"
                  aria-label={`Download all ${type.toLowerCase()}s`}
                >
                  {downloadingType === type
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Download size={12} />}
                  Download all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {items.map((rg) => {
                const isDownloaded = downloadedRgMbids.has(rg.mbid)
                return (
                  <div
                    key={rg.mbid}
                    onClick={() => navigate(`/album/${rg.mbid}`)}
                    className="cursor-pointer group"
                  >
                    <div className="relative rounded-lg overflow-hidden w-full">
                      <AlbumArt fill url={rg.cover_art_url} title={rg.title} />
                      {scanningMbid === rg.mbid ? (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-1 rounded-md bg-black/70 text-zinc-300 text-[10px] font-medium">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Scanning</span>
                        </div>
                      ) : !checkedRgMbids.has(rg.mbid) && !isDownloaded ? (
                        <div
                          className="hidden md:flex absolute top-2 left-2 items-center gap-1 px-1.5 py-1 rounded-md bg-black/50 text-zinc-500"
                          title="Not scanned yet"
                        >
                          <Clock size={12} />
                        </div>
                      ) : null}
                      <button
                        onClick={(e) => handleDownloadAlbum(e, rg)}
                        disabled={downloadingRg === rg.mbid}
                        aria-label={isDownloaded ? 'Already downloaded' : 'Download album'}
                        className={`hidden md:flex absolute bottom-2 right-2 h-11 w-11 items-center justify-center rounded-lg transition-opacity disabled:opacity-60 focus-visible:opacity-100 md:group-focus-within:opacity-100 ${
                          isDownloaded
                            ? 'opacity-100 bg-green-900/80 text-green-400 hover:bg-green-900'
                            : 'opacity-0 md:group-hover:opacity-100 bg-black/70 text-white hover:bg-accent'
                        }`}
                      >
                        {downloadingRg === rg.mbid
                          ? <Loader2 size={16} className="animate-spin" />
                          : isDownloaded
                            ? <CheckCircle2 size={16} />
                            : <Download size={16} />}
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                      {rg.title}
                    </p>
                    {rg.year && (
                      <p className="text-xs text-zinc-500">{rg.year}</p>
                    )}
                    <button
                      onClick={(e) => handleDownloadAlbum(e, rg)}
                      disabled={downloadingRg === rg.mbid}
                      className={`md:hidden mt-2 w-full flex items-center justify-center gap-1.5 min-h-touch rounded-lg text-xs font-medium disabled:opacity-50 transition-colors ${
                        isDownloaded
                          ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                          : 'bg-accent active:bg-accent-light'
                      }`}
                    >
                      {downloadingRg === rg.mbid
                        ? <Loader2 size={13} className="animate-spin" />
                        : isDownloaded
                          ? <CheckCircle2 size={13} />
                          : <Download size={13} />}
                      {downloadingRg === rg.mbid ? 'Adding…' : isDownloaded ? 'Downloaded' : 'Download'}
                    </button>
                  </div>
                )
              })}
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
