import { ListenButton } from '../../../../components/voice/ListenButton'
import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit } from '../../../../lib/lesson/plan'
import type { ExerciseProps } from '../types'

/** vocabulary_gender_select: choose the gender of each noun; after checking, review all words. */
export function GenderSelect(props: ExerciseProps<'vocabulary_gender_select'>) {
  const { t } = useI18n()
  const { item, units, plan, mode, motherTongue } = props
  const unitFor = (targetId: string) =>
    units.find((u): u is ChoiceUnit => u.kind === 'choice' && u.correct.length > 0 && u.id.endsWith(`/${targetId}`))
  const answerOf = (unitId: string) => props.locked[unitId]?.response ?? props.drafts[unitId]
  const checked = mode === 'feedback'
  const nounUnits = item.targetIds.map(unitFor).filter((u): u is ChoiceUnit => !!u)
  const correct = nounUnits.filter((u) => props.locked[u.id]?.outcome === 'fully_correct').length
  const optionClass = (unit: ChoiceUnit, option: string) => {
    if (!checked) return ''
    const chosen = answerOf(unit.id) === option
    const right = unit.correct.includes(option)
    return chosen && right ? ' is-right' : chosen ? ' is-wrong' : right ? ' is-answer' : ''
  }

  return (
    <div className="gender-page">
      <p className={`match-summary${checked ? '' : ' is-reserved'}`} aria-hidden={!checked || undefined}>
        <strong>{t('session.genderSummary', { correct, total: nounUnits.length })}</strong>
      </p>
      <ul className="gender-grid">
        {item.targetIds.map((id) => {
          const target = plan.targets.get(id)
          const unit = unitFor(id)
          const wrong = checked && !!unit && props.locked[unit.id]?.outcome !== 'fully_correct'
          // Before checking show the bare term; afterwards the form with its article.
          const spoken = checked ? (target?.teachingForm ?? id) : (target?.term ?? id)
          return (
            <li key={id} className={`gender-row${checked && unit ? (wrong ? ' is-wrong' : ' is-right') : ''}`}>
              <div className="gender-word">
                {target && (
                  <ListenButton text={spoken} lang={plan.lang} variant="icon" label={t('session.listenWord', { word: spoken })} />
                )}
                <span className="gender-label">
                  <span className={checked ? 'is-hidden' : undefined} aria-hidden={checked || undefined}>
                    <span className="gender-lemma" lang={plan.lang}>
                      {target?.term ?? id}
                    </span>
                  </span>
                  <span className={checked ? undefined : 'is-hidden'} aria-hidden={!checked || undefined}>
                    <span className="gender-lemma" lang={plan.lang}>
                      {target?.teachingForm ?? id}
                    </span>
                    <small className="muted">{target?.translations[motherTongue]?.join(' / ')}</small>
                  </span>
                </span>
              </div>
              {unit ? (
                <fieldset className="gender-options" disabled={checked || !!props.locked[unit.id]}>
                  <legend className="visually-hidden">{t('session.genderOf', { word: target?.term ?? id })}</legend>
                  {unit.options.map((option) => (
                    <label key={option.id} className={`gender-option${optionClass(unit, option.id)}`}>
                      <input
                        type="radio"
                        name={unit.id}
                        value={option.id}
                        checked={answerOf(unit.id) === option.id}
                        onChange={() => props.onChange(unit.id, option.id)}
                      />
                      <span>{t(option.text)}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <span className="muted">{t('session.noGender')}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
