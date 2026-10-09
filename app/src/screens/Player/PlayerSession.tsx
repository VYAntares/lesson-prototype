import { useEffect } from 'react'
import { StatusMessage } from '../../components/layout/StatusMessage'
import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import { routes } from '../../lib/router'
import type { SessionRecord } from '../../lib/session/types'
import { useSession } from '../../lib/session/useSession'
import { useVoiceStatus } from '../../lib/speech'
import { Results } from './Results'
import { TaskPage } from './TaskPage'

type Props = {
  plan: Plan
  initial: SessionRecord
  onRestart: () => void
  /** Reports whether the lesson is in progress (header shows "Cancel lesson"). */
  onPhase: (inProgress: boolean) => void
}

/** A running (or finished) lesson try. */
export function PlayerSession({ plan, initial, onRestart, onPhase }: Props) {
  const { t, locale } = useI18n()
  const voice = useVoiceStatus(plan.lang)
  const { record, dispatch, saveFailed, remainingMs } = useSession(plan, initial, locale, voice)
  useEffect(() => onPhase(record.phase !== 'results'), [record.phase, onPhase])
  return (
    <>
      {saveFailed && <StatusMessage>{t('session.saveFailed')}</StatusMessage>}
      {record.phase === 'results' ? (
        <>
          <Results plan={plan} record={record} dispatch={dispatch} />
          <div className="task-footer results-footer">
            <button type="button" className="button button-outline" onClick={onRestart}>
              {t('session.restart')}
            </button>
            <a className="button button-primary" href={routes.index()}>
              {t('action.lessonOverview')}
            </a>
          </div>
        </>
      ) : (
        <TaskPage plan={plan} record={record} dispatch={dispatch} remainingMs={remainingMs} voiceStatus={voice} />
      )}
    </>
  )
}
