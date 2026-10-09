import { useI18n } from '../../../../lib/i18n'
import type { ExerciseProps } from '../types'

/** production_feedback_placeholder: reserved for personalised feedback in a later phase. */
export function FeedbackPlaceholder(_: ExerciseProps<'production_feedback_placeholder'>) {
  const { t } = useI18n()
  return <p className="placeholder-feedback">{t('session.productionPlaceholder')}</p>
}
