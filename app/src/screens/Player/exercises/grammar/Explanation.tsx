import { RichText } from '../../../../components/text/RichText'
import { useI18n } from '../../../../lib/i18n'
import type { ExerciseProps } from '../types'
import { NewVerbsTable } from './NewVerbsTable'

/** grammar_explanation: rule explanation, optional form table and examples. */
export function Explanation({ item, plan, motherTongue, pageId }: ExerciseProps<'grammar_explanation'>) {
  const { locale, t } = useI18n()
  const isFirstExplanation =
    plan.pages.find((p) => p.items.some((i) => i.type === 'grammar_explanation'))?.pageId === pageId
  return (
    <>
      {isFirstExplanation && <NewVerbsTable plan={plan} motherTongue={motherTongue} />}
      <h3>{item.heading[locale]}</h3>
      <RichText text={item.text[locale]} lang={plan.lang} className="rich-text explanation-text" />
      {item.formTable.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('session.subject')}</th>
                <th scope="col">{t('session.form')}</th>
                <th scope="col">{t('brief.col.example')}</th>
              </tr>
            </thead>
            <tbody lang={plan.lang}>
              {item.formTable.map((row, i) => (
                <tr key={i}>
                  <th scope="row">{row.subject}</th>
                  <td>{row.form}</td>
                  <td>{row.example ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className="brief-list examples">
        {item.examples.map((example, i) => (
          <li key={i}>
            <strong lang={plan.lang}>{example.text}</strong>{' '}
            <span className="muted">– {example.translation[motherTongue]}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
