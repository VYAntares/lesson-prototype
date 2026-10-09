// Vocabulary lessons have no content file: the player builds them from the brief.

import { nativeLocalesFor, type AcceptedAnswers, type NativeText } from '../../schemas/common'
import type { VocabularyBrief, VocabularyTarget } from '../../schemas/brief'
import type { VocabularyLesson, VocabularyPage, VocabularyStep } from '../../schemas/lesson'
import { STAGE_TEXTS } from './stageTexts'

/** Durations (seconds) and page sizes used to generate the lesson. */
export const VOCABULARY_TIMING = {
  introductionBase: 20,
  introductionPerWord: 3,
  flashcardsPerWord: 10,
  matchingPerWord: 10,
  matchingGroupSize: 6,
  overviewBase: 20,
  overviewPerWord: 3,
  genderPerWord: 5,
  gapPage: 20,
  listeningPage: 15,
  examPageSize: 6,
  translationPerWord: 15,
  translationLimitPerWord: 20,
  dictationPerWord: 20,
  dictationLimitPerWord: 30,
} as const

/** Split into evenly sized chunks of at most `size` items. */
export function chunkEvenly<T>(items: T[], size: number): T[][] {
  const count = Math.ceil(items.length / size)
  return Array.from({ length: count }, (_, i) =>
    items.slice(Math.round((i * items.length) / count), Math.round(((i + 1) * items.length) / count)),
  )
}

/** Matching boards: all targets in group order, in chunks of up to six. */
export function matchingBoards(brief: VocabularyBrief) {
  return chunkEvenly(
    brief.groups.flatMap((g) => g.targetIds),
    VOCABULARY_TIMING.matchingGroupSize,
  )
}

/**
 * Exam answers. Gender variants (e.g. "une étudiante") are only accepted when the prompt
 * does not already say which gender is meant.
 */
export function examAnswers(target: VocabularyTarget, lang: string, prompt?: NativeText) {
  const promptIsGeneric =
    !prompt || nativeLocalesFor(lang).every((l) => prompt[l] !== target.translations[l]?.[0])
  return [...new Set([...target.examForms, ...(promptIsGeneric ? [] : target.genderVariants)])]
}

export function lessonMinutes(steps: { pages: { estimatedDurationS: number }[] }[]) {
  return Math.max(1, Math.round(steps.flatMap((s) => s.pages).reduce((sum, p) => sum + p.estimatedDurationS, 0) / 60))
}

export function compileVocabularyLesson(brief: VocabularyBrief): VocabularyLesson {
  const T = VOCABULARY_TIMING
  const byId = new Map(brief.targets.map((t) => [t.id, t]))
  const target = (id: string) => byId.get(id)!
  const allIds = brief.targets.map((t) => t.id)
  const nouns = brief.targets.filter((t) => t.wordClass === 'noun')

  const page = (
    pageId: string,
    estimatedDurationS: number,
    instructions: VocabularyPage['instructions'],
    items: VocabularyPage['items'],
    timeLimitS: number | null = null,
  ): VocabularyPage => ({ pageId, estimatedDurationS, timeLimitS, instructions, items })
  const step = (
    id: string,
    role: VocabularyStep['role'],
    label: VocabularyStep['label'],
    pages: VocabularyPage[],
    stage: VocabularyStep['stage'] = id as VocabularyStep['stage'],
  ): VocabularyStep => ({ id, stage, role, label, pages })

  const examChunks = brief.groups.flatMap((g) =>
    chunkEvenly(g.targetIds, T.examPageSize).map((ids, i) => ({ key: `${g.id}-${i + 1}`, ids })),
  )
  const accepted = (id: string, prompt?: NativeText): AcceptedAnswers => ({
    answers: examAnswers(target(id), brief.lang, prompt),
    accentSensitive: target(id).accentSensitive,
  })
  const examPrompt = (id: string): NativeText => {
    const t = target(id)
    return t.examPrompt ?? Object.fromEntries(Object.entries(t.translations).map(([l, list]) => [l, list?.[0]]))
  }

  const steps: VocabularyStep[] = [
    step(
      'introduction',
      'introduction',
      STAGE_TEXTS.introduction[0],
      brief.groups.map((g) =>
        page(
          `intro-${g.id}`,
          T.introductionBase + T.introductionPerWord * g.targetIds.length,
          STAGE_TEXTS.introduction[1],
          [{ type: 'vocabulary_introduction', itemId: `intro-${g.id}`, targetIds: g.targetIds, text: g.introduction }],
        ),
      ),
    ),
    step(
      'flashcards',
      'exercise',
      STAGE_TEXTS.flashcards[0],
      brief.groups.map((g) =>
        page(`cards-${g.id}`, T.flashcardsPerWord * g.targetIds.length, STAGE_TEXTS.flashcards[1], [
          { type: 'vocabulary_flashcards', itemId: `cards-${g.id}`, targetIds: g.targetIds },
        ]),
      ),
    ),
    step(
      'matching',
      'exercise',
      STAGE_TEXTS.matching[0],
      matchingBoards(brief).map((ids, i) =>
        page(`match-${i + 1}`, T.matchingPerWord * ids.length, STAGE_TEXTS.matching[1], [
          {
            type: 'vocabulary_matching',
            itemId: `match-${i + 1}`,
            pairs: ids.map((id) => ({
              targetId: id,
              nativeLabel: target(id).matchingLabel,
              answerExplanation: target(id).explanation,
            })),
          },
        ]),
      ),
    ),
    nouns.length
      ? step('overview', 'overview', STAGE_TEXTS.gender[0], [
          page('overview', T.overviewBase + T.genderPerWord * allIds.length, STAGE_TEXTS.gender[1], [
            {
              type: 'vocabulary_gender_select',
              itemId: 'gender',
              targetIds: allIds,
              // Nouns always have a gender explanation (checked by the brief validation).
              rows: nouns.map((n) => ({ targetId: n.id, answerExplanation: n.genderExplanation! })),
            },
          ]),
        ])
      : step('overview', 'overview', STAGE_TEXTS.overview[0], [
          page('overview', T.overviewBase + T.overviewPerWord * allIds.length, STAGE_TEXTS.overview[1], [
            { type: 'vocabulary_overview', itemId: 'overview', targetIds: allIds },
          ]),
        ]),
    step(
      'practice',
      'exercise',
      STAGE_TEXTS.practice[0],
      brief.targets.map((t) =>
        page(`gap-${t.id}`, T.gapPage, STAGE_TEXTS.practice[1], [
          {
            type: 'vocabulary_typed_gap',
            itemId: `gap-${t.id}`,
            targetId: t.id,
            before: t.gap.before,
            after: t.gap.after,
            referenceTargetIds: t.gap.referenceTargetIds,
            accepted: t.gap.accepted,
            answerExplanation: t.gap.explanation,
          },
        ]),
      ),
    ),
    step(
      'listening',
      'exercise',
      STAGE_TEXTS.listening[0],
      brief.targets.map((t) =>
        page(`listen-${t.id}`, T.listeningPage, STAGE_TEXTS.listening[1], [
          {
            type: 'vocabulary_listening_choice',
            itemId: `listen-${t.id}`,
            targetId: t.id,
            optionTargetIds: t.listeningOptionTargetIds,
            answerExplanation: t.explanation,
          },
        ]),
      ),
      'practice',
    ),
    step('exam', 'exam', STAGE_TEXTS.exam[0], [
      ...examChunks.map(({ key, ids }) =>
        page(
          `exam-${key}`,
          T.translationPerWord * ids.length,
          STAGE_TEXTS.exam[1],
          ids.map((id) => ({
            type: 'vocabulary_translation_exam' as const,
            itemId: `exam-${id}`,
            targetId: id,
            prompt: examPrompt(id),
            accepted: accepted(id, examPrompt(id)),
            answerExplanation: target(id).explanation,
          })),
          T.translationLimitPerWord * ids.length,
        ),
      ),
      ...examChunks.map(({ key, ids }) =>
        page(
          `dictation-${key}`,
          T.dictationPerWord * ids.length,
          STAGE_TEXTS.dictation[1],
          ids.map((id) => ({
            type: 'vocabulary_listening_dictation' as const,
            itemId: `dictation-${id}`,
            targetId: id,
            accepted: accepted(id),
            answerExplanation: target(id).explanation,
          })),
          T.dictationLimitPerWord * ids.length,
        ),
      ),
    ]),
  ]

  return {
    schemaVersion: brief.schemaVersion,
    id: brief.id,
    lang: brief.lang,
    level: brief.level,
    locales: brief.locales,
    title: brief.title,
    objective: brief.objective,
    estimatedMinutes: lessonMinutes(steps),
    kind: 'vocabulary',
    theme: brief.theme,
    provenance: { ...brief.provenance, inputHashes: { ...brief.provenance.inputHashes } },
    steps,
  }
}
