// Comparing answers. Accepted answers are listed once, in their correct spelling: case,
// apostrophes, spaces and final punctuation are normalised here, never listed as variants.

const APOSTROPHES = /[’‘ʼ`´]/g
const FINAL_PUNCTUATION = /[\s.!?…;:,]+$/u
const QUOTES = /[«»“”"]/g

/** Same answer for a learner: "Il", "il" and "il." are one answer; "j’habite" equals "j'habite". */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(QUOTES, '')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(FINAL_PUNCTUATION, '')
}

const FOLDED: Record<string, string> = { ß: 'ss', œ: 'oe', æ: 'ae' }

/** Without accents: an accent mistake does not make an answer wrong (team feedback). */
export function foldAccents(s: string): string {
  return normalizeAnswer(s)
    .replace(/[ßœæ]/g, (c) => FOLDED[c])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export type Grade = 'correct' | 'accent' | 'wrong'

/** `accent`: right once accents are ignored; counted as correct, with a remark. */
export function gradeAnswer(answer: string, accepted: string[]): Grade {
  const a = normalizeAnswer(answer)
  if (accepted.some((x) => normalizeAnswer(x) === a)) return 'correct'
  const f = foldAccents(answer)
  return accepted.some((x) => foldAccents(x) === f) ? 'accent' : 'wrong'
}
