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
  timeLimitSchema,
  tokenSchema,
  translationFor,
  vocabularyThemeSchema,
} from './common'
import { personSchema } from './brief'

// ---------- grammar lessons (content/lessons/<id>.json) ----------

const answerInfo = {
  ruleIds: z.array(itemIdSchema).min(1),
  answerExplanation: localizedText,
}

export const grammarItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('grammar_explanation'),
      itemId: itemIdSchema,
      ruleIds: z.array(itemIdSchema).min(1),
      heading: localizedLabel,
      text: localizedLongText,
      formTable: z
        .array(
          z.strictObject({ subject: learningText, form: learningText, example: learningText.nullable() }),
        )
        .max(12),
      examples: z.array(exampleFor(lang)).max(8),
    }),
    z.strictObject({ type: z.literal('production_feedback_placeholder'), itemId: itemIdSchema }),
    z.strictObject({
      type: z.literal('grammar_person_matching'),
      itemId: itemIdSchema,
      ruleIds: z.array(itemIdSchema).min(1),
      mode: z.enum(['translation', 'forms']),
      rows: z
        .array(
          z.strictObject({
            person: personSchema,
            pronoun: learningText.nullable(),
            native: translationFor(lang).nullable(),
            answer: learningText,
            answerExplanation: localizedText,
          }),
        )
        .min(3)
        .max(6),
    }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_match'),
      itemId: itemIdSchema,
      ruleIds: z.array(itemIdSchema).min(1),
      tokens: z.array(tokenSchema).min(2).max(12),
      rows: z
        .array(
          z.strictObject({
            rowId: itemIdSchema,
            pronoun: learningText,
            validForms: z.array(learningText).min(1),
            answerExplanation: localizedText,
          }),
        )
        .min(1)
        .max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_typing'),
      itemId: itemIdSchema,
      ruleIds: z.array(itemIdSchema).min(1),
      rows: z
        .array(
          z.strictObject({
            rowId: itemIdSchema,
            pronoun: learningText,
            accepted: acceptedAnswersSchema,
            answerExplanation: localizedText,
          }),
        )
        .min(1)
        .max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_gap_choice'),
      itemId: itemIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      choices: z.array(z.strictObject({ choiceId: itemIdSchema, text: learningText })).length(4),
      answerChoiceId: itemIdSchema,
      hint: localizedText.nullable(),
      ...answerInfo,
    }),
    z.strictObject({
      type: z.literal('grammar_gap_typing'),
      itemId: itemIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      accepted: acceptedAnswersSchema,
      hint: localizedText.nullable(),
      ...answerInfo,
    }),
    z.strictObject({
      type: z.literal('grammar_word_order'),
      itemId: itemIdSchema,
      tokens: z.array(tokenSchema).min(2).max(16),
      acceptedOrders: z.array(z.array(itemIdSchema).min(2)).min(1).max(4),
      ...answerInfo,
    }),
    z.strictObject({
      type: z.literal('grammar_error_spotter'),
      itemId: itemIdSchema,
      tokens: z.array(tokenSchema).min(2).max(16),
      faultyTokenId: itemIdSchema,
      correction: z.strictObject({
        mode: z.enum(['type', 'select']),
        accepted: acceptedAnswersSchema,
        choices: z.array(learningText).max(4),
      }),
      ...answerInfo,
    }),
  ])

const grammarPageSchema = (lang: string) =>
  z.strictObject({
    pageId: itemIdSchema,
    estimatedDurationS: durationSchema,
    timeLimitS: timeLimitSchema.nullable(),
    instructions: localizedText,
    items: z.array(grammarItemSchema(lang)).min(1).max(12),
  })

export const grammarLessonSchema = (lang: string) =>
  z.strictObject({
    ...artifactHeaderShape,
    kind: z.literal('grammar'),
    topic: grammarTopicSchema,
    steps: z
      .array(
        z.strictObject({
          id: itemIdSchema,
          role: z.enum(['explanation', 'exercise', 'feedback', 'exam']),
          blockId: itemIdSchema.nullable(),
          label: localizedLabel,
          pages: z.array(grammarPageSchema(lang)).min(1).max(20),
        }),
      )
      .min(6)
      .max(20),
  })

export type GrammarLesson = z.infer<ReturnType<typeof grammarLessonSchema>>
export type GrammarStep = GrammarLesson['steps'][number]
export type GrammarPage = GrammarStep['pages'][number]
export type GrammarItem = GrammarPage['items'][number]
export type GrammarItemOf<T extends GrammarItem['type']> = Extract<GrammarItem, { type: T }>

// ---------- vocabulary lessons (built from the brief) ----------

const vocabularyAnswerInfo = { answerExplanation: localizedText }

export const vocabularyItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('vocabulary_introduction'),
      itemId: itemIdSchema,
      targetIds: z.array(itemIdSchema).min(1),
      text: localizedLongText,
    }),
    z.strictObject({
      type: z.literal('vocabulary_flashcards'),
      itemId: itemIdSchema,
      targetIds: z.array(itemIdSchema).min(1),
    }),
    z.strictObject({
      type: z.literal('vocabulary_matching'),
      itemId: itemIdSchema,
      pairs: z
        .array(
          z.strictObject({
            targetId: itemIdSchema,
            nativeLabel: translationFor(lang).nullable(),
            ...vocabularyAnswerInfo,
          }),
        )
        .min(2)
        .max(12),
    }),
    z.strictObject({
      type: z.literal('vocabulary_gender_select'),
      itemId: itemIdSchema,
      targetIds: z.array(itemIdSchema).min(1),
      rows: z.array(z.strictObject({ targetId: itemIdSchema, ...vocabularyAnswerInfo })).min(1),
    }),
    z.strictObject({
      type: z.literal('vocabulary_overview'),
      itemId: itemIdSchema,
      targetIds: z.array(itemIdSchema).min(1),
    }),
    z.strictObject({
      type: z.literal('vocabulary_typed_gap'),
      itemId: itemIdSchema,
      targetId: itemIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      referenceTargetIds: z.array(itemIdSchema).length(4),
      accepted: acceptedAnswersSchema,
      ...vocabularyAnswerInfo,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_choice'),
      itemId: itemIdSchema,
      targetId: itemIdSchema,
      optionTargetIds: z.array(itemIdSchema).length(4),
      ...vocabularyAnswerInfo,
    }),
    z.strictObject({
      type: z.literal('vocabulary_translation_exam'),
      itemId: itemIdSchema,
      targetId: itemIdSchema,
      prompt: translationFor(lang),
      accepted: acceptedAnswersSchema,
      ...vocabularyAnswerInfo,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_dictation'),
      itemId: itemIdSchema,
      targetId: itemIdSchema,
      accepted: acceptedAnswersSchema,
      ...vocabularyAnswerInfo,
    }),
  ])

export const VOCABULARY_STAGES = [
  'introduction',
  'flashcards',
  'matching',
  'overview',
  'practice',
  'exam',
] as const

const vocabularyPageSchema = (lang: string) =>
  z.strictObject({
    pageId: itemIdSchema,
    estimatedDurationS: durationSchema,
    timeLimitS: timeLimitSchema.nullable(),
    instructions: localizedText,
    items: z.array(vocabularyItemSchema(lang)).min(1).max(12),
  })

export const vocabularyLessonSchema = (lang: string) =>
  z.strictObject({
    ...artifactHeaderShape,
    kind: z.literal('vocabulary'),
    theme: vocabularyThemeSchema,
    steps: z
      .array(
        z.strictObject({
          id: itemIdSchema,
          stage: z.enum(VOCABULARY_STAGES),
          role: z.enum(['introduction', 'exercise', 'overview', 'exam']),
          label: localizedLabel,
          pages: z.array(vocabularyPageSchema(lang)).min(1).max(60),
        }),
      )
      .length(VOCABULARY_STAGES.length + 1),
  })

export type VocabularyLesson = z.infer<ReturnType<typeof vocabularyLessonSchema>>
export type VocabularyStep = VocabularyLesson['steps'][number]
export type VocabularyPage = VocabularyStep['pages'][number]
export type VocabularyItem = VocabularyPage['items'][number]
export type VocabularyItemOf<T extends VocabularyItem['type']> = Extract<VocabularyItem, { type: T }>

export type Lesson = GrammarLesson | VocabularyLesson

export function lessonSchemaFor(kind: string, lang: string) {
  return kind === 'vocabulary' ? vocabularyLessonSchema(lang) : grammarLessonSchema(lang)
}

export type LessonStep = GrammarStep | VocabularyStep
export type LessonPage = GrammarPage | VocabularyPage

/** Steps of either lesson kind as one array type (TS cannot flatMap a union of arrays). */
export function lessonSteps(lesson: Lesson): LessonStep[] {
  return lesson.steps
}
