import type { Unit } from '../../../../lib/lesson/plan'
import type { Response } from '../../../../lib/session/types'
import type { ExerciseContext } from '../types'

type State = Pick<ExerciseContext, 'drafts' | 'locked' | 'mode' | 'inlineFeedback'>

/** The checked answer, or the current draft. */
export const responseOf = <T extends Response>(p: State, unit: Unit) =>
  (p.locked[unit.id]?.response ?? p.drafts[unit.id]) as T | undefined

export const isLocked = (p: State, unit: Unit) => p.mode === 'feedback' || !!p.locked[unit.id]

/** Outcome to show on the input itself (inline feedback mode only). */
export const inlineOutcome = (p: State, unit: Unit) =>
  p.inlineFeedback && p.mode === 'feedback' ? (p.locked[unit.id]?.outcome ?? '') : ''

/** Human-readable version of a response, for feedback and results. */
export function responseText(unit: Unit, response: Response | undefined, t: (key: string) => string) {
  if (response == null) return ''
  switch (unit.kind) {
    case 'text':
      return response as string
    case 'choice': {
      const option = unit.options.find((o) => o.id === response)
      return option ? (option.lang === 'ui' ? t(option.text) : option.text) : ''
    }
    case 'order':
      return (response as string[]).map((id) => unit.tokens.find((tk) => tk.id === id)?.text).join(' ')
    case 'spot': {
      const answer = response as { tokenId: string; text: string }
      return unit.tokens.map((tk) => (tk.id === answer.tokenId ? `[${answer.text}]` : tk.text)).join(' ')
    }
  }
}

/** "masculine / feminine" in the interface language. */
export const genderList = (target: { genders: readonly string[] }, t: (key: string) => string) =>
  target.genders.map((g) => t(`gender.${g}`)).join(' / ')
