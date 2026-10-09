import { VoiceHelpSteps } from '../../components/voice/VoiceHelpSteps'
import { useI18n } from '../../lib/i18n'
import { reviewColor } from '../../lib/reviewColor'
import type { Plan } from '../../lib/lesson/plan'
import { usePreferences } from '../../lib/preferences'
import { isListeningPage } from '../../lib/session/reducer'
import { useVoiceStatus } from '../../lib/speech'
import type { LocalizedText } from '../../schemas/common'
import { NewVerbsTable } from './exercises/grammar/NewVerbsTable'

type FlowStep = { key: string; label: LocalizedText; role: string; types: string[]; seconds: number; pages: number; units: number }

/** Grammar lesson flow: one row per block (or step), with its exercise types and duration. */
function lessonFlow(plan: Plan): FlowStep[] {
  const steps: FlowStep[] = []
  for (const page of plan.pages) {
    if (page.special || page.items.some((i) => i.type === 'production_feedback_placeholder')) continue
    const key = page.blockId ?? page.stepId
    let step = steps.at(-1)
    if (step?.key !== key) {
      step = { key, label: page.stepLabel, role: page.role, types: [], seconds: 0, pages: 0, units: 0 }
      steps.push(step)
    }
    if (page.role === 'exam') step.role = 'exam'
    for (const item of page.items) if (!step.types.includes(item.type)) step.types.push(item.type)
    step.seconds += page.estimatedDurationS
    step.pages += 1
    step.units += page.units.length
  }
  return steps
}

type Props = {
  plan: Plan
  level: string
  /** A saved session can be resumed. */
  resumable: boolean
  notice?: string
  onStart: () => void
  onResume: () => void
}

/** Lesson overview before starting: objective, word groups or lesson flow, start/resume. */
export function StartScreen({ plan, level, resumable, notice, onStart, onResume }: Props) {
  const { t, locale, languageName } = useI18n()
  const { motherTongue } = usePreferences()
  const voice = useVoiceStatus(plan.lang)
  const needsVoice = plan.pages.some(isListeningPage)
  return (
    <section className="task-card start-card" aria-labelledby="start-title">
      <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level })}</p>
      <span className="kind-badge">{t(`kind.${plan.kind}`)}</span>
      <h1 id="start-title" lang={plan.lang}>
        {plan.title}
      </h1>
      <p className="lead">{plan.objective[locale]}</p>
      <p className="muted">
        {t('session.minutes', { minutes: plan.estimatedMinutes })}
        {plan.targets.size > 0 && <> · {t('session.vocabularyCount', { count: plan.targets.size })}</>}
      </p>
      {plan.groups.length > 0 && (
        <>
          <h2 className="small-heading">{t('session.groups')}</h2>
          <ol className="group-list">
            {plan.groups.map((group, i) => (
              <li key={group.id} style={reviewColor(i)}>
                <span>{group.label[locale]}</span>
                <small>{t('session.vocabularyCount', { count: group.targetIds.length })}</small>
              </li>
            ))}
          </ol>
        </>
      )}
      {plan.kind === 'grammar' && <NewVerbsTable plan={plan} motherTongue={motherTongue} />}
      {plan.kind === 'grammar' && (
        <>
          <h2 className="small-heading">{t('session.lessonFlow')}</h2>
          <ol className="group-list flow-list">
            {lessonFlow(plan).map((step, i) => (
              <li key={i} style={reviewColor(i)}>
                <span>
                  {step.label[locale]}
                  <small className="flow-detail">
                    {step.role === 'exam'
                      ? t('activity.exam', { count: step.units, pages: step.pages })
                      : step.types
                          .filter((type) => type !== 'grammar_explanation')
                          .map((type) => t(`exercise.${type}`))
                          .join(' · ')}
                  </small>
                </span>
                <small>{t('session.flowMinutes', { minutes: Math.max(1, Math.round(step.seconds / 60)) })}</small>
              </li>
            ))}
          </ol>
        </>
      )}
      {notice && (
        <p className="note" role="note">
          {notice}
        </p>
      )}
      {needsVoice && voice === 'checking' ? (
        <p className="muted" role="status">
          {t('session.voiceChecking')}
        </p>
      ) : needsVoice && voice === 'unavailable' ? (
        <div className="voice-help voice-required" role="alert">
          <h2 className="small-heading">{t('session.voiceHelpTitle')}</h2>
          <p>{t('session.voiceRequired')}</p>
          <VoiceHelpSteps />
        </div>
      ) : resumable ? (
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
          {t('session.continue')}
        </button>
      )}
    </section>
  )
}
