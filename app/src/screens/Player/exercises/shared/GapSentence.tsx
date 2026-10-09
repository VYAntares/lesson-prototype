import type { ReactNode } from 'react'

/** Sentence with a gap; punctuation right after the gap is not preceded by a space. */
export function GapSentence({ before, after, lang, children }: { before?: string; after?: string; lang: string; children: ReactNode }) {
  return (
    <p className="gap-sentence" lang={lang}>
      {before} {children}
      {after && /^[,.]/.test(after) ? after : ` ${after ?? ''}`}
    </p>
  )
}
