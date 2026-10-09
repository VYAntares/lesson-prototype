import { z } from 'zod'
import { langCodeSchema, lessonIdSchema, levelSchema } from './common'

export const courseSchema = z.strictObject({
  key: z.string().min(1),
  lang: langCodeSchema,
  level: levelSchema,
  outlineUrl: z.string().min(1),
  /** SHA-256 of the outline file. */
  sourceHash: z.string().min(1),
  lessonIds: z.array(lessonIdSchema),
})

export const ARTIFACT_STATUSES = ['valid', 'invalid', 'stale', 'malformed'] as const

export const artifactRefSchema = z.strictObject({
  url: z.string().min(1),
  /** SHA-256 of the file at `url`. */
  sourceHash: z.string().min(1),
  status: z.enum(ARTIFACT_STATUSES),
})

export const lessonArtifactsSchema = z.strictObject({
  outlineHash: z.string().min(1),
  /** The brief (content/briefs/<id>.json). */
  draft: artifactRefSchema.optional(),
  /** The full lesson (content/lessons/<id>.json). */
  content: artifactRefSchema.optional(),
})

/** content/manifest.json: entry point for all data. */
export const manifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  courses: z.array(courseSchema),
  artifacts: z.record(lessonIdSchema, lessonArtifactsSchema),
})

export type Course = z.infer<typeof courseSchema>
export type ArtifactRef = z.infer<typeof artifactRefSchema>
export type LessonArtifacts = z.infer<typeof lessonArtifactsSchema>
export type Manifest = z.infer<typeof manifestSchema>
