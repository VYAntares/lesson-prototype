import { useI18n } from '../../../../lib/i18n'
import type { TextUnit } from '../../../../lib/lesson/plan'
import { GapHint } from '../shared/GapHint'
import { GapSentence } from '../shared/GapSentence'
import { TextAnswer } from '../shared/TextAnswer'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** grammar_gap_typing: type the missing word. */
export function GapTyping(props: ExerciseProps<'grammar_gap_typing'>) {
  const { t } = useI18n()
  return (
    <div className="units">
      <GapHint hint={props.item.hint} mode={props.mode} />
      {(props.units as TextUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <GapSentence before={unit.prompt.before} after={unit.prompt.after} lang={props.plan.lang}>
            <TextAnswer unit={unit} props={props} label={t('session.gapAnswer')} />
          </GapSentence>
        </UnitFrame>
      ))}
    </div>
  )
}
