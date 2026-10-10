// Lesson length, computed from fixed durations. The LLM never writes a duration.

import type { Level } from './base'
import type { Brief } from './brief'
import type { Content, Theory } from './content'
import { exerciseSeconds, plannedExerciseSeconds } from './exercises'

export const SECONDS = {
  /** Start screen and results. */
  overhead: 20,
  rule: { base: 20, per15Chars: 1, perExample: 8, perTableRow: 3, tip: 5 },
  /** A planned grammar point, before the card exists. */
  plannedRule: 60,
  word: 12,
  expressions: { base: 15, perExpression: 10, perDialogueLine: 5 },
  plannedDialogueLines: 4,
} as const

/** Reading speed of a learner, in words per minute. */
export const READING_WPM: Record<Level, number> = { A1: 60, A2: 80, B1: 110, B2: 140, C1: 170, C2: 200 }

export function readingSeconds(words: number, level: Level) {
  return Math.round((words / READING_WPM[level]) * 60)
}

export function countWords(text: string) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

export function theorySeconds(card: Theory): number {
  switch (card.type) {
    case 'rule': {
      const s = SECONDS.rule
      const chars = Object.values(card.text)[0]?.length ?? 0
      return (
        s.base +
        Math.ceil(chars / 15) * s.per15Chars +
        card.examples.length * s.perExample +
        (card.table?.rows.length ?? 0) * s.perTableRow +
        (card.tip ? s.tip : 0)
      )
    }
    case 'words':
      return card.words.length * SECONDS.word
    case 'expressions': {
      const s = SECONDS.expressions
      return s.base + card.expressions.length * s.perExpression + card.dialogue.length * s.perDialogueLine
    }
  }
}

export type DurationBreakdown = { theory: number; reading: number; practice: number; quiz: number; overhead: number; total: number }

function total(parts: Omit<DurationBreakdown, 'total'>): DurationBreakdown {
  return { ...parts, total: parts.theory + parts.reading + parts.practice + parts.quiz + parts.overhead }
}

export function contentSeconds(content: Content): DurationBreakdown {
  const text = content.reading ? [content.reading.title, ...content.reading.paragraphs].join(' ') : ''
  return total({
    theory: content.sections.reduce((n, s) => n + (s.theory ? theorySeconds(s.theory) : 0), 0),
    reading: content.reading ? readingSeconds(countWords(text), content.level) : 0,
    practice: content.sections.flatMap((s) => s.practice).reduce((n, ex) => n + exerciseSeconds(ex), 0),
    quiz: content.quiz.reduce((n, ex) => n + exerciseSeconds(ex), 0),
    overhead: SECONDS.overhead,
  })
}

/** What the brief's plan will last, so a brief that is too long fails before its content is written. */
export function plannedSeconds(brief: Brief): DurationBreakdown {
  const taught = (pointId: string, pos?: string) =>
    brief.introduces.filter((e) => e.pointId === pointId && (!pos || e.pos === pos)).length
  const theory = brief.points.reduce((n, p) => {
    switch (brief.kind) {
      case 'grammar':
        return n + SECONDS.plannedRule
      case 'functions': {
        const s = SECONDS.expressions
        return n + s.base + taught(p.id, 'expression') * s.perExpression + SECONDS.plannedDialogueLines * s.perDialogueLine
      }
      default:
        return n + taught(p.id) * SECONDS.word
    }
  }, 0)
  const planned = (items: { type: Parameters<typeof plannedExerciseSeconds>[0]; count: number }[]) =>
    items.reduce((n, i) => n + plannedExerciseSeconds(i.type) * i.count, 0)
  return total({
    theory,
    reading: brief.reading ? readingSeconds(brief.reading.words, brief.level) : 0,
    practice: planned(brief.practice),
    quiz: planned(brief.quiz),
    overhead: SECONDS.overhead,
  })
}
