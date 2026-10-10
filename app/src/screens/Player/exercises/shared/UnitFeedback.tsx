import type { ReactNode } from 'react'
import { useI18n } from '../../../../lib/i18n'
import type { Unit } from '../../../../lib/lesson/plan'
import type { LockedAnswer } from '../../../../lib/session/types'
import type { ExerciseContext } from '../types'
import { otherAnswers, responseText } from './answerState'

const OUTCOME_KEY = {
  fully_correct: 'outcome.fully_correct',
  orthography_only: 'outcome.orthography_only',
  incorrect: 'outcome.incorrect',
  unanswered: 'outcome.unanswered',
} as const
const OUTCOME_ICON = { fully_correct: '✓', orthography_only: '!', incorrect: '✕', unanswered: '✕' } as const

function AlsoAccepted({ unit, lang }: { unit: Unit; lang: string }) {
  const { t } = useI18n()
  const others = otherAnswers(unit, t)
  if (!others.length) return null
  return (
    <p className="also-accepted">
      {t('feedback.alsoAccepted', { answers: '' })}
      <span lang={unit.answerLang === 'learning' ? lang : undefined}>{others.join(' · ')}</span>
    </p>
  )
}

/** Feedback box below a checked unit: "Correct", or the right answer next to the learner's. */
export function UnitFeedback({ unit, locked, lang }: { unit: Unit; locked: LockedAnswer; lang: string }) {
  const { t, locale } = useI18n()
  if (locked.outcome === 'fully_correct')
    return (
      <div className="feedback outcome-fully_correct" role="status">
        <p className="feedback-title">
          <span aria-hidden="true">✓</span> {t('feedback.correct')}
        </p>
        <AlsoAccepted unit={unit} lang={lang} />
      </div>
    )
  const answer = unit.answerLang === 'ui' ? t(unit.answer) : unit.answer
  const given = responseText(unit, locked.response, t)
  return (
    <div className={`feedback outcome-${locked.outcome}`} role="status">
      <p className="feedback-title">
        <span aria-hidden="true">{OUTCOME_ICON[locked.outcome]}</span>{' '}
        {t(locked.outcome === 'orthography_only' ? 'feedback.almost' : OUTCOME_KEY[locked.outcome])}
      </p>
      <div className="fix-lines">
        <strong className="match-right">
          <span className="visually-hidden">{t('result.correctAnswer')}: </span>
          <span lang={unit.answerLang === 'learning' ? lang : undefined}>{answer}</span>
          {unit.kind === 'choice' && unit.form && <span lang={lang}> · {unit.form}</span>}
        </strong>
        <span className="match-wrong">
          <span className="visually-hidden">{t('result.yourAnswer')}: </span>
          <s lang={unit.kind !== 'choice' || unit.options[0]?.lang === 'learning' ? lang : undefined}>
            {given || t('session.noAnswer')}
          </s>
        </span>
      </div>
      <AlsoAccepted unit={unit} lang={lang} />
      <p className="explanation">{unit.explanation[locale]}</p>
    </div>
  )
}

/** Wraps one unit and adds its feedback box after checking. */
export function UnitFrame({ unit, props, children }: { unit: Unit; props: ExerciseContext; children: ReactNode }) {
  const locked = props.locked[unit.id]
  return (
    <div className="unit">
      {children}
      {props.mode === 'feedback' &&
        locked &&
        (!props.inlineFeedback || (unit.kind !== 'text' && unit.kind !== 'choice')) && (
          <UnitFeedback unit={unit} locked={locked} lang={props.plan.lang} />
        )}
    </div>
  )
}
