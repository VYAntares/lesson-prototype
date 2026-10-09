import type { OrderUnit } from '../../../../lib/lesson/plan'
import { UnitFrame } from '../shared/UnitFeedback'
import { WordOrderAnswer } from '../shared/WordOrderAnswer'
import type { ExerciseProps } from '../types'

/** grammar_word_order: put the words in the right order. */
export function WordOrder(props: ExerciseProps<'grammar_word_order'>) {
  return (
    <div className="units">
      {(props.units as OrderUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <WordOrderAnswer unit={unit} props={props} />
        </UnitFrame>
      ))}
    </div>
  )
}
