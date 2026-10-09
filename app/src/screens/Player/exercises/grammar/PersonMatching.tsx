import { MatchingBoard } from '../shared/MatchingBoard'
import type { ExerciseProps } from '../types'

/** grammar_person_matching: match each verb form with its person (pronoun or translation). */
export function PersonMatching(props: ExerciseProps<'grammar_person_matching'>) {
  return <MatchingBoard {...props} />
}
