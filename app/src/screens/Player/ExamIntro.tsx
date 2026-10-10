import { useI18n } from '../../lib/i18n'
import type { Plan, PlanPage } from '../../lib/lesson/plan'

/** Before the final quiz: how many questions, no hints, no timer, and how the score works. */
export function ExamIntro({ plan, page }: { plan: Plan; page: PlanPage }) {
  const { t } = useI18n()
  const count = plan.pages.filter((p) => p.role === 'exam' && p.stepId === page.stepId).reduce((n, p) => n + p.units.length, 0)
  return (
    <ul className="exam-intro">
      <li>
        <span className="exam-intro-icon" aria-hidden="true">?</span>
        {t('examIntro.count', { count })}
      </li>
      <li>
        <span className="exam-intro-icon" aria-hidden="true">∞</span>
        {t('examIntro.noHints')}
      </li>
      <li>
        <span className="exam-intro-icon" aria-hidden="true">★</span>
        {t('examIntro.scoreNote')}
      </li>
    </ul>
  )
}
