import { useState } from 'react'
import { ListenButton } from '../../../../components/voice/ListenButton'
import { useI18n } from '../../../../lib/i18n'
import type { Plan } from '../../../../lib/lesson/plan'
import type { Locale } from '../../../../schemas/common'
import { genderList } from '../shared/answerState'
import type { ExerciseProps } from '../types'

type CardProps = {
  id: string
  index: number
  total: number
  plan: Plan
  motherTongue: Locale
  initiallyFlipped: boolean
  onFlip: () => void
}

/** Front: meaning in the mother tongue. Back: the word, gender and an example. */
function Flashcard({ id, index, total, plan, motherTongue, initiallyFlipped, onFlip }: CardProps) {
  const { t } = useI18n()
  const [flipped, setFlipped] = useState(initiallyFlipped)
  const target = plan.targets.get(id)
  return (
    <article className={`flashcard${flipped ? ' is-flipped' : ''}`} aria-label={t('session.cardOf', { n: index + 1, total })}>
      <button
        type="button"
        className="flip-button"
        aria-pressed={flipped}
        aria-label={t(flipped ? 'session.flipBack' : 'session.flipCard')}
        onClick={() => {
          if (!flipped) onFlip()
          setFlipped(!flipped)
        }}
      >
        <span aria-hidden="true">⟲</span>
      </button>
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front" inert={flipped}>
          <p className="flashcard-meaning">{target?.translations[motherTongue]?.join(' / ') ?? id}</p>
        </div>
        <div className="flashcard-face flashcard-back" inert={!flipped}>
          <div className="flashcard-form">
            <span lang={plan.lang}>{target?.teachingForm}</span>
            {target && (
              <ListenButton
                text={target.teachingForm}
                lang={plan.lang}
                variant="icon"
                size="large"
                label={t('session.listenWord', { word: target.teachingForm })}
              />
            )}
          </div>
          {target && target.genders.length > 0 && <p className="muted">{genderList(target, t)}</p>}
          {target && (
            <div className="flashcard-example">
              <ListenButton text={target.context.sentence} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
              <span>
                <span lang={plan.lang}>{target.context.sentence}</span>{' '}
                <span className="muted">– {target.context.translation[motherTongue]}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/** vocabulary_flashcards: turn every card before continuing. */
export function Flashcards({ item, plan, motherTongue, pageId, revealed, onReveal }: ExerciseProps<'vocabulary_flashcards'>) {
  const { t } = useI18n()
  const key = `${pageId}/${item.itemId}`
  const turned = revealed[key] ?? []
  const total = item.targetIds.length
  return (
    <div className="flashcard-deck">
      <p className="label-muted" aria-live="polite">
        {t('session.cardsRevealed', { n: turned.filter((id) => item.targetIds.includes(id)).length, total })}
      </p>
      <ul className="flashcard-grid">
        {item.targetIds.map((id, index) => (
          <li key={id}>
            <Flashcard
              id={id}
              index={index}
              total={total}
              plan={plan}
              motherTongue={motherTongue}
              initiallyFlipped={turned.includes(id)}
              onFlip={() => onReveal(key, id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
