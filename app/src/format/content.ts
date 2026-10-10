// The content: the playable lesson, generated from its brief (format v3).
// A lesson is a list of sections, one per point of the brief (theory card, then practice),
// followed by the quiz. Only the quiz is scored, and the score is shown only at the end.

import { z } from 'zod'
import { lessonKindSchema } from '../schemas/common'
import { headerShape, idSchema, line, textsFor, type Level, type Locale } from './base'
import { exerciseSchemas } from './exercises'

export function contentSchema(lang: Locale, level: Level) {
  const { L, R, N } = textsFor(lang, level)
  /** One instance for practice and quiz, so the JSON Schema defines it once. */
  const exercise = exerciseSchemas(lang, level)
  /** Required in A1–A2, may be null from B1 (checked). */
  const translation = N().nullable()
  const example = z.strictObject({
    text: line(200),
    /** Parts of `text` to highlight: the form the point is about. */
    highlight: z.array(line(60)).max(3),
    translation,
  })

  const theory = z.discriminatedUnion('type', [
    /** Grammar: one rule, made visual with a table and highlighted examples. */
    z.strictObject({
      type: z.literal('rule'),
      text: R(400),
      table: z
        .strictObject({
          header: z.array(L(40)).min(1).max(4).nullable(),
          rows: z.array(z.array(line(60)).min(1).max(4)).min(1).max(9),
        })
        .nullable(),
      examples: z.array(example).min(1).max(4),
      tip: L().nullable(),
    }),
    /** Vocabulary, reading keywords: word cards, read aloud. Terms come from the brief. */
    z.strictObject({
      type: z.literal('words'),
      words: z
        .array(z.strictObject({ term: line(60), display: line(80), example }))
        .min(1)
        .max(8),
    }),
    /** Functions: a situation, its expressions and a short dialogue. */
    z.strictObject({
      type: z.literal('expressions'),
      situation: L(),
      expressions: z.array(z.strictObject({ term: line(80), example })).min(1).max(6),
      dialogue: z
        .array(z.strictObject({ speaker: line(30), text: line(200), translation }))
        .max(6),
    }),
  ])

  return z.strictObject({
    ...headerShape(lang),
    kind: lessonKindSchema,
    /** Reading lessons only: the text, shown from the first question to the end of the quiz. */
    reading: z
      .strictObject({
        title: line(80),
        paragraphs: z.array(line(800)).min(1).max(6),
      })
      .nullable(),
    sections: z
      .array(
        z.strictObject({
          pointId: idSchema,
          /** Null only for later sections of a reading lesson. */
          theory: theory.nullable(),
          practice: z.array(exercise).min(1).max(8),
        }),
      )
      .min(1)
      .max(4),
    quiz: z.array(exercise).min(3).max(10),
  })
}
export type Content = z.infer<ReturnType<typeof contentSchema>>
export type Section = Content['sections'][number]
export type Theory = NonNullable<Section['theory']>
