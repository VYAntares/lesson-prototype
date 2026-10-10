// Turns a lesson (grammar content file or compiled vocabulary lesson) into a flat
// list of pages. Each page holds "units": the individually scored answers.

import type { Brief, VocabularyTarget } from '../../schemas/brief'
import type { AcceptedAnswers, Locale, LocalizedText, NativeText } from '../../schemas/common'
import { lessonSteps, type GrammarItem, type Lesson, type VocabularyItem } from '../../schemas/lesson'

export type LessonItem = GrammarItem | VocabularyItem
export type ItemType = LessonItem['type']

/** Which language a text is in: the course language, the mother tongue, or a UI message key. */
export type TextLang = 'learning' | 'native' | 'ui'

export type UnitOption = { id: string; text: string; lang: TextLang }

export type UnitPrompt = { learning?: string; native?: string; before?: string; after?: string }

type UnitBase = {
  id: string
  itemId: string
  itemType: ItemType
  prompt: UnitPrompt
  /** Text to speak (listening tasks). */
  speak?: string
  explanation: LocalizedText
  /** Main expected answer, shown in feedback. */
  answer: string
  answerLang: TextLang
  ruleIds?: string[]
}

export type ChoiceUnit = UnitBase & {
  kind: 'choice'
  options: UnitOption[]
  correct: string[]
  /** Teaching form shown with gender answers. */
  form?: string
}
export type TextUnit = UnitBase & { kind: 'text'; accepted: AcceptedAnswers }
export type OrderUnit = UnitBase & { kind: 'order'; tokens: UnitOption[]; acceptedOrders: string[][] }
export type SpotUnit = UnitBase & {
  kind: 'spot'
  tokens: UnitOption[]
  faultyTokenId: string
  correction: { mode: 'type' | 'select'; accepted: AcceptedAnswers; choices: string[] }
}
export type Unit = ChoiceUnit | TextUnit | OrderUnit | SpotUnit

export type PageRole = 'presentation' | 'practice' | 'exam'

export type PlanPage = {
  index: number
  pageId: string
  stepId: string
  stepIndex: number
  stepLabel: LocalizedText
  blockId: string | null
  role: PageRole
  estimatedDurationS: number
  timeLimitS: number | null
  instructions: LocalizedText
  items: LessonItem[]
  units: Unit[]
  /** Synthetic page inserted before the exam. */
  special?: 'examIntro'
}

export type Plan = {
  lessonId: string
  lang: string
  title: string
  objective: LocalizedText
  estimatedMinutes: number
  kind: Lesson['kind']
  pages: PlanPage[]
  targets: Map<string, VocabularyTarget>
  groups: { id: string; label: LocalizedText; targetIds: string[] }[]
  newVerbs: { infinitive: string; translation: string }[]
  steps: { stepId: string; label: LocalizedText; role: PageRole }[]
}

const GENDERS = ['masculine', 'feminine', 'neuter'] as const

type PlanOptions = {
  interleaveGroups?: boolean
  examIntro?: boolean
  /** Exam countdowns. The redesigned player has none: the ten-minute lesson is the limit. */
  timers?: boolean
}

export function buildPlan(
  lesson: Lesson,
  brief: Brief,
  nativeLocale: string,
  { interleaveGroups = false, examIntro = false, timers = true }: PlanOptions = {},
): Plan {
  const targets = new Map<string, VocabularyTarget>(
    brief.kind === 'vocabulary' ? brief.targets.map((t) => [t.id, t]) : [],
  )
  /** Pick the mother-tongue text, falling back to the first available one. */
  const native = (text: NativeText | null | undefined) =>
    text?.[nativeLocale as Locale] ?? Object.values(text ?? {})[0] ?? ''
  const translation = (id: string) => targets.get(id)?.translations[nativeLocale as Locale]?.[0] ?? id
  const teachingForm = (id: string) => targets.get(id)?.teachingForm ?? id

  const unitsOf = (pageId: string, item: LessonItem): Unit[] => {
    const unitId = (suffix = '') => `${pageId}/${item.itemId}${suffix}`
    const base = { itemId: item.itemId, itemType: item.type }
    switch (item.type) {
      case 'vocabulary_matching': {
        const options = item.pairs.map((p) => ({
          id: p.targetId,
          text: native(p.nativeLabel) || translation(p.targetId),
          lang: 'native' as const,
        }))
        return item.pairs.map((p) => ({
          ...base,
          kind: 'choice',
          id: unitId(`/${p.targetId}`),
          prompt: { learning: teachingForm(p.targetId) },
          options,
          correct: [p.targetId],
          explanation: p.answerExplanation,
          answer: options.find((o) => o.id === p.targetId)!.text,
          answerLang: 'native',
        }))
      }
      case 'vocabulary_gender_select': {
        const lang = lesson.lang
        const options = GENDERS.filter((g) => g !== 'neuter' || lang === 'de').map((g) => ({
          id: g,
          text: `gender.${g}`,
          lang: 'ui' as const,
        }))
        // Only words that have a gender (team feedback).
        return item.rows.filter((row) => targets.get(row.targetId)?.genders.length).map((row) => {
          const target = targets.get(row.targetId)
          return {
            ...base,
            kind: 'choice',
            id: unitId(`/${row.targetId}`),
            prompt: { learning: target?.term ?? row.targetId },
            options,
            correct: [...(target?.genders ?? [])],
            explanation: row.answerExplanation,
            answer: `gender.${target?.genders[0] ?? 'masculine'}`,
            answerLang: 'ui',
            form: target?.teachingForm,
          }
        })
      }
      case 'vocabulary_typed_gap':
        return [
          {
            ...base,
            kind: 'text',
            id: unitId(),
            prompt: { before: item.before, after: item.after, native: translation(item.targetId) },
            accepted: item.accepted,
            explanation: item.answerExplanation,
            answer: item.accepted.answers[0],
            answerLang: 'learning',
          },
        ]
      case 'vocabulary_listening_choice':
        return [
          {
            ...base,
            kind: 'choice',
            id: unitId(),
            prompt: {},
            speak: teachingForm(item.targetId),
            options: item.optionTargetIds.map((id) => ({ id, text: teachingForm(id), lang: 'learning' })),
            correct: [item.targetId],
            explanation: item.answerExplanation,
            answer: teachingForm(item.targetId),
            answerLang: 'learning',
          },
        ]
      case 'vocabulary_translation_exam':
        return [
          {
            ...base,
            kind: 'text',
            id: unitId(),
            prompt: { native: native(item.prompt) },
            accepted: item.accepted,
            explanation: item.answerExplanation,
            answer: item.accepted.answers[0],
            answerLang: 'learning',
          },
        ]
      case 'vocabulary_listening_dictation':
        return [
          {
            ...base,
            kind: 'text',
            id: unitId(),
            prompt: {},
            speak: teachingForm(item.targetId),
            accepted: item.accepted,
            explanation: item.answerExplanation,
            answer: item.accepted.answers[0],
            answerLang: 'learning',
          },
        ]
      case 'grammar_person_matching': {
        const translationMode = item.mode === 'translation'
        const options = item.rows.map((r) => ({
          id: r.person as string,
          text: translationMode ? native(r.native) : (r.pronoun ?? ''),
          lang: (translationMode ? 'native' : 'learning') as TextLang,
        }))
        return item.rows.map((row) => ({
          ...base,
          kind: 'choice',
          id: unitId(`/${row.person}`),
          prompt: { learning: row.answer },
          options,
          // Rows with the same verb form are interchangeable.
          correct: item.rows.filter((r) => r.answer === row.answer).map((r) => r.person),
          explanation: row.answerExplanation,
          answer: options.find((o) => o.id === row.person)!.text,
          answerLang: options[0].lang,
        }))
      }
      case 'grammar_pronoun_form_match': {
        const options = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }))
        return item.rows.map((row) => ({
          ...base,
          kind: 'choice',
          id: unitId(`/${row.rowId}`),
          prompt: { learning: row.pronoun },
          options,
          correct: item.tokens.filter((t) => row.validForms.includes(t.text)).map((t) => t.tokenId),
          explanation: row.answerExplanation,
          answer: row.validForms[0],
          answerLang: 'learning',
        }))
      }
      case 'grammar_pronoun_form_typing':
        return item.rows.map((row) => ({
          ...base,
          kind: 'text',
          id: unitId(`/${row.rowId}`),
          prompt: { learning: row.pronoun },
          accepted: row.accepted,
          explanation: row.answerExplanation,
          answer: row.accepted.answers[0],
          answerLang: 'learning',
        }))
      case 'grammar_gap_choice':
        return [
          {
            ...base,
            kind: 'choice',
            id: unitId(),
            prompt: { before: item.before, after: item.after },
            options: item.choices.map((c) => ({ id: c.choiceId, text: c.text, lang: 'learning' })),
            correct: [item.answerChoiceId],
            explanation: item.answerExplanation,
            answer: item.choices.find((c) => c.choiceId === item.answerChoiceId)?.text ?? '',
            answerLang: 'learning',
          },
        ]
      case 'grammar_gap_typing':
        return [
          {
            ...base,
            kind: 'text',
            id: unitId(),
            prompt: { before: item.before, after: item.after },
            accepted: item.accepted,
            explanation: item.answerExplanation,
            answer: item.accepted.answers[0],
            answerLang: 'learning',
          },
        ]
      case 'grammar_word_order': {
        // A final "." that ends every accepted order is fixed, not a token to place.
        const lastId = item.acceptedOrders[0].at(-1)
        const fixedDot =
          item.tokens.find((t) => t.tokenId === lastId && t.text === '.') &&
          item.acceptedOrders.every((o) => o.at(-1) === lastId)
            ? lastId
            : undefined
        const tokens = item.tokens
          .filter((t) => t.tokenId !== fixedDot)
          .map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }))
        const acceptedOrders = item.acceptedOrders.map((o) => o.filter((id) => id !== fixedDot))
        return [
          {
            ...base,
            kind: 'order',
            id: unitId(),
            prompt: {},
            tokens,
            acceptedOrders,
            explanation: item.answerExplanation,
            answer: acceptedOrders[0].map((id) => tokens.find((t) => t.id === id)?.text ?? '').join(' '),
            answerLang: 'learning',
          },
        ]
      }
      case 'grammar_error_spotter': {
        const tokens = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }))
        const corrected = tokens
          .map((t) => (t.id === item.faultyTokenId ? item.correction.accepted.answers[0] : t.text))
          .join(' ')
        return [
          {
            ...base,
            kind: 'spot',
            id: unitId(),
            prompt: { learning: tokens.map((t) => t.text).join(' ') },
            tokens,
            faultyTokenId: item.faultyTokenId,
            correction: item.correction,
            explanation: item.answerExplanation,
            answer: corrected,
            answerLang: 'learning',
          },
        ]
      }
      case 'vocabulary_introduction':
      case 'vocabulary_flashcards':
      case 'vocabulary_overview':
      case 'grammar_explanation':
      case 'production_feedback_placeholder':
        return []
      default:
        throw Error(`No plan units defined for item type ${(item as LessonItem).type}`)
    }
  }

  const pages: PlanPage[] = []
  lessonSteps(lesson).forEach((step, stepIndex) => {
    for (const page of step.pages) {
      // The production feedback placeholder is an empty page: skipped.
      if (page.items.every((item) => item.type === 'production_feedback_placeholder')) continue
      const units = (page.items as LessonItem[]).flatMap((item) =>
        unitsOf(page.pageId, item).map((u) => ('ruleIds' in item ? { ...u, ruleIds: item.ruleIds } : u)),
      )
      pages.push({
        index: pages.length,
        pageId: page.pageId,
        stepId: step.id,
        stepIndex,
        stepLabel: step.label,
        blockId: ('blockId' in step ? step.blockId : null) ?? null,
        role: step.role === 'exam' ? 'exam' : units.length ? 'practice' : 'presentation',
        estimatedDurationS: page.estimatedDurationS,
        timeLimitS: timers ? page.timeLimitS : null,
        instructions: page.instructions,
        items: page.items,
        units,
      })
    }
  })
  if (interleaveGroups) interleaveIntroductionsAndFlashcards(pages)
  if (examIntro) insertExamIntro(pages)

  return {
    lessonId: lesson.id,
    lang: lesson.lang,
    title: lesson.title,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    pages,
    targets,
    kind: lesson.kind,
    groups:
      brief.kind === 'vocabulary'
        ? brief.groups.map((g) => ({ id: g.id, label: g.label, targetIds: g.targetIds }))
        : [],
    newVerbs:
      brief.kind === 'grammar'
        ? brief.newVerbs.map((v) => ({ infinitive: v.infinitive, translation: native(v.translations) }))
        : [],
    steps: lessonSteps(lesson).filter((step) => pages.some((p) => p.stepId === step.id)).map((step) => ({
      stepId: step.id,
      label: step.label,
      role:
        step.role === 'exam'
          ? 'exam'
          : pages.some((p) => p.stepId === step.id && p.role === 'practice')
            ? 'practice'
            : 'presentation',
    })),
  }
}

/** Adds an "exam intro" page right before the first exam page. */
function insertExamIntro(pages: PlanPage[]) {
  const at = pages.findIndex((p) => p.role === 'exam')
  if (at < 0) return
  const first = pages[at]
  pages.splice(at, 0, {
    index: at,
    pageId: 'exam-intro',
    stepId: first.stepId,
    stepIndex: first.stepIndex,
    stepLabel: first.stepLabel,
    blockId: null,
    role: 'presentation',
    estimatedDurationS: 20,
    timeLimitS: null,
    instructions: first.stepLabel,
    items: [],
    units: [],
    special: 'examIntro',
  })
  pages.forEach((p, i) => (p.index = i))
}

/** Plays introduction 1, flashcards 1, introduction 2, flashcards 2, … instead of all intros first. */
function interleaveIntroductionsAndFlashcards(pages: PlanPage[]) {
  const isIntro = (p: PlanPage) => p.items.some((i) => i.type === 'vocabulary_introduction')
  const isCards = (p: PlanPage) => p.items.some((i) => i.type === 'vocabulary_flashcards')
  const intros = pages.filter(isIntro)
  const cards = pages.filter(isCards)
  if (!intros.length || !cards.length) return
  const start = pages.findIndex((p) => isIntro(p) || isCards(p))
  const merged = Array.from({ length: Math.max(intros.length, cards.length) }, (_, i) => [intros[i], cards[i]])
    .flat()
    .filter((p): p is PlanPage => !!p)
  pages.splice(start, merged.length, ...merged)
  pages.forEach((p, i) => (p.index = i))
}
