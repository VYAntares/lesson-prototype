import { z } from 'zod'
import {
  grammarTopicSchema,
  langCodeSchema,
  lessonIdSchema,
  lessonKindSchema,
  levelSchema,
  singleLine,
  vocabularyThemeSchema,
} from './common'

/** content/outlines/<lang>-<level>.json: the course plan, one entry per lesson. */
export const outlineSchema = z
  .strictObject({
    lang: langCodeSchema,
    level: levelSchema,
    entries: z
      .array(
        z
          .strictObject({
            id: lessonIdSchema,
            kind: lessonKindSchema,
            topic: grammarTopicSchema.optional(),
            theme: vocabularyThemeSchema.optional(),
            workingTitle: singleLine(80),
            intent: singleLine(200),
          })
          .refine(
            (e) =>
              e.kind === 'grammar'
                ? e.topic != null && e.theme == null
                : e.theme != null && e.topic == null,
            {
              message: 'grammar needs a topic and no theme, other kinds a theme and no topic',
              path: ['kind'],
            },
          ),
      )
      .min(1),
  })
  .superRefine((outline, ctx) => {
    const seen = new Set<string>()
    outline.entries.forEach((entry, i) => {
      if (!entry.id.startsWith(`${outline.lang}-`))
        ctx.addIssue({
          code: 'custom',
          message: `id must start with ${outline.lang}-`,
          path: ['entries', i, 'id'],
        })
      if (seen.has(entry.id))
        ctx.addIssue({ code: 'custom', message: 'id used twice', path: ['entries', i, 'id'] })
      seen.add(entry.id)
    })
  })

export type Outline = z.infer<typeof outlineSchema>
export type OutlineEntry = Outline['entries'][number]
