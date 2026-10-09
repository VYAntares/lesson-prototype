import { useCallback, useEffect, useState } from 'react'
import { manifestSchema, type Course, type Manifest } from '../../schemas/manifest'
import { outlineSchema, type Outline } from '../../schemas/outline'
import { errorMessage } from '../format'
import { fetchText, MANIFEST_URL } from './fetch'

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

async function loadManifest(signal?: AbortSignal): Promise<Manifest> {
  const parsed = manifestSchema.safeParse(JSON.parse(await fetchText(MANIFEST_URL, signal)))
  if (!parsed.success) throw Error(parsed.error.issues[0]?.message ?? 'invalid manifest')
  return parsed.data
}

async function loadOutline(course: Course, signal?: AbortSignal): Promise<Outline> {
  const parsed = outlineSchema.safeParse(JSON.parse(await fetchText(course.outlineUrl, signal)))
  if (!parsed.success) throw Error(parsed.error.issues[0]?.message ?? 'invalid outline')
  return parsed.data
}

export function useManifest() {
  const [state, setState] = useState<LoadState<Manifest>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    loadManifest(controller.signal).then(
      (data) => setState({ status: 'ready', data }),
      (e) => !controller.signal.aborted && setState({ status: 'error', error: errorMessage(e) }),
    )
    return () => controller.abort()
  }, [attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}

/** Outlines are cached per course and outline hash for the whole session. */
const outlineCache = new Map<string, Promise<Outline>>()

export function useOutline(course: Course | undefined) {
  const [state, setState] = useState<{ key?: string; value: LoadState<Outline> }>({
    value: { status: 'loading' },
  })
  const [attempt, setAttempt] = useState(0)
  const key = course ? `${course.key}:${course.sourceHash}` : undefined

  useEffect(() => {
    if (!course || !key) return
    let active = true
    let promise = outlineCache.get(key)
    if (!promise) {
      promise = loadOutline(course)
      outlineCache.set(key, promise)
      promise.catch(() => outlineCache.delete(key))
    }
    setState({ key, value: { status: 'loading' } })
    promise.then(
      (data) => active && setState({ key, value: { status: 'ready', data } }),
      (e) => active && setState({ key, value: { status: 'error', error: errorMessage(e) } }),
    )
    return () => {
      active = false
    }
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...(state.key === key ? state.value : { status: 'loading' as const }), retry }
}
