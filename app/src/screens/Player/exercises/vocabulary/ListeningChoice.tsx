import { ListenButton } from '../../../../components/voice/ListenButton'
import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit } from '../../../../lib/lesson/plan'
import { ChoiceList } from '../shared/ChoiceList'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** vocabulary_listening_choice: listen, then pick the word heard. */
export function ListeningChoice(props: ExerciseProps<'vocabulary_listening_choice'>) {
  const { t } = useI18n()
  return (
    <div className="units">
      {(props.units as ChoiceUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          {unit.speak && <ListenButton text={unit.speak} lang={props.plan.lang} />}
          <ChoiceList unit={unit} props={props} label={t('session.chooseHeard')} />
        </UnitFrame>
      ))}
    </div>
  )
}
