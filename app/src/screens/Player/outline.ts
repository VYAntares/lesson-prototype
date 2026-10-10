// The lesson outline shown in the player's sidebar: the points studied, each with its steps.
// Grammar lessons group steps by block (explanation, then exercises); vocabulary lessons list
// their stages; the final quiz (with its intro) is always last.

import type { Plan, PlanPage } from '../../lib/lesson/plan'
import type { SessionRecord } from '../../lib/session/types'
import type { LocalizedText } from '../../schemas/common'

export type StepStatus = 'done' | 'current' | 'upcoming'

export type OutlineStep = {
  key: string
  /** A message key (theory, quiz) or the step's own label. */
  label: { key: string } | { text: LocalizedText }
  pages: number[]
}

export type OutlineGroup = {
  key: string
  label: { key: string } | { text: LocalizedText }
  steps: OutlineStep[]
  exam: boolean
}

const isTheory = (page: PlanPage) => page.items.some((i) => i.type === 'grammar_explanation')

/** "Typed gaps 2" → "Typed gaps": the number only told steps apart across blocks. */
export function stripNumber(text: LocalizedText): LocalizedText {
  return Object.fromEntries(Object.entries(text).map(([k, v]) => [k, v.replace(/\s+\d+$/, '')])) as LocalizedText
}

/** Vocabulary introductions and flashcards are played per word group: they are grouped by it. */
function wordGroupOf(plan: Plan, page: PlanPage) {
  const ids = page.items.flatMap((i) => ('targetIds' in i && (i.type === 'vocabulary_introduction' || i.type === 'vocabulary_flashcards') ? i.targetIds : []))
  return ids.length ? plan.groups.find((g) => g.targetIds.includes(ids[0])) : undefined
}

export function lessonOutline(plan: Plan): OutlineGroup[] {
  const groups: OutlineGroup[] = []
  for (const page of plan.pages) {
    const exam = page.role === 'exam' || page.special === 'examIntro'
    const wordGroup = exam ? undefined : wordGroupOf(plan, page)
    const groupKey = exam ? 'exam' : wordGroup ? `words-${wordGroup.id}` : (page.blockId ?? page.stepId)
    let group = groups.find((g) => g.key === groupKey)
    if (!group) {
      group = {
        key: groupKey,
        label: exam ? { key: 'player.exam' } : { text: wordGroup?.label ?? page.stepLabel },
        steps: [],
        exam,
      }
      groups.push(group)
    }
    const stepKey = exam ? 'exam' : page.stepId
    let step = group.steps.find((s) => s.key === stepKey)
    if (!step) {
      step = {
        key: stepKey,
        label: exam ? { key: 'player.exam' } : isTheory(page) ? { key: 'player.theory' } : { text: stripNumber(page.stepLabel) },
        pages: [],
      }
      group.steps.push(step)
    }
    step.pages.push(page.index)
  }
  return groups
}

export function isPageDone(plan: Plan, record: SessionRecord, index: number) {
  const id = plan.pages[index]?.pageId
  return record.status === 'completed' || record.completed.includes(id) || (record.skippedNoVoice ?? []).includes(id)
}

export function stepStatus(plan: Plan, record: SessionRecord, pages: number[]): StepStatus {
  if (pages.every((i) => isPageDone(plan, record, i))) return 'done'
  return pages.includes(record.pageIndex) ? 'current' : 'upcoming'
}

/** A page can be opened from the sidebar once it was reached. */
export function canOpen(plan: Plan, record: SessionRecord, index: number) {
  return isPageDone(plan, record, index) || index === record.pageIndex
}
