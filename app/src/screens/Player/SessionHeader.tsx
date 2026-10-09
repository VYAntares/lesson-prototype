import { formatPercent, roundScore } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import { progressPercent, runningScore } from '../../lib/session/scoring'
import type { SessionRecord } from '../../lib/session/types'

/** Lesson title, progress bar and running score. */
export function SessionHeader({ plan, record }: { plan: Plan; record: SessionRecord }) {
  const { t, locale } = useI18n()
  const progress = progressPercent(plan, record)
  const score = runningScore(plan, record)
  return (
    <div className="session-header">
      <p className="session-title" lang={plan.lang}>
        {plan.title}
      </p>
      <div className="session-meters">
        <div
          className="progress"
          role="progressbar"
          aria-label={t('session.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="muted">{formatPercent(progress, locale).replace(/[.,]0%$/, '%')}</span>
        <span className="session-score" aria-label={t('session.scoreLabel')}>
          {t('session.score', { score: roundScore(score).toLocaleString(locale), total: 100 })}
        </span>
      </div>
    </div>
  )
}

/** Exam countdown (m:ss); turns red in the last ten seconds. */
export function Countdown({ remainingMs }: { remainingMs: number }) {
  const { t } = useI18n()
  const seconds = Math.ceil(remainingMs / 1000)
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <p className={`countdown${seconds <= 10 ? ' countdown-low' : ''}`} role="timer" aria-label={t('session.timeLeft', { time })}>
      {time}
    </p>
  )
}
