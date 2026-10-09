// Checking typed answers: normalisation, accent tolerance and article hints.

import type { AcceptedAnswers } from '../../schemas/common'

export type Outcome = 'fully_correct' | 'orthography_only' | 'incorrect' | 'unanswered'

/** Unify apostrophes and spaces (incl. no-break and figure spaces), trim. */
export function normalizeAnswer(text: string) {
  return text
    .normalize('NFC')
    .replace(/[‘’ʼ′`´]/g, "'")
    .replace(/[\s   ]+/g, ' ')
    .trim()
}

function stripMarks(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

/** Lower case without accents. */
function looseForm(text: string) {
  return stripMarks(text.toLowerCase())
}

/** Like looseForm, but œ/æ/ä/ö/ü may also be typed as oe/ae/ae/oe/ue. */
function transliteratedForm(text: string) {
  return stripMarks(
    text
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue'),
  )
}

const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu

/** True when a word whose accent changes the meaning (e.g. "où" vs "ou") was typed without it. */
function missesMeaningfulAccent(response: string, expected: string, sensitive: Set<string>) {
  if (sensitive.size === 0) return false
  const expectedWords = expected.split(' ')
  const responseWords = response.split(' ')
  return (
    expectedWords.length === responseWords.length &&
    expectedWords.some((word, i) => {
      const w = word.replace(EDGE_PUNCTUATION, '').toLowerCase()
      return sensitive.has(w) && responseWords[i].replace(EDGE_PUNCTUATION, '').toLowerCase() !== w
    })
  )
}

export type TypedAnswerCheck = { response: string; expected: string; outcome: Outcome; credit: number }

/**
 * Exact match (after normalisation) earns full credit; a match that only differs in
 * accents or case earns half credit ("almost"), unless the accent changes the meaning.
 */
export function checkTypedAnswer(response: string, accepted: AcceptedAnswers): TypedAnswerCheck {
  const typed = normalizeAnswer(response)
  const answers = accepted.answers.map(normalizeAnswer)
  const base = { response, expected: accepted.answers[0] }
  if (typed === '') return { ...base, outcome: 'unanswered', credit: 0 }
  const exact = answers.findIndex((a) => a === typed)
  if (exact >= 0) return { ...base, outcome: 'fully_correct', credit: 1, expected: accepted.answers[exact] }
  const sensitive = new Set(accepted.accentSensitive.map((a) => normalizeAnswer(a).toLowerCase()))
  const close = answers.findIndex(
    (a) => looseForm(a) === looseForm(typed) || transliteratedForm(a) === transliteratedForm(typed),
  )
  if (close >= 0) {
    const expected = accepted.answers[close]
    return missesMeaningfulAccent(typed, answers[close], sensitive)
      ? { ...base, outcome: 'incorrect', credit: 0, expected }
      : { ...base, outcome: 'orthography_only', credit: 0.5, expected }
  }
  return { ...base, outcome: 'incorrect', credit: 0 }
}

const ARTICLE: Partial<Record<string, RegExp>> = { fr: /^(un|une|des|le|la|les)\s|^l['’]/iu }

/** Whether a form starts with an article (only known for French). */
export function startsWithArticle(text: string, lang: string) {
  return ARTICLE[lang]?.test(normalizeAnswer(text)) ?? false
}

/** True when the response looks like the expected answer without its article. */
export function isMissingArticle(response: string, expected: string, lang: string) {
  const typed = normalizeAnswer(response)
  if (!typed || !startsWithArticle(expected, lang) || startsWithArticle(typed, lang)) return false
  const words = (s: string) =>
    normalizeAnswer(s)
      .replace(/^l['’]/iu, 'l ')
      .split(' ').length
  return words(typed) === words(expected) - 1
}
