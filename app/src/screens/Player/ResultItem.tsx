import { Fragment, type CSSProperties } from 'react'
import { useI18n } from '../../lib/i18n'
import type { Unit } from '../../lib/lesson/plan'
import type { LockedAnswer } from '../../lib/session/types'
import { responseText } from './exercises/shared/answerState'

const OUTCOME_LABEL = {
  fully_correct: 'feedback.correct',
  orthography_only: 'outcome.orthography_only',
  incorrect: 'outcome.incorrect',
  unanswered: 'outcome.unanswered',
} as const

/** Prompt of a unit for the result list, split on "→" into columns. */
export function resultPrompt(unit: Unit, t: (key: string) => string): string[] {
  const after = unit.prompt.after ?? ''
  const prompt =
    [
      unit.prompt.native,
      unit.prompt.learning,
      unit.prompt.before === undefined
        ? undefined
        : `${unit.prompt.before ?? ''} ____${/^[,.]/.test(after) ? '' : ' '}${after}`.trim(),
    ].find(Boolean) ?? (unit.speak ? t('session.typeWhatYouHear') : undefined)
  if (!prompt) return []
  return unit.itemType === 'vocabulary_gender_select' ? [`${prompt}:`] : prompt.split(/\s*→\s*/).map((p) => p.trim())
}

function PromptParts({ parts, columns, lang, arrows = true }: { parts: string[]; columns: number; lang?: string; arrows?: boolean }) {
  return parts.map((part, i) => (
    <Fragment key={i}>
      <span
        className="result-prompt"
        lang={lang}
        style={i === 0 ? ({ '--span': 2 * (columns - parts.length) + 1 } as CSSProperties) : undefined}
      >
        {part}
      </span>
      <span className="match-arrow" aria-hidden="true">
        {arrows ? '→' : ''}
      </span>
    </Fragment>
  ))
}

/** One checked answer in the results: prompt, right answer, the learner's answer and notes. */
export function ResultItem({ unit, locked, lang, columns }: { unit: Unit; locked: LockedAnswer; lang: string; columns: number }) {
  const { t, locale } = useI18n()
  const parts = resultPrompt(unit, t)
  const given = responseText(unit, locked.response, t)
  const answer = unit.answerLang === 'ui' ? t(unit.answer) : unit.answer
  const right = locked.outcome === 'fully_correct'

  if (unit.itemType === 'vocabulary_gender_select')
    return (
      <li className={`result-item outcome-${locked.outcome}`}>
        <span className="result-icon" aria-label={t(OUTCOME_LABEL[locked.outcome])}>
          {right ? '✓' : '✕'}
        </span>
        <div className="result-body">
          <div className="result-fix result-gender">
            <PromptParts parts={parts} columns={columns} lang={lang} arrows={false} />
            <span className="result-answer">
              {right ? (
                <strong className="match-right">
                  <span className="visually-hidden">{t('result.yourAnswer')}: </span>
                  {given}
                </strong>
              ) : (
                <span>
                  <s className="match-wrong">
                    <span className="visually-hidden">{t('result.yourAnswer')}: </span>
                    {given || t('result.noAnswer')}
                  </s>
                  <span className="match-arrow" aria-hidden="true">
                    {' → '}
                  </span>
                  <strong className="match-right">
                    <span className="visually-hidden">{t('result.correctAnswer')}: </span>
                    {answer}
                  </strong>
                </span>
              )}
            </span>
          </div>
          {!right && <p className="muted">{unit.explanation[locale]}</p>}
        </div>
      </li>
    )

  return (
    <li className={`result-item outcome-${locked.outcome}`}>
      <span className="result-icon" aria-label={t(OUTCOME_LABEL[locked.outcome])}>
        {right ? '✓' : locked.outcome === 'orthography_only' ? '!' : '✕'}
      </span>
      <div className="result-body">
        <div className="result-fix">
          <PromptParts parts={parts} columns={columns} lang={unit.prompt.native ? undefined : lang} />
          <span className="result-answer">
            <strong className="match-right">
              <span className="visually-hidden">{t('result.correctAnswer')}: </span>
              <span lang={unit.answerLang === 'learning' ? lang : undefined}>{answer}</span>
              {unit.kind === 'choice' && unit.form && <span lang={lang}> · {unit.form}</span>}
            </strong>
            {!right && (
              <span className="match-wrong">
                <span className="visually-hidden">{t('result.yourAnswer')}: </span>
                <s lang={lang}>{given || t('result.noAnswer')}</s>
              </span>
            )}
          </span>
        </div>
        {(locked.outcome === 'orthography_only' || locked.timedOut) && (
          <p className="result-notes">
            {locked.outcome === 'orthography_only' && <span className="result-note result-note-almost">{t('feedback.almost')}</span>}
            {locked.timedOut && <span className="result-note">{t('result.timedOut')}</span>}
          </p>
        )}
        {!right && <p className="muted">{unit.explanation[locale]}</p>}
      </div>
    </li>
  )
}
