import { useEffect, useState } from 'react'

export type Route =
  | { name: 'index' }
  | { name: 'lesson'; id: string }
  | { name: 'play'; id: string }
  | { name: 'notFound'; hash: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  if (path === '/') return { name: 'index' }
  const m = /^\/lesson\/([a-z0-9-]+)(\/play)?$/.exec(path)
  if (!m) return { name: 'notFound', hash }
  return m[2] ? { name: 'play', id: m[1] } : { name: 'lesson', id: m[1] }
}

export const routes = {
  index: () => '#/',
  lesson: (id: string) => `#/lesson/${id}`,
  play: (id: string) => `#/lesson/${id}/play`,
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo?.(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
