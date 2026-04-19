import client from './client'

export interface UnifiedResult {
  type: string  // "artist" | "release_group" | "recording"
  mbid: string
  name: string
  score: number
  disambiguation?: string | null
  artist?: string | null
  artist_mbid?: string | null
  release_type?: string | null
  year?: number | null
  cover_art_url?: string | null
  album?: string | null
  release_mbid?: string | null
  track_number?: number | null
  duration_ms?: number | null
}

export interface TrackSummary {
  mbid: string
  title: string
  position: number
  duration_ms: number | null
}

export interface ArtistReleaseGroup {
  mbid: string
  title: string
  release_type: string
  year: number | null
  cover_art_url: string | null
}

export interface ArtistDetail {
  mbid: string
  name: string
  disambiguation: string | null
  image_url: string | null
  release_groups: ArtistReleaseGroup[]
}

export interface ReleaseGroupDetail {
  release_mbid: string
  rg_mbid: string
  title: string
  artist: string
  artist_mbid: string | null
  year: number | null
  cover_art_url: string | null
  tracks: TrackSummary[]
}

// Keep for any legacy callers
export type SearchResult = UnifiedResult

export async function search(q: string, signal?: AbortSignal): Promise<UnifiedResult[]> {
  const res = await client.get<UnifiedResult[]>('/search', { params: { q }, signal })
  return res.data
}

export async function searchByType(
  q: string,
  type: 'artist' | 'release_group' | 'recording',
): Promise<UnifiedResult[]> {
  const res = await client.get<UnifiedResult[]>('/search', { params: { q, type } })
  return res.data
}

export async function searchRecordings(q: string): Promise<UnifiedResult[]> {
  return search(q)
}

export async function getArtist(mbid: string): Promise<ArtistDetail> {
  const res = await client.get<ArtistDetail>(`/search/artist/${mbid}`)
  return res.data
}

export async function getReleaseGroup(mbid: string): Promise<ReleaseGroupDetail> {
  const res = await client.get<ReleaseGroupDetail>(`/search/release-group/${mbid}`)
  return res.data
}
