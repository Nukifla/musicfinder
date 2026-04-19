import { create } from 'zustand'
import { UnifiedResult } from '../api/search'

interface SearchStore {
  query: string
  results: UnifiedResult[]
  setQuery: (q: string) => void
  setResults: (r: UnifiedResult[]) => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  results: [],
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
}))
