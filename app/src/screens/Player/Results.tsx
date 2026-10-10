import { useEffect, useRef, type CSSProperties } from 'react'
import { useI18n } from '../../lib/i18n'
import { useLastTry } from '../../lib/lastTry'
import type { Plan } from '../../lib/lesson/plan'
import { routes } from '../../lib/router'
import { lessonScore } from '../../lib/session/scoring'
import type { SessionRecord } from '../../lib/session/types'
import { resultPrompt, ResultItem } from './ResultItem'

/** ft_transcendence LESSON_PASS_MARK. */
const PASS_MARK = 70

/**
 * Short results (team feedback): the score, the quiz mistakes, and the way back. Every step can
 * be opened again from the outline to see its answers.
 */
export function Results({ plan, record, onRestart }: { plan: Plan; record: SessionRecord; onRestart: () => void }) {
  const { t, locale } = useI18n()
  const score = lessonScore(plan, record)
  /** The API stores a whole number from 0 to 100. */
  const total = Math.round(score.total)
  const passed = total >= PASS_MARK
  const { recordCompletion } = useLastTry()
  const recorded = useRef(false)
  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true
      recordCompletion(plan.lessonId, score.total)
    }
  }, [plan.lessonId, recordCompletion, score.total])

  const skipped = record.skippedNoVoice ?? []
  const mistakes = plan.pages
    .filter((p) => p.role === 'exam' && !skipped.includes(p.pageId))
    .flatMap((p) => p.units)
    .filter((u) => record.locked[u.id] && record.locked[u.id].outcome !== 'fully_correct')
  const columns = Math.max(1, ...mistakes.map((u) => resultPrompt(u, t).length))
  const pct = (n: number) => `${Math.round(n)} %`.replace(' ', locale === 'en' ? '' : ' ')

  return (
    <section className="results" aria-labelledby="results-title">
      <div className={`results-hero ${passed ? 'is-passed' : 'is-failed'}`}>
        <div className="score-ring" style={{ '--score': total } as CSSProperties}>
          <span className="score-value">{total}</span>
          <span className="score-max">/ 100</span>
        </div>
        <div className="results-text">
          <p className="task-eyebrow" lang={plan.lang}>
            {plan.title}
          </p>
          <h1 id="results-title">{t(passed ? 'results.passed' : 'results.notPassed')}</h1>
          {!passed && <p className="muted">{t('results.passHint')}</p>}
          {score.practice.possible > 0 && score.exam.possible > 0 && (
            <p className="results-breakdown">
              {t('results.breakdown', { practice: pct(score.practiceScore), exam: pct(score.examScore) })}
            </p>
          )}
        </div>
      </div>

      <h2 className="results-heading">{t('results.mistakes')}</h2>
      {mistakes.length ? (
        <ul className="result-list" style={{ '--parts': columns } as CSSProperties}>
          {mistakes.map((unit) => (
            <ResultItem key={unit.id} unit={unit} locked={record.locked[unit.id]} lang={plan.lang} columns={columns} />
          ))}
        </ul>
      ) : (
        <p className="results-perfect">{t('results.perfect')}</p>
      )}
      <p className="muted results-hint">{t('results.reviewHint')}</p>

      <div className="results-actions">
        <button type="button" className="button button-outline" onClick={onRestart}>
          {t('session.restart')}
        </button>
        <a className="button button-primary" href={routes.index()}>
          {t('action.lessonOverview')}
        </a>
      </div>
    </section>
  )
}
