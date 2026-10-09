import { useI18n } from '../../../../lib/i18n'
import type { TextUnit } from '../../../../lib/lesson/plan'
import type { ExerciseContext } from '../types'
import { inlineOutcome, isLocked, responseOf } from './answerState'

const STATE_CLASS = { fully_correct: 'right', orthography_only: 'almost' } as Record<string, string>

/** Text input for a typed answer; with inline feedback, shows the right answer next to it. */
export function TextAnswer({ unit, props, label }: { unit: TextUnit; props: ExerciseContext; label: string }) {
  const { t } = useI18n()
  const outcome = inlineOutcome(props, unit)
  const input = (
    <input
      className={`text-input${outcome ? ` is-${STATE_CLASS[outcome] ?? 'wrong'}` : ''}`}
      lang={props.plan.lang}
      aria-label={label}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      value={responseOf<string>(props, unit) ?? ''}
      readOnly={isLocked(props, unit)}
      onChange={(e) => props.onChange(unit.id, e.target.value)}
    />
  )
  if (!outcome || outcome === 'fully_correct' || unit.itemType === 'vocabulary_typed_gap') return input
  return (
    <>
      {input}{' '}
      <strong className="inline-answer" lang={props.plan.lang}>
        <span className="visually-hidden">{t('result.correctAnswer')}: </span>
        {unit.answer}
      </strong>
    </>
  )
}
