import { WordTable } from '../shared/WordTable'
import type { ExerciseProps } from '../types'

/** vocabulary_overview: all words of the lesson (lessons without nouns). */
export function Overview({ item, plan, motherTongue }: ExerciseProps<'vocabulary_overview'>) {
  return <WordTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} showGender={false} />
}
