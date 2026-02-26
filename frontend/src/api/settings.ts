import client from './client'

export interface Settings {
  path_template: string
  default_format: string
}

export interface CookieStatus {
  present: boolean
  size_bytes: number | null
  valid: boolean
}

export async function getSettings(): Promise<Settings> {
  const res = await client.get<Settings>('/settings')
  return res.data
}

export async function updateSettings(data: Settings): Promise<Settings> {
  const res = await client.put<Settings>('/settings', data)
  return res.data
}

export async function getCookieStatus(): Promise<CookieStatus> {
  const res = await client.get<CookieStatus>('/cookies/status')
  return res.data
}

export async function uploadCookies(file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  await client.post('/cookies/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
