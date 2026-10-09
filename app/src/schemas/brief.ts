import { z } from 'zod'
import {
  acceptedAnswersSchema,
  artifactHeaderShape,
  durationSchema,
  exampleFor,
  grammarTopicSchema,
  itemIdSchema,
  learningText,
  localizedLabel,
  localizedLongText,
  localizedText,
  scoringSchema,
  timeLimitSchema,
  translationFor,
  translationsFor,
  vocabularyThemeSchema,
} from './common'

// ---------- grammar briefs ----------

export const GRAMMAR_EXERCISE_TYPES = [
  'grammar_person_matching',
  'grammar_pronoun_form_match',
  'grammar_pronoun_form_typing',
  'grammar_gap_choice',
  'grammar_gap_typing',
  'grammar_word_order',
  'grammar_error_spotter',
] as const
export type GrammarExerciseType = (typeof GRAMMAR_EXERCISE_TYPES)[number]

/** Exercise types that only make sense for person-based topics. */
export const PERSON_EXERCISE_TYPES: readonly GrammarExerciseType[] = [
  'grammar_person_matching',
  'grammar_pronoun_form_match',
  'grammar_pronoun_form_typing',
]
/** Topics where person matching is allowed. */
export const PERSON_MATCHING_TOPICS = ['pronouns', 'verbs_morphology', 'verb_usage'] as const
/** Topics where pronoun-form exercises are allowed. */
export const PRONOUN_FORM_TOPICS = ['pronouns', 'verbs_morphology'] as const
/** Lessons that may not use pronoun-form exercises despite their topic. */
export const PRONOUN_FORM_EXCLUDED_LESSONS = ['fr-imperative-mood'] as const

export const PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'] as const
export const personSchema = z.enum(PERSONS)

/** Structural requirements for grammar briefs and lessons. */
export const GRAMMAR_LIMITS = {
  minPracticeUnits: 34,
  minExamUnits: 16,
  examPages: [2, 4],
  exercisesPerBlock: [2, 4],
  secondsPerUnit: [6, 40],
  explanationSeconds: [45, 240],
} as const

/** Exercise types allowed on exam pages. */
export const GRAMMAR_EXAM_TYPES = [
  'grammar_gap_typing',
  'grammar_pronoun_form_typing',
  'grammar_word_order',
] as const

export const grammarBriefSchema = (lang: string) =>
  z.strictObject({
    ...artifactHeaderShape,
    kind: z.literal('grammar'),
    topic: grammarTopicSchema,
    scopeBoundaries: localizedText,
    prerequisites: z.array(localizedText).max(4),
    rules: z.array(z.strictObject({ id: itemIdSchema, summary: localizedText })).min(1).max(12),
    blocks: z
      .array(
        z.strictObject({
          id: itemIdSchema,
          title: localizedLabel,
          ruleIds: z.array(itemIdSchema).min(1),
          explanationPlan: localizedLongText,
          explanationDurationS: durationSchema,
          examples: z.array(exampleFor(lang)).min(1).max(8),
          pitfalls: z.array(localizedText).max(4),
          exercises: z
            .array(
              z.strictObject({
                id: itemIdSchema,
                type: z.enum(GRAMMAR_EXERCISE_TYPES),
                itemCount: z.number().int().min(1).max(12),
                ruleIds: z.array(itemIdSchema).min(1),
                estimatedDurationS: durationSchema,
              }),
            )
            .min(1)
            .max(GRAMMAR_LIMITS.exercisesPerBlock[1]),
        }),
      )
      .min(2)
      .max(4),
    newVerbs: z
      .array(z.strictObject({ infinitive: learningText, translations: translationFor(lang) }))
      .max(12),
    feedbackPlaceholder: z.strictObject({ estimatedDurationS: durationSchema }),
    exam: z.strictObject({
      pages: z
        .array(
          z.strictObject({
            pageId: itemIdSchema,
            type: z.enum(GRAMMAR_EXAM_TYPES),
            itemCount: z.number().int().min(1).max(12),
            ruleIds: z.array(itemIdSchema).min(1),
            estimatedDurationS: durationSchema,
            timeLimitS: timeLimitSchema,
          }),
        )
        .min(1)
        .max(20),
    }),
    scoring: scoringSchema,
  })
export type GrammarBrief = z.infer<ReturnType<typeof grammarBriefSchema>>

// ---------- vocabulary briefs ----------

export const WORD_CLASSES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'numeral',
  'letter',
  'preposition',
  'conjunction',
  'interjection',
  'phrase',
  'other',
] as const
export const GENDERS = ['masculine', 'feminine', 'neuter'] as const
export type Gender = (typeof GENDERS)[number]

export const vocabularyTargetSchema = (lang: string) =>
  z.strictObject({
    id: itemIdSchema,
    term: learningText,
    translations: translationsFor(lang),
    wordClass: z.enum(WORD_CLASSES),
    genders: z.array(z.enum(GENDERS)).max(3),
    number: z.enum(['singular', 'plural']).nullable(),
    teachingForm: learningText,
    examForms: z.array(learningText).min(1).max(4),
    accentSensitive: z.array(learningText).max(4),
    articleException: localizedText.nullable(),
    genderVariants: z.array(learningText).max(4),
    pronunciation: learningText,
    difficulty: z.enum(['core', 'demanding']),
    context: z.strictObject({ sentence: learningText, translation: translationFor(lang) }),
    ambiguityNote: localizedText.nullable(),
    explanation: localizedText,
    genderExplanation: localizedText.nullable(),
    matchingLabel: translationFor(lang).nullable(),
    examPrompt: translationFor(lang).nullable(),
    gap: z.strictObject({
      before: z.string().max(200),
      after: z.string().max(200),
      accepted: acceptedAnswersSchema,
      referenceTargetIds: z.array(itemIdSchema).length(4),
      explanation: localizedText,
    }),
    listeningOptionTargetIds: z.array(itemIdSchema).length(4),
  })
export type VocabularyTarget = z.infer<ReturnType<typeof vocabularyTargetSchema>>

export const vocabularyGroupSchema = z.strictObject({
  id: itemIdSchema,
  label: localizedLabel,
  targetIds: z.array(itemIdSchema).min(1).max(16),
  introduction: localizedLongText,
})
export type VocabularyGroup = z.infer<typeof vocabularyGroupSchema>

export const vocabularyBriefSchema = (lang: string) =>
  z.strictObject({
    ...artifactHeaderShape,
    kind: z.literal('vocabulary'),
    theme: vocabularyThemeSchema,
    coverageNotes: localizedLongText,
    targetCount: z.number().int().min(1).max(60),
    countRationale: localizedText,
    difficultyBalance: localizedText,
    prerequisites: z.array(localizedText).max(4),
    groups: z.array(vocabularyGroupSchema).min(1).max(6),
    targets: z.array(vocabularyTargetSchema(lang)).min(1).max(60),
    scoring: scoringSchema,
  })
export type VocabularyBrief = z.infer<ReturnType<typeof vocabularyBriefSchema>>

export type Brief = GrammarBrief | VocabularyBrief

/** Lesson kinds that the player supports. */
export const PLAYABLE_KINDS = ['vocabulary', 'grammar'] as const
export function isPlayableKind(kind: string): kind is (typeof PLAYABLE_KINDS)[number] {
  return (PLAYABLE_KINDS as readonly string[]).includes(kind)
}

export function briefSchemaFor(kind: string, lang: string) {
  return kind === 'vocabulary' ? vocabularyBriefSchema(lang) : grammarBriefSchema(lang)
}

/** Vocabulary lessons are built from the brief; other kinds need a content file. */
export function needsContentFile(kind: string) {
  return kind !== 'vocabulary'
}
