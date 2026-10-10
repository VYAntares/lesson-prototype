import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import { isListeningPage } from '../../lib/session/reducer'
import { useVoiceStatus } from '../../lib/speech'
import { lessonOutline } from './outline'

type Props = {
  plan: Plan
  level: string
  /** A saved session can be resumed. */
  resumable: boolean
  notice?: string
  onStart: () => void
  onResume: () => void
}

/** Before starting: what the lesson is about and its points. A missing voice never blocks it. */
export function StartScreen({ plan, level, resumable, notice, onStart, onResume }: Props) {
  const { t, locale, languageName } = useI18n()
  const voice = useVoiceStatus(plan.lang)
  const needsVoice = plan.pages.some(isListeningPage)
  const points = lessonOutline(plan).filter((g) => !g.exam)
  const minutes = Math.max(1, Math.round(plan.pages.reduce((s, p) => s + p.estimatedDurationS, 0) / 60))

  return (
    <section className="start-card" aria-labelledby="start-title">
      <div className="start-meta">
        <span className={`kind-badge badge-${plan.kind}`}>{t(`kind.${plan.kind}`)}</span>
        <span className="muted">{t('index.courseLabel', { language: languageName(plan.lang), level })}</span>
        <span className="muted">· {t('start.about', { minutes })}</span>
      </div>
      <h1 id="start-title" lang={plan.lang}>
        {plan.title}
      </h1>
      <p className="lead">{plan.objective[locale]}</p>

      <h2 className="small-heading">{t('start.points')}</h2>
      <ol className="start-points">
        {points.map((group, i) => (
          <li key={group.key}>
            <span className="start-point-number">{i + 1}</span>
            <span>{'key' in group.label ? t(group.label.key) : group.label.text[locale]}</span>
          </li>
        ))}
        <li className="is-exam">
          <span className="start-point-number">★</span>
          <span>{t('player.exam')}</span>
        </li>
      </ol>

      {notice && (
        <p className="note" role="note">
          {notice}
        </p>
      )}
      {needsVoice && voice === 'unavailable' && (
        <p className="note voice-note" role="note">
          {t('voice.startNote')}
        </p>
      )}
      {resumable ? (
        <div className="start-actions">
          <button type="button" className="button button-primary" onClick={onResume}>
            {t('session.resume')}
          </button>
          <button type="button" className="button button-outline" onClick={onStart}>
            {t('session.restart')}
          </button>
        </div>
      ) : (
        <button type="button" className="button button-primary button-wide" onClick={onStart}>
          {t('start.start')}
        </button>
      )}
    </section>
  )
}
