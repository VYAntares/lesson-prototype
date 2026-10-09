import type { ComponentType } from 'react'
import type { ItemType } from '../../../lib/lesson/plan'
import { ErrorSpotter } from './grammar/ErrorSpotter'
import { Explanation } from './grammar/Explanation'
import { FeedbackPlaceholder } from './grammar/FeedbackPlaceholder'
import { GapChoice } from './grammar/GapChoice'
import { GapTyping } from './grammar/GapTyping'
import { PersonMatching } from './grammar/PersonMatching'
import { PronounFormMatch } from './grammar/PronounFormMatch'
import { PronounFormTyping } from './grammar/PronounFormTyping'
import { WordOrder } from './grammar/WordOrder'
import type { ExerciseProps } from './types'
import { Flashcards } from './vocabulary/Flashcards'
import { GenderSelect } from './vocabulary/GenderSelect'
import { Introduction } from './vocabulary/Introduction'
import { ListeningChoice } from './vocabulary/ListeningChoice'
import { ListeningDictation } from './vocabulary/ListeningDictation'
import { Matching } from './vocabulary/Matching'
import { Overview } from './vocabulary/Overview'
import { TranslationExam } from './vocabulary/TranslationExam'
import { TypedGap } from './vocabulary/TypedGap'

/** One component per item type. Add new exercise types here. */
export const EXERCISES: { [T in ItemType]: ComponentType<ExerciseProps<T>> } = {
  vocabulary_introduction: Introduction,
  vocabulary_flashcards: Flashcards,
  vocabulary_overview: Overview,
  vocabulary_matching: Matching,
  vocabulary_gender_select: GenderSelect,
  vocabulary_typed_gap: TypedGap,
  vocabulary_listening_choice: ListeningChoice,
  vocabulary_translation_exam: TranslationExam,
  vocabulary_listening_dictation: ListeningDictation,
  grammar_explanation: Explanation,
  production_feedback_placeholder: FeedbackPlaceholder,
  grammar_person_matching: PersonMatching,
  grammar_pronoun_form_match: PronounFormMatch,
  grammar_pronoun_form_typing: PronounFormTyping,
  grammar_gap_choice: GapChoice,
  grammar_gap_typing: GapTyping,
  grammar_word_order: WordOrder,
  grammar_error_spotter: ErrorSpotter,
}

/** Renders the component for `props.item.type`. */
export function Exercise(props: ExerciseProps) {
  const Component = EXERCISES[props.item.type] as ComponentType<ExerciseProps>
  return <Component {...props} />
}
