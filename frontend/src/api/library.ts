import client from './client'

export interface LibraryStatus {
  last_scan: string | null
  file_count: number
  scanning: boolean
}

export async function checkLibrary(
  tracks: { mbid: string; title: string; artist: string }[],
): Promise<Set<string>> {
  if (!tracks.length) return new Set()
  const res = await client.post<{ matched: string[] }>('/library/check', { tracks })
  return new Set(res.data.matched)
}

export async function scanLibrary(): Promise<void> {
  await client.post('/library/scan')
}

export async function getLibraryStatus(): Promise<LibraryStatus> {
  const res = await client.get<LibraryStatus>('/library/status')
  return res.data
}
