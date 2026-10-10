import { ListenButton } from '../../../../components/voice/ListenButton'
import type { TextUnit } from '../../../../lib/lesson/plan'
import { PromptedTextField } from '../shared/PromptedTextField'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** vocabulary_listening_dictation: listen and write the word. */
export function ListeningDictation(props: ExerciseProps<'vocabulary_listening_dictation'>) {
  return (
    <div className="units">
      {(props.units as TextUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          {unit.speak && <ListenButton text={unit.speak} lang={props.plan.lang} size="large" />}
          <PromptedTextField unit={unit} props={props} />
        </UnitFrame>
      ))}
    </div>
  )
}
