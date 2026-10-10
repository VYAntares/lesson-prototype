import { useI18n } from '../../../../lib/i18n'
import type { Plan } from '../../../../lib/lesson/plan'
import type { Locale } from '../../../../schemas/common'

/** Verbs introduced by a grammar lesson, as word chips (first explanation page). */
export function NewVerbsTable({ plan, motherTongue }: { plan: Plan; motherTongue: Locale }) {
  const { t } = useI18n()
  if (!plan.newVerbs.length) return null
  return (
    <div className="new-verbs">
      <p className="theory-label">{t('session.newVerbs')}</p>
      <ul className="word-chips">
        {plan.newVerbs.map((verb) => (
          <li key={verb.infinitive}>
            <strong lang={plan.lang}>{verb.infinitive}</strong>
            <span lang={motherTongue}>{verb.translation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
