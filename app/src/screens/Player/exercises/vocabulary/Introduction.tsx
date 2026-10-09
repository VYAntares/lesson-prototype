import { RichText } from '../../../../components/text/RichText'
import { useI18n } from '../../../../lib/i18n'
import type { ExerciseProps } from '../types'

/** vocabulary_introduction: short text introducing a group of words. */
export function Introduction({ item, plan }: ExerciseProps<'vocabulary_introduction'>) {
  const { locale } = useI18n()
  return <RichText text={item.text[locale]} lang={plan.lang} className="rich-text explanation-text" />
}
