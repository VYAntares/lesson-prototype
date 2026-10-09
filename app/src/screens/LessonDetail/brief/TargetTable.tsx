import { Lang } from '../../../components/text/Lang'
import type { LessonText } from '../../../lib/lessonText'
import type { VocabularyTarget } from '../../../schemas/brief'

type Props = { caption: string; targets: VocabularyTarget[]; lang: string; text: LessonText }

/** Words of one vocabulary group with their translations, gender and notes. */
export function TargetTable({ caption, targets, lang, text }: Props) {
  const { t, ui, native } = text
  return (
    <div className="table-wrap">
      <table className="data-table targets">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t('brief.col.target')}</th>
            <th scope="col">{t('brief.col.translation', { locale: t(`locale.${text.nativeLocale}`) })}</th>
            <th scope="col">{t('brief.col.wordClass')}</th>
            <th scope="col">{t('brief.col.gender')}</th>
            <th scope="col">{t('brief.col.difficulty')}</th>
            <th scope="col">{t('brief.col.details')}</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => {
            const notes = [
              target.pronunciation && t('brief.pronunciation', { value: target.pronunciation }),
              target.genderVariants.length > 0 &&
                t('brief.genderVariants', { list: target.genderVariants.join(', ') }),
              target.accentSensitive.length > 0 &&
                t('brief.accentSensitive', { list: target.accentSensitive.join(', ') }),
              target.articleException && t('brief.articleException', { reason: ui(target.articleException) }),
              target.ambiguityNote && t('brief.ambiguity', { note: ui(target.ambiguityNote) }),
            ].filter((n): n is string => !!n)
            return (
              <tr key={target.id}>
                <th scope="row">
                  <Lang lang={lang}>{target.teachingForm}</Lang>
                </th>
                <td>{(native(target.translations) ?? []).join(' / ')}</td>
                <td>{t(`wordClass.${target.wordClass}`)}</td>
                <td>
                  {target.genders.length
                    ? [target.genders.map((g) => t(`gender.${g}`)).join(' / '), target.number && t(`number.${target.number}`)]
                        .filter(Boolean)
                        .join(', ')
                    : '–'}
                </td>
                <td>
                  <span className={`badge difficulty-${target.difficulty}`}>{t(`difficulty.${target.difficulty}`)}</span>
                </td>
                <td className="target-details">
                  <p>
                    {t('brief.examForms')}{' '}
                    <Lang lang={lang}>
                      <strong className="answer">{target.examForms.join(' / ')}</strong>
                    </Lang>
                  </p>
                  <p>
                    <Lang lang={lang}>{target.context.sentence}</Lang>{' '}
                    <span className="muted">– {native(target.context.translation)}</span>
                  </p>
                  {notes.map((note, i) => (
                    <p key={i} className="muted">
                      {note}
                    </p>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
