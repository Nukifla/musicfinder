import client from './client'
import { UnifiedResult } from './search'

export interface RecognizeMatch {
  title: string
  artist: string
  cover_art_url: string | null
}

export interface RecognizeResponse {
  match: RecognizeMatch | null
  results: UnifiedResult[]
}

export async function recognizeAudio(blob: Blob): Promise<RecognizeResponse> {
  const form = new FormData()
  form.append('file', blob, 'clip')
  const res = await client.post<RecognizeResponse>('/recognize', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
