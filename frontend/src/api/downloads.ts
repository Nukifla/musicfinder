import client from './client'

export interface DownloadRecord {
  id: number
  job_id: string
  mbid: string | null
  release_mbid: string | null
  title: string
  artist: string
  album: string | null
  track_number: number | null
  duration_ms: number | null
  year: number | null
  status: string
  file_path: string | null
  file_format: string | null
  file_size: number | null
  youtube_url: string | null
  error_msg: string | null
  created_at: string
  completed_at: string | null
}

export interface DownloadResponse {
  job_id: string
  title: string
  artist: string
  album: string | null
}

export async function startDownload(mbid: string, release_mbid?: string | null): Promise<DownloadResponse> {
  const res = await client.post<DownloadResponse>('/downloads', { mbid, release_mbid })
  return res.data
}

export async function listDownloads(limit = 50, offset = 0): Promise<DownloadRecord[]> {
  const res = await client.get<DownloadRecord[]>('/downloads', { params: { limit, offset } })
  return res.data
}

export async function deleteDownload(id: number): Promise<void> {
  await client.delete(`/downloads/${id}`)
}
