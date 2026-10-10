import { useI18n } from '../../lib/i18n'
import type { Plan } from '../../lib/lesson/plan'
import { routes } from '../../lib/router'
import { progressPercent } from '../../lib/session/scoring'
import type { SessionRecord } from '../../lib/session/types'

type Props = { plan: Plan; record: SessionRecord; outlineOpen: boolean; onToggleOutline: () => void }

/** Quit, title and progress. No score while playing: it only appears at the end (team feedback). */
export function PlayerTopBar({ plan, record, outlineOpen, onToggleOutline }: Props) {
  const { t } = useI18n()
  const progress = progressPercent(plan, record)
  return (
    <header className="player-topbar">
      <button
        type="button"
        className="icon-only outline-toggle"
        aria-expanded={outlineOpen}
        aria-label={t(outlineOpen ? 'player.hideOutline' : 'player.showOutline')}
        onClick={onToggleOutline}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </button>
      <a className="icon-only" href={routes.index()} aria-label={t('player.quit')} title={t('player.quit')}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      </a>
      <p className="player-title" lang={plan.lang}>
        {plan.title}
      </p>
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
    </header>
  )
}
