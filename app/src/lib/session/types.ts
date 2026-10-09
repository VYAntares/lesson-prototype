import type { Locale } from '../../schemas/common'
import type { Outcome } from './answers'

/** What the learner entered: text, a chosen option id, a token order, or a spotted error. */
export type Response = string | string[] | { tokenId: string; text: string } | null

export type LockedAnswer = {
  response: Response
  outcome: Outcome
  points: number
  timedOut: boolean
  interfaceLanguage: Locale
}

export type ExamTimer = { startedAt: number; deadline: number; timedOut: boolean }

/** Saved progress of one lesson try (stored in localStorage). */
export type SessionRecord = {
  version: 1
  sessionId: string
  lessonId: string
  /** Hash of the lesson source; a saved session is not resumed after the content changed. */
  contentHash: string
  lang: string
  level: string
  motherTongue: Locale
  seed: number
  startedAt: number
  updatedAt: number
  status: 'active' | 'completed'
  pageIndex: number
  phase: 'answering' | 'feedback' | 'results'
  completed: string[]
  skippedNoVoice: string[]
  /** Flashcards turned over, per `pageId/itemId`. */
  revealed: Record<string, string[]>
  drafts: Record<string, Response>
  locked: Record<string, LockedAnswer>
  exam: Record<string, ExamTimer>
  /** Result section shown: "exam" or a step id. */
  selection: string
}

export type SessionAction =
  | { type: 'select'; selection: string }
  | { type: 'draft'; unitId: string; response: Response }
  | { type: 'voice_ready' }
  | { type: 'reveal'; itemKey: string; key: string }
  | { type: 'skip_no_voice' }
  | { type: 'expire' }
  | { type: 'continue' }

export type TimedAction = SessionAction & { now: number; interfaceLanguage: Locale }
