// Exercise types of format v3. Every type has a fixed interaction (click or typing) and a fixed
// duration in seconds: the lesson length is computed from these, never estimated by the LLM.

import { z } from 'zod'
import type { LessonKind } from '../schemas/common'
import { idSchema, line, type Level, type Locale, textsFor } from './base'

export const EXERCISE_TYPES = [
  // click
  'gap_choice',
  'question_choice',
  'situation_choice',
  'listen_choice',
  'pick_reply',
  'true_false',
  'match_meaning',
  'match_forms',
  'gender',
  'order_words',
  'order_dialogue',
  'conjugation_pick',
  // typing
  'gap_typing',
  'translate',
  'short_answer',
  'conjugation_typing',
] as const
export type ExerciseType = (typeof EXERCISE_TYPES)[number]
export const exerciseTypeSchema = z.enum(EXERCISE_TYPES)

export type Interaction = 'click' | 'typing'

type TypeInfo = {
  interaction: Interaction
  /** Seconds for one exercise, `perRow` added per pair / row / line when the type has them. */
  seconds: number
  perRow?: number
  /** Rows assumed when a brief plans this type, before the content exists. */
  plannedRows?: number
  kinds: readonly LessonKind[]
}

const ALL: readonly LessonKind[] = ['grammar', 'vocabulary', 'functions', 'reading']

export const EXERCISE_INFO: Record<ExerciseType, TypeInfo> = {
  gap_choice: { interaction: 'click', seconds: 12, kinds: ALL },
  question_choice: { interaction: 'click', seconds: 15, kinds: ['reading', 'functions'] },
  situation_choice: { interaction: 'click', seconds: 15, kinds: ['functions'] },
  listen_choice: { interaction: 'click', seconds: 12, kinds: ['vocabulary', 'functions'] },
  pick_reply: { interaction: 'click', seconds: 15, kinds: ['functions'] },
  true_false: { interaction: 'click', seconds: 10, kinds: ['reading'] },
  match_meaning: { interaction: 'click', seconds: 6, perRow: 6, plannedRows: 5, kinds: ['vocabulary', 'functions', 'reading'] },
  match_forms: { interaction: 'click', seconds: 6, perRow: 6, plannedRows: 5, kinds: ['grammar'] },
  gender: { interaction: 'click', seconds: 6, kinds: ['vocabulary'] },
  order_words: { interaction: 'click', seconds: 18, kinds: ['grammar', 'functions'] },
  order_dialogue: { interaction: 'click', seconds: 10, perRow: 5, plannedRows: 4, kinds: ['functions'] },
  gap_typing: { interaction: 'typing', seconds: 20, kinds: ALL },
  translate: { interaction: 'typing', seconds: 25, kinds: ['grammar', 'vocabulary', 'functions'] },
  short_answer: { interaction: 'typing', seconds: 20, kinds: ['reading'] },
  conjugation_pick: { interaction: 'click', seconds: 6, perRow: 5, plannedRows: 6, kinds: ['grammar'] },
  conjugation_typing: { interaction: 'typing', seconds: 6, perRow: 8, plannedRows: 6, kinds: ['grammar'] },
}

export function exerciseSchemas(lang: Locale, level: Level) {
  const { L, N } = textsFor(lang, level)
  /** Text in the course language. */
  const course = (max = 200) => line(max)
  /** A gap sentence may start or end with the gap, so either side can be empty. */
  const side = z.string().max(200)
  /** Every answer that is correct, not just the expected one. Case, apostrophes, spaces and final punctuation are normalised by code. */
  const accepted = z.array(course(120)).min(1).max(12)
  /** Choices: as many correct ones as there are, at least one wrong one (checked). */
  const choices = z.array(z.strictObject({ text: course(120), correct: z.boolean() })).min(2).max(5)
  const rows = z.array(z.strictObject({ subject: course(40), accepted })).min(3).max(9)
  const speakerLine = z.strictObject({ speaker: line(30), text: course(200) })

  const base = {
    id: idSchema,
    /** Points practised; the first one is the section's own point. */
    pointIds: z.array(idSchema).min(1).max(4),
    /** Required in practice, absent from the quiz (checked). */
    hint: L().nullable(),
    /** Shown after the answer: why it is right, and why the other answers are also right. */
    explanation: L(),
  }
  const ex = <T extends ExerciseType, S extends z.ZodRawShape>(type: T, shape: S) =>
    z.strictObject({ type: z.literal(type), ...base, ...shape })

  return z.discriminatedUnion('type', [
    ex('gap_choice', { before: side, after: side, choices }),
    /** Question in the course language, e.g. about the reading text. */
    ex('question_choice', { question: course(), choices }),
    /** Situation described in the explanation language: "You meet your teacher in the morning." */
    ex('situation_choice', { situation: L(), choices }),
    /** The audio (speech synthesis of `audio`) is played; choices are written forms. */
    ex('listen_choice', { audio: course(), choices }),
    ex('pick_reply', { line: speakerLine, choices }),
    ex('true_false', {
      statement: course(),
      answer: z.enum(['true', 'false', 'not_said']),
      /** Exact quote of the reading text that settles it; null when not said. */
      evidence: course(300).nullable(),
    }),
    ex('match_meaning', {
      pairs: z.array(z.strictObject({ term: course(80), meaning: L(80) })).min(3).max(6),
    }),
    ex('match_forms', {
      pairs: z.array(z.strictObject({ left: course(80), right: course(80) })).min(3).max(6),
    }),
    /** Only nouns that have a gender (checked against the brief). */
    ex('gender', { term: course(80), gender: z.enum(['masculine', 'feminine', 'neuter']) }),
    ex('order_words', {
      tokens: z.array(course(40)).min(3).max(10),
      /** Every correct order, as indexes into `tokens`. */
      acceptedOrders: z.array(z.array(z.number().int().min(0).max(9))).min(1).max(4),
      translation: N().nullable(),
    }),
    /** Lines in the correct order; the player shuffles them. */
    ex('order_dialogue', { lines: z.array(speakerLine).min(3).max(6) }),
    ex('gap_typing', { before: side, after: side, accepted }),
    /** From the mother tongue into the course language. */
    ex('translate', { source: N(), accepted }),
    ex('short_answer', { question: course(), accepted }),
    /** A conjugation table: pick each form among `choices`. */
    ex('conjugation_pick', { verb: course(60), rows, choices: z.array(course(60)).min(3).max(12) }),
    /** A conjugation table: type each form. */
    ex('conjugation_typing', { verb: course(60), rows }),
  ])
}

export type Exercise = z.infer<ReturnType<typeof exerciseSchemas>>
export type ExerciseOf<T extends ExerciseType> = Extract<Exercise, { type: T }>

export function interactionOf(type: ExerciseType): Interaction {
  return EXERCISE_INFO[type].interaction
}

/** Rows of an exercise, for types whose duration depends on them. */
function rowCount(ex: Exercise): number {
  switch (ex.type) {
    case 'match_meaning':
    case 'match_forms':
      return ex.pairs.length
    case 'order_dialogue':
      return ex.lines.length
    case 'conjugation_pick':
    case 'conjugation_typing':
      return ex.rows.length
    default:
      return 0
  }
}

export function exerciseSeconds(ex: Exercise): number {
  const info = EXERCISE_INFO[ex.type]
  return info.seconds + (info.perRow ?? 0) * rowCount(ex)
}

/** Duration assumed for a planned exercise, before its rows are known. */
export function plannedExerciseSeconds(type: ExerciseType): number {
  const info = EXERCISE_INFO[type]
  return info.seconds + (info.perRow ?? 0) * (info.plannedRows ?? 0)
}
