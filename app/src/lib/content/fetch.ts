import { errorMessage } from '../format'

export const MANIFEST_URL = 'content/manifest.json'

/** Fetch a data file as text. URLs are relative to the page, like in the manifest. */
export async function fetchText(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal, cache: 'no-store' })
  if (!res.ok) throw Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export type FetchResult = { status: 'ok'; text: string } | { status: 'error'; error: string }

/** Like fetchText but returns load errors instead of throwing (aborts still throw). */
export async function tryFetchText(url: string, signal?: AbortSignal): Promise<FetchResult> {
  try {
    return { status: 'ok', text: await fetchText(url, signal) }
  } catch (e) {
    if (signal?.aborted) throw e
    return { status: 'error', error: errorMessage(e) }
  }
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
