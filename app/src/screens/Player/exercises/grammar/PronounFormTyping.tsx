import { useI18n } from '../../../../lib/i18n'
import type { TextUnit } from '../../../../lib/lesson/plan'
import { TextAnswer } from '../shared/TextAnswer'
import type { ExerciseProps } from '../types'

/** grammar_pronoun_form_typing: type the verb form for each pronoun. */
export function PronounFormTyping(props: ExerciseProps<'grammar_pronoun_form_typing'>) {
  const { t, locale } = useI18n()
  const withInline = { ...props, inlineFeedback: true }
  return (
    <ul className="form-rows">
      {(props.units as TextUnit[]).map((unit) => {
        const outcome = props.mode === 'feedback' ? props.locked[unit.id]?.outcome : undefined
        return (
          <li key={unit.id} className="form-row">
            <span className="form-pronoun" lang={props.plan.lang}>
              {unit.prompt.learning}
            </span>
            <TextAnswer unit={unit} props={withInline} label={t('session.formFor', { pronoun: unit.prompt.learning ?? '' })} />
            {outcome && outcome !== 'fully_correct' && <p className="row-explanation">{unit.explanation[locale]}</p>}
          </li>
        )
      })}
    </ul>
  )
}
