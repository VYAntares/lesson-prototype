import { useEffect, useState } from 'react'
import { StatusMessage } from '../../components/layout/StatusMessage'
import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import type { SessionRecord } from '../../lib/session/types'
import { useSession } from '../../lib/session/useSession'
import { useVoiceStatus } from '../../lib/speech'
import { LessonSidebar } from './LessonSidebar'
import { PlayerTopBar } from './PlayerTopBar'
import { Results } from './Results'
import { TaskPage } from './TaskPage'

type Props = {
  plan: Plan
  initial: SessionRecord
  onRestart: () => void
  /** Reports whether the lesson is in progress. */
  onPhase: (inProgress: boolean) => void
}

/** A running (or finished) lesson try: top bar, outline sidebar, and the page or the results. */
export function PlayerSession({ plan, initial, onRestart, onPhase }: Props) {
  const { t } = useI18n()
  const voice = useVoiceStatus(plan.lang)
  const { record, dispatch, saveFailed } = useSession(plan, initial, initial.motherTongue, voice)
  const finished = record.phase === 'results'
  /** A finished page opened from the sidebar, and where the lesson was then. */
  const [openedAt, setOpenedAt] = useState<{ index: number; at: string } | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  useEffect(() => onPhase(!finished), [finished, onPhase])
  // Moving on in the lesson always shows the new current page.
  const where = `${record.pageIndex}/${record.phase}`
  const opened = openedAt && openedAt.at === where ? openedAt.index : null
  const setOpened = (index: number | null) => setOpenedAt(index === null ? null : { index, at: where })

  const shownIndex = opened ?? (finished ? 'results' : record.pageIndex)
  const open = (target: number | 'results') =>
    setOpened(target === 'results' || (!finished && target === record.pageIndex) ? null : target)

  useEffect(() => {
    document.getElementById('main')?.scrollTo?.({ top: 0 })
    window.scrollTo?.({ top: 0 })
  }, [shownIndex])

  let body
  if (opened !== null)
    body = (
      <TaskPage
        plan={plan}
        record={record}
        dispatch={dispatch}
        review={{
          index: opened,
          onOpen: open,
          onExit: () => setOpened(null),
          exitLabel: t(finished ? 'player.backToResults' : 'player.backToLesson'),
        }}
      />
    )
  else if (finished) body = <Results plan={plan} record={record} onRestart={onRestart} />
  else body = <TaskPage plan={plan} record={record} dispatch={dispatch} voiceStatus={voice} />

  return (
    <div className="player">
      <PlayerTopBar plan={plan} record={record} outlineOpen={outlineOpen} onToggleOutline={() => setOutlineOpen((o) => !o)} />
      <div className="player-body">
        <LessonSidebar
          plan={plan}
          record={record}
          shownIndex={shownIndex}
          onOpen={open}
          open={outlineOpen}
          onClose={() => setOutlineOpen(false)}
        />
        <main id="main" tabIndex={-1} className="player-main">
          {saveFailed && <StatusMessage>{t('session.saveFailed')}</StatusMessage>}
          {body}
        </main>
      </div>
    </div>
  )
}

