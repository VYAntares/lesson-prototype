import type { ReactNode } from 'react'

/** Marks text that is in another language than the interface. */
export function Lang({ lang, children }: { lang: string; children: ReactNode }) {
  return <span lang={lang}>{children}</span>
}
