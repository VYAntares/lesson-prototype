import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import type { SessionRecord } from '../../lib/session/types'
import { canOpen, lessonOutline, stepStatus, type OutlineGroup, type OutlineStep, type StepStatus } from './outline'

type Props = {
  plan: Plan
  record: SessionRecord
  /** The page on screen (the current one, or a finished one being looked at again). */
  shownIndex: number | 'results'
  onOpen: (index: number | 'results') => void
  open: boolean
  onClose: () => void
}

function StatusIcon({ status }: { status: StepStatus }) {
  return (
    <span className={`outline-dot is-${status}`} aria-hidden="true">
      {status === 'done' ? (
        <svg viewBox="0 0 16 16" width="10" height="10">
          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

/** Every point of the lesson; finished steps can be opened again (team feedback). */
export function LessonSidebar({ plan, record, shownIndex, onOpen, open, onClose }: Props) {
  const { t, locale } = useI18n()
  const groups = lessonOutline(plan)
  const label = (l: OutlineGroup['label'] | OutlineStep['label']) => ('key' in l ? t(l.key) : l.text[locale])
  const finished = record.phase === 'results'
  /** Questions in a step (pages when it has none, like flashcards). */
  const count = (step: OutlineStep) => {
    const units = step.pages.reduce((n, i) => n + plan.pages[i].units.length, 0)
    return units || step.pages.length
  }

  const stepButton = (step: OutlineStep, text: string, className: string) => {
    const status = stepStatus(plan, record, step.pages)
    const target = step.pages.includes(record.pageIndex) && !finished ? record.pageIndex : step.pages[0]
    const shown = typeof shownIndex === 'number' && step.pages.includes(shownIndex)
    const enabled = canOpen(plan, record, target)
    return (
      <button
        type="button"
        className={`${className} is-${status}${shown ? ' is-shown' : ''}`}
        disabled={!enabled}
        aria-current={shown ? 'step' : undefined}
        onClick={() => {
          onOpen(target)
          onClose()
        }}
      >
        <StatusIcon status={status} />
        <span className="outline-text">{text}</span>
        {count(step) > 1 && <span className="outline-count">{count(step)}</span>}
      </button>
    )
  }

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <nav className={`lesson-sidebar${open ? ' is-open' : ''}`} aria-label={t('player.outline')}>
        <p className="sidebar-title">{t('player.outline')}</p>
        <ol className="outline">
          {groups.map((group, g) => {
            const single = group.steps.length === 1
            const groupStatus = stepStatus(plan, record, group.steps.flatMap((s) => s.pages))
            return (
              <li key={group.key} className={`outline-group is-${groupStatus}${group.exam ? ' is-exam' : ''}`}>
                {single ? (
                  stepButton(group.steps[0], label(group.label), 'outline-step outline-step-main')
                ) : (
                  <>
                    <p className="outline-group-title">
                      <span className="outline-number">{g + 1}</span>
                      {label(group.label)}
                    </p>
                    <ol className="outline-steps">
                      {group.steps.map((step) => (
                        <li key={step.key}>{stepButton(step, label(step.label), 'outline-step')}</li>
                      ))}
                    </ol>
                  </>
                )}
              </li>
            )
          })}
          {finished && (
            <li className="outline-group is-done">
              <button
                type="button"
                className={`outline-step outline-step-main is-done${shownIndex === 'results' ? ' is-shown' : ''}`}
                aria-current={shownIndex === 'results' ? 'step' : undefined}
                onClick={() => {
                  onOpen('results')
                  onClose()
                }}
              >
                <StatusIcon status="done" />
                <span className="outline-text">{t('player.results')}</span>
              </button>
            </li>
          )}
        </ol>
      </nav>
    </>
  )
}
