import { z } from 'zod'

/** Locales the interface and translations are available in. */
export const LOCALES = ['en', 'fr', 'de'] as const
export type Locale = (typeof LOCALES)[number]
export const localeSchema = z.enum(LOCALES)

export const langCodeSchema = z
  .string()
  .regex(/^[a-z]{2}$/, 'expected a two-letter language code')

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]
export const levelSchema = z.enum(LEVELS)

export function compareLevels(a: string, b: string) {
  return LEVELS.indexOf(a as Level) - LEVELS.indexOf(b as Level)
}

export const LESSON_KINDS = ['vocabulary', 'grammar', 'functions', 'reading'] as const
export type LessonKind = (typeof LESSON_KINDS)[number]
export const lessonKindSchema = z.enum(LESSON_KINDS)

export const GRAMMAR_TOPICS = [
  'nouns_and_determiners',
  'pronouns',
  'verbs_morphology',
  'verb_usage',
  'syntax_and_sentence_structure',
  'subordinate_clauses',
  'prepositions_and_case',
  'adjectives',
  'adverbs',
  'agreement',
  'negation',
  'comparison_and_quantity',
  'information_structure_and_pragmatics',
] as const
export type GrammarTopic = (typeof GRAMMAR_TOPICS)[number]
export const grammarTopicSchema = z.enum(GRAMMAR_TOPICS)

export const VOCABULARY_THEMES = [
  'personal_identification',
  'house_and_home',
  'daily_life',
  'free_time',
  'travel',
  'relations',
  'health',
  'education',
  'shopping',
  'food_and_drink',
  'services',
  'places',
  'language',
  'weather',
] as const
export type VocabularyTheme = (typeof VOCABULARY_THEMES)[number]
export const vocabularyThemeSchema = z.enum(VOCABULARY_THEMES)

/** Lesson ids look like `fr-subject-pronouns`. */
export const lessonIdSchema = z
  .string()
  .max(64)
  .regex(/^[a-z]{2}-[a-z]+(-[a-z]+)*$/, 'expected <lang>-<words>: lowercase letters and hyphens')

/** Single-line text without surrounding whitespace or invisible characters. */
export const singleLine = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => s === s.trim(), 'must not start or end with whitespace')
    .refine(
      (s) => !/[\p{Cc}\u200B-\u200D\uFEFF]/u.test(s),
      'must not contain line breaks or invisible characters',
    )

export const TEXT_LIMITS = { label: 120, short: 300, long: 1200, learning: 300 } as const

const trimmed = (max: number) => z.string().trim().min(1).max(max)

export const shortText = trimmed(TEXT_LIMITS.short)
/** Text in the learning language. */
export const learningText = trimmed(TEXT_LIMITS.learning)

/** Text available in every interface locale. */
const localized = (max: number = TEXT_LIMITS.short) =>
  z.strictObject({ en: trimmed(max), fr: trimmed(max), de: trimmed(max) })
export const localizedText = localized()
export const localizedLabel = localized(TEXT_LIMITS.label)
export const localizedLongText = localized(TEXT_LIMITS.long)
export type LocalizedText = z.infer<typeof localizedText>

/** Locales a learner can use as mother tongue for a course in `lang`. */
export function nativeLocalesFor(lang: string): Locale[] {
  return LOCALES.filter((l) => l !== lang)
}

/** Object keyed by every locale except the course language (that key is absent). */
function perNativeLocale<T extends z.ZodType>(lang: string, value: T) {
  return z.strictObject(
    Object.fromEntries(nativeLocalesFor(lang).map((l) => [l, value])),
  ) as unknown as z.ZodType<Partial<Record<Locale, z.output<T>>>>
}

/** One to six translations per mother tongue. */
export const translationsFor = (lang: string) =>
  perNativeLocale(lang, z.array(shortText).min(1).max(6))
/** A single translation per mother tongue. */
export const translationFor = (lang: string) => perNativeLocale(lang, shortText)

/** Native-language text keyed by mother tongue (all locales except the course language). */
export type NativeText = Partial<Record<Locale, string>>

export const itemIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,47}$/, 'expected a lowercase id of letters, digits and hyphens')

export const durationSchema = z.number().int().min(5).max(3600)
export const timeLimitSchema = z.number().int().min(5).max(900)

/** Typed answers: accepted spellings, plus the subset that is accent-sensitive. */
export const acceptedAnswersSchema = z.strictObject({
  answers: z.array(learningText).min(1).max(8),
  accentSensitive: z.array(learningText).max(8),
})
export type AcceptedAnswers = z.infer<typeof acceptedAnswersSchema>

export const provenanceSchema = z.strictObject({
  generator: trimmed(80),
  model: trimmed(80),
  promptVersion: trimmed(40),
  generatedAt: z.iso.datetime(),
  inputHashes: z.strictObject({
    outline: z.string().min(16),
    brief: z.string().min(16).optional(),
  }),
})

/** Fields shared by briefs and lessons. */
export const artifactHeaderShape = {
  schemaVersion: z.literal(2),
  id: lessonIdSchema,
  lang: langCodeSchema,
  level: levelSchema,
  locales: z.tuple([z.literal('en'), z.literal('fr'), z.literal('de')]),
  title: learningText,
  objective: localizedText,
  estimatedMinutes: z.number().int().min(1).max(120),
  provenance: provenanceSchema,
}

export const scoringSchema = z.strictObject({
  practiceWeight: z.literal(35),
  examWeight: z.literal(65),
  orthographyCredit: z.literal(0.5),
})
export type Scoring = z.infer<typeof scoringSchema>

export const exampleFor = (lang: string) =>
  z.strictObject({ text: learningText, translation: translationFor(lang) })

export const tokenSchema = z.strictObject({ tokenId: itemIdSchema, text: learningText })
export type Token = z.infer<typeof tokenSchema>
