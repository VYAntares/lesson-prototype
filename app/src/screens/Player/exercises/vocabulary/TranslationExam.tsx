import type { TextUnit } from '../../../../lib/lesson/plan'
import { PromptedTextField } from '../shared/PromptedTextField'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** vocabulary_translation_exam: translate each word (with its article for nouns). */
export function TranslationExam(props: ExerciseProps<'vocabulary_translation_exam'>) {
  return (
    <div className="units">
      {(props.units as TextUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <PromptedTextField unit={unit} props={props} />
        </UnitFrame>
      ))}
    </div>
  )
}
