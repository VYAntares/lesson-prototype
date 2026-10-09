import type { SpotUnit } from '../../../../lib/lesson/plan'
import { ErrorSpotterAnswer } from '../shared/ErrorSpotterAnswer'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** grammar_error_spotter: find the wrong word and correct it. */
export function ErrorSpotter(props: ExerciseProps<'grammar_error_spotter'>) {
  return (
    <div className="units">
      {(props.units as SpotUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <ErrorSpotterAnswer unit={unit} props={props} />
        </UnitFrame>
      ))}
    </div>
  )
}
