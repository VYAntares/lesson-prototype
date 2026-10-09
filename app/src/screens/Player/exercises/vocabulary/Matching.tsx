import { MatchingBoard } from '../shared/MatchingBoard'
import type { ExerciseProps } from '../types'

/** vocabulary_matching: match each word with its translation. */
export function Matching(props: ExerciseProps<'vocabulary_matching'>) {
  return <MatchingBoard {...props} />
}
