import { mockApi } from './mock'
import type {
  SearchRequest,
  SearchStartResponse,
  SearchStatus,
  UnderstandRequest,
  UnderstandResponse,
} from './types'

// The three backend calls the UI makes. Both the real HTTP client and the
// mock implement this, so the rest of the app doesn't care which one it gets.
export interface Api {
  understand(req: UnderstandRequest): Promise<UnderstandResponse>
  startSearch(req: SearchRequest): Promise<SearchStartResponse>
  searchStatus(jobId: string): Promise<SearchStatus>
}

// Small fetch wrapper: prefixes /api, sends JSON, throws on non-2xx.
// In dev, Vite proxies /api/* to the backend on localhost:8000 (see vite.config.ts).
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`)
  return res.json() as Promise<T>
}

const httpApi: Api = {
  understand: (req) => request('/understand', { method: 'POST', body: JSON.stringify(req) }),
  startSearch: (req) => request('/search', { method: 'POST', body: JSON.stringify(req) }),
  searchStatus: (jobId) => request(`/search/${encodeURIComponent(jobId)}`),
}

// Pick real vs. mock backend from .env.local. Defaults to the mock unless
// VITE_USE_MOCK is explicitly "false". Restart `npm run dev` after changing it.
export const api: Api = import.meta.env.VITE_USE_MOCK === 'false' ? httpApi : mockApi

// Polls a search job until it finishes, reporting progress as batches return.
// Flow: POST /api/search → job_id, then GET /api/search/{job_id} every
// `intervalMs` until status is "done" (return result) or "error" (throw).
export async function runSearch(
  req: SearchRequest,
  onProgress: (scanned: number, total: number) => void,
  intervalMs = 400,
) {
  const { job_id } = await api.startSearch(req)
  for (;;) {
    const s = await api.searchStatus(job_id)
    onProgress(s.scanned, s.total)
    if (s.status === 'done' && s.result) return s.result
    if (s.status === 'error') throw new Error(s.error ?? 'Search failed')
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}
