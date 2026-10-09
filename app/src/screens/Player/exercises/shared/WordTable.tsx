import { ListenButton } from '../../../../components/voice/ListenButton'
import { useI18n } from '../../../../lib/i18n'
import type { Plan } from '../../../../lib/lesson/plan'
import type { Locale } from '../../../../schemas/common'
import { genderList } from './answerState'

type Props = { ids: string[]; plan: Plan; motherTongue: Locale; showGender?: boolean }

/** Table of words with translation, gender and a listen button. */
export function WordTable({ ids, plan, motherTongue, showGender = true }: Props) {
  const { t } = useI18n()
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t('brief.col.target')}</th>
            <th scope="col">{t('brief.col.translation', { locale: t(`locale.${motherTongue}`) })}</th>
            {showGender && <th scope="col">{t('brief.col.gender')}</th>}
            <th scope="col">{t('session.audio')}</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const target = plan.targets.get(id)
            return (
              <tr key={id}>
                <th scope="row" lang={plan.lang}>
                  {target?.teachingForm ?? id}
                </th>
                <td>{target?.translations[motherTongue]?.join(' / ')}</td>
                {showGender && <td>{(target && genderList(target, t)) || '–'}</td>}
                <td>{target && <ListenButton text={target.teachingForm} lang={plan.lang} />}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
