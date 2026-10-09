import type { Plan, PlanPage, Unit, PageRole } from '../lesson/plan'
import { checkTypedAnswer, normalizeAnswer, type Outcome } from './answers'
import type { Response, SessionRecord } from './types'

/** Practice counts 35 %, the final exam 65 %; spelling-only mistakes earn half a point. */
export const SCORING = { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 } as const

export function isAnswered(unit: Unit, response: Response | undefined): boolean {
  if (response == null) return false
  switch (unit.kind) {
    case 'text':
      return typeof response === 'string' && normalizeAnswer(response) !== ''
    case 'choice':
      return typeof response === 'string' && response !== ''
    case 'order':
      return Array.isArray(response) && response.length === unit.tokens.length
    case 'spot':
      return (
        typeof response === 'object' &&
        !Array.isArray(response) &&
        !!response.tokenId &&
        normalizeAnswer(response.text) !== ''
      )
  }
}

export function scoreUnit(unit: Unit, response: Response | undefined): { outcome: Outcome; points: number } {
  if (!isAnswered(unit, response)) return { outcome: 'unanswered', points: 0 }
  const rightOrWrong = (ok: boolean) =>
    ok ? ({ outcome: 'fully_correct', points: 1 } as const) : ({ outcome: 'incorrect', points: 0 } as const)
  switch (unit.kind) {
    case 'text': {
      const check = checkTypedAnswer(response as string, unit.accepted)
      return { outcome: check.outcome, points: check.credit }
    }
    case 'choice':
      return rightOrWrong(unit.correct.includes(response as string))
    case 'order': {
      // Compare the resulting sentence, so identical words in either order are accepted.
      const sentence = (ids: string[]) => ids.map((id) => unit.tokens.find((t) => t.id === id)?.text).join(' ')
      return rightOrWrong(unit.acceptedOrders.some((order) => sentence(order) === sentence(response as string[])))
    }
    case 'spot': {
      const answer = response as { tokenId: string; text: string }
      if (answer.tokenId !== unit.faultyTokenId) return { outcome: 'incorrect', points: 0 }
      const check = checkTypedAnswer(answer.text, unit.correction.accepted)
      return unit.correction.mode === 'select'
        ? rightOrWrong(check.outcome === 'fully_correct')
        : { outcome: check.outcome, points: check.credit }
    }
  }
}

const skipped = (record: SessionRecord) => record.skippedNoVoice ?? []

/** Progress in percent, weighted by the estimated duration of completed pages. */
export function progressPercent(plan: Plan, record: SessionRecord) {
  if (record.status === 'completed') return 100
  const pages = plan.pages.filter((p) => !skipped(record).includes(p.pageId))
  const total = pages.reduce((sum, p) => sum + p.estimatedDurationS, 0)
  const done = pages.filter((p) => record.completed.includes(p.pageId)).reduce((sum, p) => sum + p.estimatedDurationS, 0)
  return total ? (100 * done) / total : 0
}

export type Tally = { earned: number; possible: number }

const tally = (units: Unit[], record: SessionRecord): Tally => ({
  earned: units.reduce((sum, u) => sum + (record.locked[u.id]?.points ?? 0), 0),
  possible: units.length,
})
const unitsWithRole = (plan: Plan, role: PageRole, record: SessionRecord) =>
  plan.pages.filter((p) => p.role === role && !skipped(record).includes(p.pageId)).flatMap((p) => p.units)
const percent = (t: Tally) => (t.possible ? (100 * t.earned) / t.possible : 0)

/** Score shown in the header while playing: practice points earned so far, out of 35. */
export function runningScore(plan: Plan, record: SessionRecord) {
  if (record.status === 'completed') return lessonScore(plan, record).total
  const practice = tally(unitsWithRole(plan, 'practice', record), record)
  return practice.possible ? (SCORING.practiceWeight * practice.earned) / practice.possible : 0
}

export function lessonScore(plan: Plan, record: SessionRecord) {
  const practice = tally(unitsWithRole(plan, 'practice', record), record)
  const exam = tally(unitsWithRole(plan, 'exam', record), record)
  const practiceScore = percent(practice)
  const examScore = percent(exam)
  return {
    practice,
    exam,
    practiceScore,
    examScore,
    total:
      practice.possible && exam.possible
        ? (SCORING.practiceWeight * practiceScore + SCORING.examWeight * examScore) / 100
        : practice.possible
          ? practiceScore
          : examScore,
    steps: plan.steps.map((step) => {
      const pages = plan.pages.filter((p) => p.stepId === step.stepId && !skipped(record).includes(p.pageId))
      return {
        stepId: step.stepId,
        role: step.role,
        tally: tally(
          pages.flatMap((p: PlanPage) => p.units),
          record,
        ),
        completed: pages.every((p) => record.completed.includes(p.pageId)),
      }
    }),
  }
}
