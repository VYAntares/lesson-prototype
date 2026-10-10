// Known words. An exercise may only use words the learner knows: the base words of the course
// language, the words introduced by earlier lessons of the outline, and the lesson's own
// `introduces`, `glossary` and `names`. This is what prevents hidden prerequisites
// ("___ soleil" asked to a beginner who never saw "soleil").

import type { OutlineEntry } from '../schemas/outline'
import type { Locale } from './base'
import type { Brief, LexEntry } from './brief'
import { normalizeAnswer } from './normalize'

/**
 * Grammatical words a sentence cannot do without, allowed from the first lesson without being
 * taught. They can still be what a lesson teaches (articles, pronouns): this list only says they
 * may appear. Keep it short: every other word must be introduced by a lesson.
 */
export const BASE_WORDS: Record<Locale, readonly string[]> = {
  fr: [
    // articles and contractions
    'le', 'la', "l'", 'les', 'un', 'une', 'des', 'du', 'de', "d'", 'au', 'aux',
    // subject pronouns and demonstratives
    'je', "j'", 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ce', "c'", 'ça',
    // prepositions and conjunctions
    'à', 'en', 'dans', 'sur', 'avec', 'pour', 'et', 'ou', 'mais',
    // negation, yes and no, relatives
    'ne', "n'", 'pas', 'oui', 'non', 'qui', 'que', "qu'",
    // a-t-il
    't',
  ],
  en: [
    'the', 'a', 'an', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that',
    'in', 'on', 'at', 'to', 'of', 'with', 'for', 'and', 'or', 'but', 'not', 'yes', 'no',
  ],
  de: [
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'in', 'an', 'auf', 'mit', 'für', 'und',
    'oder', 'aber', 'nicht', 'ja', 'nein',
  ],
}

/** Word tokens of a text, lowercased; elisions and hyphens are kept for `isKnown` to split. */
export function wordTokens(text: string): string[] {
  return normalizeAnswer(text).match(/[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*'?/gu) ?? []
}

export type KnownWords = {
  forms: Set<string>
  /** False when an earlier lesson has no brief yet: unknown words are then only warnings. */
  complete: boolean
  /** Earlier lessons whose brief is missing. */
  missing: string[]
}

function addForms(set: Set<string>, forms: string[]) {
  for (const form of forms) {
    const n = normalizeAnswer(form)
    set.add(n)
    for (const t of wordTokens(n)) set.add(t)
  }
}

export function entryForms(entries: LexEntry[]) {
  return entries.flatMap((e) => [e.term, ...e.forms])
}

/** Words known when lesson `id` starts: base words and every earlier lesson's `introduces`. */
export function knownBefore(
  lang: Locale,
  outline: OutlineEntry[],
  briefs: ReadonlyMap<string, Pick<Brief, 'introduces'>>,
  id: string,
): KnownWords {
  const forms = new Set<string>()
  addForms(forms, [...BASE_WORDS[lang]])
  const missing: string[] = []
  for (const entry of outline) {
    if (entry.id === id) break
    const brief = briefs.get(entry.id)
    if (brief) addForms(forms, entryForms(brief.introduces))
    else missing.push(entry.id)
  }
  return { forms, complete: missing.length === 0, missing }
}

/** Known words plus the lesson's own words and names. */
export function withLesson(known: KnownWords, brief: Pick<Brief, 'introduces' | 'glossary' | 'names'>): KnownWords {
  const forms = new Set(known.forms)
  addForms(forms, [...entryForms(brief.introduces), ...entryForms(brief.glossary), ...brief.names])
  return { ...known, forms }
}

/** "j'habite" is known when "j'habite" is, or both "j'" and "habite"; "est-ce" when "est" and "ce" are. */
export function isKnown(token: string, forms: Set<string>): boolean {
  if (forms.has(token)) return true
  const elision = /^([\p{L}]+')(.+)$/u.exec(token)
  if (elision) return forms.has(elision[1]) && isKnown(elision[2], forms)
  if (token.includes('-')) return token.split('-').every((part) => forms.has(part))
  return false
}

/** Tokens of `text` that are not known. */
export function unknownWords(text: string, forms: Set<string>): string[] {
  return wordTokens(text).filter((t) => !isKnown(t, forms))
}
