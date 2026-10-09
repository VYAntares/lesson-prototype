import { useI18n } from '../../../../lib/i18n'
import type { LocalizedText } from '../../../../schemas/common'
import type { ExerciseMode } from '../types'

/** Cue shown above a gap sentence (never in the exam). */
export function GapHint({ hint, mode }: { hint: LocalizedText | null; mode: ExerciseMode }) {
  const { t, locale } = useI18n()
  if (!hint || mode === 'exam') return null
  return (
    <p className="muted gap-hint">
      {t('session.hint')} {hint[locale]}
    </p>
  )
}
