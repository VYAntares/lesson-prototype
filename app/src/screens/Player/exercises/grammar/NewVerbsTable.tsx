import { useI18n } from '../../../../lib/i18n'
import type { Plan } from '../../../../lib/lesson/plan'
import type { Locale } from '../../../../schemas/common'

/** Verbs introduced by a grammar lesson (start screen and first explanation page). */
export function NewVerbsTable({ plan, motherTongue }: { plan: Plan; motherTongue: Locale }) {
  const { t } = useI18n()
  if (!plan.newVerbs.length) return null
  return (
    <div className="new-verbs">
      <h2 className="small-heading">{t('session.newVerbs')}</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('session.verb')}</th>
              <th scope="col">{t(`locale.${motherTongue}`)}</th>
            </tr>
          </thead>
          <tbody>
            {plan.newVerbs.map((verb) => (
              <tr key={verb.infinitive}>
                <th scope="row" lang={plan.lang}>
                  {verb.infinitive}
                </th>
                <td lang={motherTongue}>{verb.translation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
