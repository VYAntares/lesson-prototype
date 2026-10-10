// Building blocks shared by the brief and content schemas (format v3).
// Course languages, levels, kinds, topics and themes come from the outline schema, which mirrors
// ft_transcendence's packages/shared/src/schemas/lesson.ts.

import { z } from 'zod'
import { LOCALES, itemIdSchema, lessonIdSchema, levelSchema, singleLine, type Level, type Locale } from '../schemas/common'

export { LOCALES, type Level, type Locale }

export const FORMAT_VERSION = 3

/** ft_transcendence: LESSON_MINUTES. Checked by adding up fixed durations, never estimated. */
export const LESSON_SECONDS = 10 * 60

export const idSchema = itemIdSchema
export const line = singleLine

/** Multi-line text in restricted Markdown (see lib/richText.ts). */
export const rich = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => s === s.trim(), 'must not start or end with whitespace')
    .refine(
      (s) => s.split('\n').every((l) => !/[\p{Cc}​-‍﻿]/u.test(l)),
      'must not contain invisible characters other than line breaks',
    )

/** Every interface language except the course language: the learner's possible mother tongues. */
export function nativeLocales(lang: Locale): Locale[] {
  return LOCALES.filter((l) => l !== lang)
}

/** Decision C: explanations in the mother tongue in A1 and A2, in the course language from B1. */
export function explainsInMotherTongue(level: Level) {
  return level === 'A1' || level === 'A2'
}

/** Locales of explanations, hints and corrections for a course. */
export function explanationLocales(lang: Locale, level: Level): Locale[] {
  return explainsInMotherTongue(level) ? nativeLocales(lang) : [lang]
}

/** Text keyed by locale. The keys are fixed per course, so the JSON Schema given to the LLM is exact. */
export type Localized = Partial<Record<Locale, string>>

export function localized(locales: Locale[], text: z.ZodType<string>): z.ZodType<Localized> {
  return z.strictObject(Object.fromEntries(locales.map((l) => [l, text]))) as unknown as z.ZodType<Localized>
}

/** The text factories of one course: `L` for explanations, `N` for mother-tongue translations. */
export function textsFor(lang: Locale, level: Level) {
  const explain = explanationLocales(lang, level)
  const native = nativeLocales(lang)
  return {
    /** Explanation text, one line. */
    L: (max = 300) => localized(explain, line(max)),
    /** Explanation text, restricted Markdown. */
    R: (max = 600) => localized(explain, rich(max)),
    /** Translation into every mother tongue. */
    N: (max = 200) => localized(native, line(max)),
  }
}

export const provenanceSchema = z.strictObject({
  /** `generator/` version, or `hand` for files written by hand. */
  generator: line(60),
  model: line(60).nullable(),
  promptVersion: line(40).nullable(),
  generatedAt: z.iso.datetime(),
  /** SHA-256 of the input: the outline entry for a brief, the brief file for a content. */
  inputHash: z.string().regex(/^[0-9a-f]{64}$/, 'expected a SHA-256 in hex'),
})
export type Provenance = z.infer<typeof provenanceSchema>

export const headerShape = (lang: Locale) => ({
  formatVersion: z.literal(FORMAT_VERSION),
  id: lessonIdSchema,
  lang: z.literal(lang),
  level: levelSchema,
  provenance: provenanceSchema,
})
