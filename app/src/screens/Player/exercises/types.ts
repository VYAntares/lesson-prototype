import type { LessonItem, Plan, Unit } from '../../../lib/lesson/plan'
import type { LockedAnswer, Response } from '../../../lib/session/types'
import type { Locale } from '../../../schemas/common'

/** "exam": answers are only checked at the end; "feedback": the page was just checked. */
export type ExerciseMode = 'answering' | 'feedback' | 'exam'

/** Props every exercise component receives for one item of the current page. */
export type ExerciseProps<T extends LessonItem['type'] = LessonItem['type']> = {
  item: Extract<LessonItem, { type: T }>
  /** Scored units of this item. */
  units: Unit[]
  plan: Plan
  mode: ExerciseMode
  drafts: Record<string, Response>
  locked: Record<string, LockedAnswer>
  onChange: (unitId: string, response: Response) => void
  /** Session seed for stable shuffling. */
  seed: number
  motherTongue: Locale
  pageId: string
  revealed: Record<string, string[]>
  onReveal: (itemKey: string, key: string) => void
  /** The page was answered fully correctly and is about to advance. */
  celebrating: boolean
  /** Exam units whose answer lacks the article (shown once before submitting). */
  articleWarnings: string[]
  /** Show right/wrong on the inputs themselves instead of a feedback box per unit. */
  inlineFeedback: boolean
}

/** What shared building blocks need: everything except the item itself. */
export type ExerciseContext = Omit<ExerciseProps, 'item' | 'units'>
