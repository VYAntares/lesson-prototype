import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit, UnitOption } from '../../../../lib/lesson/plan'
import { seededShuffle } from '../../../../lib/random'
import type { ExerciseContext } from '../types'
import { inlineOutcome, isLocked, responseOf } from './answerState'

/** Option text: interface message, or text in the learning language. */
export function OptionLabel({ option, lang }: { option: UnitOption; lang: string }) {
  const { t } = useI18n()
  if (option.lang === 'ui') return <>{t(option.text)}</>
  return <span lang={option.lang === 'learning' ? lang : undefined}>{option.text}</span>
}

/** Radio buttons for a choice unit, in a stable shuffled order. */
export function ChoiceList({ unit, props, label }: { unit: ChoiceUnit; props: ExerciseContext; label: string }) {
  const { t } = useI18n()
  const options = seededShuffle(unit.options, props.seed, unit.id)
  const value = responseOf<string>(props, unit) ?? ''
  const showState = !!inlineOutcome(props, unit)
  const stateClass = (id: string) =>
    showState ? (unit.correct.includes(id) ? ' is-right' : value === id ? ' is-wrong' : '') : ''
  return (
    <fieldset className="choices" disabled={isLocked(props, unit)}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => {
        const target = option.lang === 'learning' ? props.plan.targets.get(option.id) : undefined
        return (
          <label key={option.id} className={`choice${stateClass(option.id)}`}>
            <input
              type="radio"
              name={unit.id}
              value={option.id}
              checked={value === option.id}
              onChange={() => props.onChange(unit.id, option.id)}
            />
            <OptionLabel option={option} lang={props.plan.lang} />
            {target?.genders.length ? (
              <small className="choice-gender">{target.genders.map((g) => t(`gender.${g}`)).join(' / ')}</small>
            ) : null}
          </label>
        )
      })}
    </fieldset>
  )
}
