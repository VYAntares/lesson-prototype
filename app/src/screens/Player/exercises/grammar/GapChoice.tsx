import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit } from '../../../../lib/lesson/plan'
import { ChoiceList } from '../shared/ChoiceList'
import { GapHint } from '../shared/GapHint'
import { GapSentence } from '../shared/GapSentence'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** grammar_gap_choice: pick the word that completes the sentence. */
export function GapChoice(props: ExerciseProps<'grammar_gap_choice'>) {
  const { t } = useI18n()
  return (
    <div className="units">
      <GapHint hint={props.item.hint} mode={props.mode} />
      {(props.units as ChoiceUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <GapSentence before={unit.prompt.before} after={unit.prompt.after} lang={props.plan.lang}>
            ____
          </GapSentence>
          <ChoiceList unit={unit} props={props} label={t('session.gapAnswer')} />
        </UnitFrame>
      ))}
    </div>
  )
}
