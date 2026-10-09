import { useI18n } from '../../../../lib/i18n'
import type { SpotUnit } from '../../../../lib/lesson/plan'
import type { ExerciseContext } from '../types'
import { isLocked, responseOf } from './answerState'

type Spot = { tokenId: string; text: string }

/** Pick the wrong word, then type or choose its correction. */
export function ErrorSpotterAnswer({ unit, props }: { unit: SpotUnit; props: ExerciseContext }) {
  const { t } = useI18n()
  const answer = responseOf<Spot>(props, unit) ?? { tokenId: '', text: '' }
  const locked = isLocked(props, unit)
  const lang = props.plan.lang
  return (
    <div className="spot">
      <p lang={lang}>
        {unit.tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            className="token"
            aria-pressed={answer.tokenId === token.id}
            disabled={locked}
            onClick={() => props.onChange(unit.id, { ...answer, tokenId: token.id })}
          >
            {token.text}
          </button>
        ))}
      </p>
      {answer.tokenId ? (
        unit.correction.mode === 'select' ? (
          <fieldset className="choices" disabled={locked}>
            <legend className="label-muted">{t('session.correction')}</legend>
            {unit.correction.choices.map((choice) => (
              <label key={choice} className="choice">
                <input
                  type="radio"
                  name={`${unit.id}-fix`}
                  checked={answer.text === choice}
                  onChange={() => props.onChange(unit.id, { ...answer, text: choice })}
                />
                <span lang={lang}>{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="field">
            <span className="label-muted">{t('session.correction')}</span>
            <input
              className="text-input"
              lang={lang}
              autoComplete="off"
              spellCheck={false}
              value={answer.text}
              readOnly={locked}
              onChange={(e) => props.onChange(unit.id, { ...answer, text: e.target.value })}
            />
          </label>
        )
      ) : null}
    </div>
  )
}
