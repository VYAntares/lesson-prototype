import { useI18n } from '../../lib/i18n'
import { reviewColor } from '../../lib/reviewColor'
import type { Plan, PlanPage } from '../../lib/lesson/plan'

/** Overview shown before the timed exam pages. */
export function ExamIntro({ plan, page }: { plan: Plan; page: PlanPage }) {
  const { t } = useI18n()
  const examPages = plan.pages.filter((p) => p.role === 'exam' && p.stepId === page.stepId)
  const kindOf = (p: PlanPage) => {
    const types = new Set(p.units.map((u) => u.itemType))
    return types.size === 1 && types.has('vocabulary_translation_exam')
      ? 'examIntro.translation'
      : types.size === 1 && types.has('vocabulary_listening_dictation')
        ? 'examIntro.dictation'
        : 'examIntro.mixed'
  }
  const words = new Set(examPages.flatMap((p) => p.items.flatMap((i) => ('targetId' in i ? [i.targetId] : []))))
  const tasks = examPages.reduce((sum, p) => sum + p.units.length, 0)
  const limit = (s: number) =>
    s % 60 ? t('unit.minutesSeconds', { m: Math.floor(s / 60), s: s % 60 }) : t('unit.minutes', { n: s / 60 })
  return (
    <div className="exam-intro">
      <p className="lead">
        {plan.targets.size > 0 ? t('examIntro.words', { count: words.size, tasks }) : t('examIntro.tasks', { tasks })}
      </p>
      <ol className="group-list">
        {examPages.map((p, i) => (
          <li key={p.pageId} style={reviewColor(i)}>
            <span>
              {t(kindOf(p))} · {t('examIntro.items', { count: p.units.length })}
            </span>
            <small>{t('examIntro.limit', { time: limit(p.timeLimitS ?? 0) })}</small>
          </li>
        ))}
      </ol>
      <p className="muted">{t('examIntro.rules')}</p>
    </div>
  )
}
