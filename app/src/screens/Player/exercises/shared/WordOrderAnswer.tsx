import { useI18n } from '../../../../lib/i18n'
import type { OrderUnit } from '../../../../lib/lesson/plan'
import { seededShuffle } from '../../../../lib/random'
import type { ExerciseContext } from '../types'
import { isLocked, responseOf } from './answerState'

/** Build a sentence by tapping tokens; tap a placed token to put it back. */
export function WordOrderAnswer({ unit, props }: { unit: OrderUnit; props: ExerciseContext }) {
  const { t } = useI18n()
  const placed = responseOf<string[]>(props, unit) ?? []
  const locked = isLocked(props, unit)
  const bank = seededShuffle(unit.tokens, props.seed, unit.id).filter((tk) => !placed.includes(tk.id))
  const textOf = (id: string) => unit.tokens.find((tk) => tk.id === id)?.text
  return (
    <div className="order">
      <p className="order-answer" lang={props.plan.lang} aria-live="polite">
        {placed.length ? (
          placed.map((id, i) => (
            <button
              key={id}
              type="button"
              className="token token-placed"
              disabled={locked}
              onClick={() =>
                props.onChange(
                  unit.id,
                  placed.filter((_, j) => j !== i),
                )
              }
            >
              {textOf(id)}
            </button>
          ))
        ) : (
          <span className="muted">{t('session.orderEmpty')}</span>
        )}
      </p>
      <p className="order-bank" lang={props.plan.lang}>
        {bank.map((token) => (
          <button
            key={token.id}
            type="button"
            className="token"
            disabled={locked}
            onClick={() => props.onChange(unit.id, [...placed, token.id])}
          >
            {token.text}
          </button>
        ))}
      </p>
    </div>
  )
}
