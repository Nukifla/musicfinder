import { create } from 'zustand'
import { ArtistDetail, ReleaseGroupDetail } from '../api/search'

interface NavStore {
  lastBrowseRoute: string
  artistCache: Record<string, ArtistDetail>
  albumCache: Record<string, ReleaseGroupDetail>
  setLastBrowseRoute: (route: string) => void
  cacheArtist: (mbid: string, data: ArtistDetail) => void
  cacheAlbum: (mbid: string, data: ReleaseGroupDetail) => void
}

export const useNavStore = create<NavStore>((set) => ({
  lastBrowseRoute: '/',
  artistCache: {},
  albumCache: {},
  setLastBrowseRoute: (route) => set({ lastBrowseRoute: route }),
  cacheArtist: (mbid, data) =>
    set((s) => ({ artistCache: { ...s.artistCache, [mbid]: data } })),
  cacheAlbum: (mbid, data) =>
    set((s) => ({ albumCache: { ...s.albumCache, [mbid]: data } })),
}))
