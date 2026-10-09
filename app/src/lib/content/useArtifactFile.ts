import { useEffect, useState } from 'react'
import type { ArtifactRef } from '../../schemas/manifest'
import { tryFetchText, type FetchResult } from './fetch'

export type LoadedFile =
  | { status: 'absent' }
  | { status: 'loading' }
  | { status: 'loadError'; error: string }
  | { status: 'parseError'; error: string; text: string }
  | { status: 'parsed'; data: unknown }

function parse(result: FetchResult): LoadedFile {
  if (result.status === 'error') return { status: 'loadError', error: result.error }
  try {
    return { status: 'parsed', data: JSON.parse(result.text) }
  } catch (e) {
    return { status: 'parseError', error: (e as Error).message, text: result.text }
  }
}

/** Loads and JSON-parses a brief or content file, keeping malformed text for display. */
export function useArtifactFile(ref: ArtifactRef | undefined): LoadedFile {
  const [state, setState] = useState<LoadedFile>(ref ? { status: 'loading' } : { status: 'absent' })
  const url = ref?.url
  useEffect(() => {
    if (!url) {
      setState({ status: 'absent' })
      return
    }
    const controller = new AbortController()
    setState({ status: 'loading' })
    tryFetchText(url, controller.signal).then(
      (r) => setState(parse(r)),
      () => undefined,
    )
    return () => controller.abort()
  }, [url])
  return state
}
