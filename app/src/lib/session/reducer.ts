// Session state machine: answering → (feedback) → next page → … → results.

import type { Locale } from '../../schemas/common'
import type { Plan, PlanPage } from '../lesson/plan'
import { isAnswered, scoreUnit } from './scoring'
import type { SessionRecord, TimedAction } from './types'

type NewSession = {
  sessionId: string
  contentHash: string
  level: string
  motherTongue: Locale
  seed: number
  now: number
}

export function createSession(plan: Plan, s: NewSession): SessionRecord {
  return startExamTimer(
    plan,
    {
      version: 1,
      sessionId: s.sessionId,
      lessonId: plan.lessonId,
      contentHash: s.contentHash,
      lang: plan.lang,
      level: s.level,
      motherTongue: s.motherTongue,
      seed: s.seed,
      startedAt: s.now,
      updatedAt: s.now,
      status: 'active',
      pageIndex: 0,
      phase: 'answering',
      completed: [],
      skippedNoVoice: [],
      revealed: {},
      drafts: {},
      locked: {},
      exam: {},
      selection: 'exam',
    },
    s.now,
  )
}

/** The countdown of an exam page starts when the page opens (listening pages: once a voice is ready). */
function startExamTimer(plan: Plan, record: SessionRecord, now: number): SessionRecord {
  const page = plan.pages[record.pageIndex]
  if (!page || page.role !== 'exam' || !page.timeLimitS || isListeningPage(page) || record.exam[page.pageId]) return record
  return {
    ...record,
    exam: {
      ...record.exam,
      [page.pageId]: { startedAt: now, deadline: now + (page.timeLimitS ?? 0) * 1000, timedOut: false },
    },
  }
}

/** Practice pages where each item is a single answer (or a matching board): no separate feedback step when all correct. */
export function isSelfCheckingPage(page: PlanPage) {
  return (
    page.role === 'practice' &&
    page.items.length > 0 &&
    page.items.every(
      (item) =>
        item.type === 'vocabulary_matching' ||
        item.type === 'grammar_person_matching' ||
        page.units.filter((u) => u.itemId === item.itemId).length === 1,
    )
  )
}

/** Matching boards move on by themselves once all pairs are right. */
const MATCHING_TYPES = ['vocabulary_matching', 'grammar_person_matching', 'grammar_pronoun_form_match']
export function advancesWhenRight(page: PlanPage) {
  return isSelfCheckingPage(page) && page.items.every((item) => MATCHING_TYPES.includes(item.type))
}

/**
 * Other pages always show their feedback, even when right: the explanation and the other
 * accepted answers matter as much as the green tick.
 */
function allLockedCorrect(page: PlanPage, record: SessionRecord) {
  return advancesWhenRight(page) && page.units.every((u) => record.locked[u.id]?.outcome === 'fully_correct')
}

/** Every flashcard on the page has been turned at least once. */
export function allCardsRevealed(page: PlanPage, record: SessionRecord) {
  return page.items.every(
    (item) =>
      item.type !== 'vocabulary_flashcards' ||
      item.targetIds.every((id) => (record.revealed?.[`${page.pageId}/${item.itemId}`] ?? []).includes(id)),
  )
}

/** Pages that need speech synthesis (listening choice / dictation). */
export function isListeningPage(page: PlanPage) {
  return (
    page.units.length > 0 &&
    page.units.every(
      (u) => u.itemType === 'vocabulary_listening_choice' || u.itemType === 'vocabulary_listening_dictation',
    )
  )
}

function lockPage(page: PlanPage, record: SessionRecord, interfaceLanguage: Locale, timedOut: boolean): SessionRecord {
  const locked = { ...record.locked }
  for (const unit of page.units) {
    if (locked[unit.id]) continue
    const response = record.drafts[unit.id] ?? null
    locked[unit.id] = { response, ...scoreUnit(unit, response), timedOut, interfaceLanguage }
  }
  return { ...record, locked }
}

function nextPage(plan: Plan, record: SessionRecord, now: number): SessionRecord {
  const page = plan.pages[record.pageIndex]
  const completed = record.completed.includes(page.pageId) ? record.completed : [...record.completed, page.pageId]
  if (record.pageIndex + 1 >= plan.pages.length)
    return { ...record, completed, status: 'completed', phase: 'results', selection: 'exam' }
  return startExamTimer(plan, { ...record, completed, pageIndex: record.pageIndex + 1, phase: 'answering' }, now)
}

export function reduceSession(plan: Plan, record: SessionRecord, action: TimedAction): SessionRecord {
  if (action.type === 'select') return record.phase === 'results' ? { ...record, selection: action.selection } : record
  if (record.status !== 'active') return record
  const page = plan.pages[record.pageIndex]
  const now = action.now
  const deadline = page.role === 'exam' ? record.exam[page.pageId]?.deadline : undefined
  const expired = deadline !== undefined && now >= deadline
  let next: SessionRecord

  switch (action.type) {
    case 'draft': {
      const unit = page.units.find((u) => u.id === action.unitId)
      if (!unit || record.phase !== 'answering' || record.locked[unit.id] || expired) return record
      next = { ...record, drafts: { ...record.drafts, [unit.id]: action.response } }
      break
    }
    case 'voice_ready':
      if (!isListeningPage(page) || page.role !== 'exam' || !page.timeLimitS || record.exam[page.pageId]) return record
      next = {
        ...record,
        exam: {
          ...record.exam,
          [page.pageId]: { startedAt: now, deadline: now + (page.timeLimitS ?? 0) * 1000, timedOut: false },
        },
      }
      break
    case 'reveal': {
      const revealed = record.revealed?.[action.itemKey] ?? []
      if (!page.items.some((i) => `${page.pageId}/${i.itemId}` === action.itemKey) || revealed.includes(action.key))
        return record
      next = { ...record, revealed: { ...record.revealed, [action.itemKey]: [...revealed, action.key] } }
      break
    }
    case 'skip_no_voice': {
      if (!isListeningPage(page) || record.phase !== 'answering') return record
      // Skips this page and the listening pages right after it: one notice, not one per page.
      next = record
      do next = nextPage(plan, { ...next, skippedNoVoice: [...(next.skippedNoVoice ?? []), plan.pages[next.pageIndex].pageId] }, now)
      while (next.status === 'active' && isListeningPage(plan.pages[next.pageIndex]))
      break
    }
    case 'expire':
      if (!expired || record.phase !== 'answering') return record
      next = nextPage(
        plan,
        {
          ...lockPage(page, record, action.interfaceLanguage, true),
          exam: { ...record.exam, [page.pageId]: { ...record.exam[page.pageId], timedOut: true } },
        },
        now,
      )
      break
    case 'continue':
      if (page.role === 'presentation') {
        if (!allCardsRevealed(page, record)) return record
        next = nextPage(plan, record, now)
      } else if (page.role === 'exam') {
        if (isListeningPage(page) && page.timeLimitS && deadline === undefined) return record
        if (expired) return reduceSession(plan, record, { type: 'expire', now, interfaceLanguage: action.interfaceLanguage })
        next = nextPage(plan, lockPage(page, record, action.interfaceLanguage, false), now)
      } else if (record.phase === 'answering') {
        if (!page.units.every((u) => isAnswered(u, record.drafts[u.id]))) return record
        const checked = lockPage(page, record, action.interfaceLanguage, false)
        next = allLockedCorrect(page, checked) ? nextPage(plan, checked, now) : { ...checked, phase: 'feedback' }
      } else next = nextPage(plan, record, now)
  }
  return { ...next, updatedAt: now }
}
