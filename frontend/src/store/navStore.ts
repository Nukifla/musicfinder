import { create } from 'zustand'
import { ArtistDetail, ReleaseGroupDetail } from '../api/search'

interface NavStore {
  lastBrowseRoute: string
  pageTitle: string | null
  artistCache: Record<string, ArtistDetail>
  albumCache: Record<string, ReleaseGroupDetail>
  setLastBrowseRoute: (route: string) => void
  setPageTitle: (title: string | null) => void
  cacheArtist: (mbid: string, data: ArtistDetail) => void
  cacheAlbum: (mbid: string, data: ReleaseGroupDetail) => void
}

export const useNavStore = create<NavStore>((set) => ({
  lastBrowseRoute: '/',
  pageTitle: null,
  artistCache: {},
  albumCache: {},
  setLastBrowseRoute: (route) => set({ lastBrowseRoute: route }),
  setPageTitle: (title) => set({ pageTitle: title }),
  cacheArtist: (mbid, data) =>
    set((s) => ({ artistCache: { ...s.artistCache, [mbid]: data } })),
  cacheAlbum: (mbid, data) =>
    set((s) => ({ albumCache: { ...s.albumCache, [mbid]: data } })),
}))
