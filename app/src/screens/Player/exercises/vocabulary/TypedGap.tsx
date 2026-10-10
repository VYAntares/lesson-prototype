import { useI18n } from '../../../../lib/i18n'
import type { TextUnit } from '../../../../lib/lesson/plan'
import { seededShuffle } from '../../../../lib/random'
import { GapSentence } from '../shared/GapSentence'
import { TextAnswer } from '../shared/TextAnswer'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

/** vocabulary_typed_gap: the sentence first (team feedback), then the four words to choose from. */
export function TypedGap(props: ExerciseProps<'vocabulary_typed_gap'>) {
  const { t } = useI18n()
  const { item, plan } = props
  const solved = props.celebrating || props.units.some((u) => props.locked[u.id])
  return (
    <div className="units">
      {(props.units as TextUnit[]).map((unit) => (
        <UnitFrame key={unit.id} unit={unit} props={props}>
          <GapSentence before={unit.prompt.before} after={unit.prompt.after} lang={plan.lang}>
            <TextAnswer unit={unit} props={props} label={t('session.gapAnswer')} />
          </GapSentence>
        </UnitFrame>
      ))}
      <div className="references">
        <p className="visually-hidden">{t('session.references')}</p>
        <ul className="reference-list">
          {seededShuffle(item.referenceTargetIds, props.seed, item.itemId).map((id) => {
            const target = plan.targets.get(id)
            return (
              <li key={id} className={solved && id === item.targetId ? 'is-correct' : undefined}>
                <span lang={plan.lang}>{target?.term ?? id}</span>
                {target?.genders.length ? <small>{target.genders.map((g) => t(`gender.${g}`)).join(' / ')}</small> : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
