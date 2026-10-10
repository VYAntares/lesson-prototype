// The brief: the plan of one lesson, generated from its outline entry (format v3).

import { z } from 'zod'
import {
  grammarTopicSchema,
  lessonKindSchema,
  vocabularyThemeSchema,
  type LessonKind,
} from '../schemas/common'
import { headerShape, idSchema, line, textsFor, type Level, type Locale } from './base'
import { exerciseTypeSchema } from './exercises'

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'determiner',
  'preposition',
  'conjunction',
  'numeral',
  'interjection',
  /** A fixed phrase: "au revoir", "s'il vous plaît", "ça va ?". */
  'expression',
] as const
export const GENDERS = ['masculine', 'feminine', 'neuter'] as const
export const REGISTERS = ['informal', 'neutral', 'formal'] as const

/** Limits of a brief, per kind where they differ. */
export const BRIEF_LIMITS = {
  points: { min: 1, max: 4 },
  /** Words a vocabulary lesson teaches. */
  vocabularyWords: { min: 6, max: 12 },
  /** Share of typing exercises, by role. */
  practiceTyping: { max: 0.4 },
  quizTyping: { min: 0.3, max: 0.6 },
  /** Reading quizzes are about understanding, so they may be all clicks. */
  readingQuizTyping: { min: 0, max: 0.5 },
  quizExercises: { min: 4, max: 8 },
} as const

export function lexEntrySchema(lang: Locale, level: Level) {
  const { L } = textsFor(lang, level)
  return z.strictObject({
    /** Dictionary form, in the course language, without article: "père", "être", "au revoir". */
    term: line(60),
    pos: z.enum(PARTS_OF_SPEECH),
    /** Required for nouns in languages with gender (checked), null otherwise. */
    gender: z.enum(GENDERS).nullable(),
    /** Every form that may appear in the lesson, the term included: "suis", "es", "est"… */
    forms: z.array(line(60)).min(1).max(16),
    /** Meaning in the explanation language (a translation in A1–A2, a definition from B1). */
    meaning: L(120),
    /** Expressions only. */
    register: z.enum(REGISTERS).nullable(),
    /** The point that teaches it; null for words given only to make sentences readable. */
    pointId: idSchema.nullable(),
  })
}
export type LexEntry = z.infer<ReturnType<typeof lexEntrySchema>>

export function briefSchema(lang: Locale, level: Level) {
  const { L } = textsFor(lang, level)
  return z.strictObject({
    ...headerShape(lang),
    kind: lessonKindSchema,
    /** Grammar only, equal to the outline. */
    topic: grammarTopicSchema.nullable(),
    /** Every other kind, equal to the outline. */
    theme: vocabularyThemeSchema.nullable(),
    /** In the course language, at most 80 characters (ft_transcendence LESSON_TITLE_MAX). */
    title: line(80),
    /** One sentence for lesson lists, in the explanation language (ft_transcendence LESSON_SUMMARY_MAX). */
    summary: L(200),
    objective: L(300),
    /** What the lesson leaves out, so it stays within ten minutes. */
    outOfScope: L(300),
    /** The points of the lesson, in teaching order. They are the sidebar of the player. */
    points: z
      .array(z.strictObject({ id: idSchema, title: L(60), summary: L(300) }))
      .min(1)
      .max(4),
    /**
     * Words this lesson teaches. They are known in every later lesson of the outline.
     * Everything an exercise uses must be known: base words, earlier lessons, `introduces`, `glossary`.
     */
    introduces: z.array(lexEntrySchema(lang, level)).max(16),
    /** Words given in this lesson with their meaning, never tested. Not known in later lessons. */
    glossary: z.array(lexEntrySchema(lang, level)).max(20),
    /** First names and places the lesson may use. */
    names: z.array(line(40)).max(12),
    /** Exercises per point, in order. Each point opens with a click exercise. */
    practice: z
      .array(z.strictObject({ pointId: idSchema, type: exerciseTypeSchema, count: z.number().int().min(1).max(6) }))
      .min(1)
      .max(16),
    /** The final quiz, the only scored part. */
    quiz: z
      .array(
        z.strictObject({
          pointIds: z.array(idSchema).min(1).max(4),
          type: exerciseTypeSchema,
          count: z.number().int().min(1).max(8),
        }),
      )
      .min(1)
      .max(8),
    /** Reading lessons only: what the text will be. */
    reading: z
      .strictObject({
        genre: L(60),
        words: z.number().int().min(30).max(400),
        /** The facts the learner must find, one per question roughly. */
        facts: z.array(L(200)).min(2).max(8),
      })
      .nullable(),
    /**
     * Set by the generator when the outline entry holds more than ten minutes even after cutting.
     * Never split a lesson: the outline is fixed, so a human decides.
     */
    tooBig: L(300).nullable(),
  })
}
export type Brief = z.infer<ReturnType<typeof briefSchema>>

/** Kinds with an expected first theory card, by the card type they use. */
export const THEORY_BY_KIND: Record<LessonKind, 'rule' | 'words' | 'expressions'> = {
  grammar: 'rule',
  vocabulary: 'words',
  functions: 'expressions',
  reading: 'words',
}
