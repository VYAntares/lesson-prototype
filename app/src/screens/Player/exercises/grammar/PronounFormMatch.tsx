import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit } from '../../../../lib/lesson/plan'
import { seededShuffle } from '../../../../lib/random'
import { ChoiceList } from '../shared/ChoiceList'
import { GapSentence } from '../shared/GapSentence'
import { UnitFrame } from '../shared/UnitFeedback'
import type { ExerciseProps } from '../types'

type Selection = { kind: 'token' | 'row'; id: string } | null
type Drag = { tokenId: string; from: string | null; x: number; y: number; moved?: boolean }

/** grammar_pronoun_form_match: drag (or tap) verb forms into the row of each pronoun. */
export function PronounFormMatch(props: ExerciseProps<'grammar_pronoun_form_match'>) {
  const { t, locale } = useI18n()
  const { item, units, plan, mode } = props
  const [selection, setSelection] = useState<Selection>(null)
  const [ghost, setGhost] = useState<Drag | null>(null)
  const drag = useRef<Drag | null>(null)
  const justDropped = useRef(false)

  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection])

  const rows = units.filter((u): u is ChoiceUnit => u.kind === 'choice')
  // A single row is shown as a gap sentence with choices.
  if (rows.length === 1) {
    const unit = rows[0]
    return (
      <div className="units">
        <UnitFrame unit={unit} props={props}>
          <GapSentence before={unit.prompt.learning} lang={plan.lang}>
            ____
          </GapSentence>
          <ChoiceList unit={unit} props={props} label={t('session.gapAnswer')} />
        </UnitFrame>
      </div>
    )
  }

  const tokens = rows[0]?.options ?? []
  const checked = mode === 'feedback'
  const editable = mode !== 'feedback' && !rows.some((r) => props.locked[r.id])
  const placedIn = (rowId: string) => (props.locked[rowId]?.response ?? props.drafts[rowId]) as string | undefined
  const rowHolding = (tokenId: string) => rows.find((r) => placedIn(r.id) === tokenId)?.id ?? null
  const tokenText = (id: string) => tokens.find((tk) => tk.id === id)?.text ?? ''
  const bank = seededShuffle(tokens, props.seed, `${item.itemId}/bank`).filter((tk) => !rowHolding(tk.id))

  const place = (rowId: string, tokenId: string) => {
    const previous = rowHolding(tokenId)
    if (previous && previous !== rowId) props.onChange(previous, '')
    props.onChange(rowId, tokenId)
    setSelection(null)
  }
  const clear = (rowId: string) => {
    props.onChange(rowId, '')
    setSelection(null)
  }
  const clickToken = (tokenId: string) => {
    if (selection?.kind === 'row') place(selection.id, tokenId)
    else setSelection(selection?.kind === 'token' && selection.id === tokenId ? null : { kind: 'token', id: tokenId })
  }
  const clickRow = (rowId: string) => {
    if (selection?.kind === 'token') place(rowId, selection.id)
    else if (placedIn(rowId)) clear(rowId)
    else setSelection(selection?.kind === 'row' && selection.id === rowId ? null : { kind: 'row', id: rowId })
  }

  const dragHandlers = (tokenId: string, from: string | null) =>
    editable
      ? {
          onPointerDown: (e: PointerEvent<HTMLElement>) => {
            if (e.button !== 0) return
            drag.current = { tokenId, from, x: e.clientX, y: e.clientY, moved: false }
            e.currentTarget.setPointerCapture?.(e.pointerId)
          },
          onPointerMove: (e: PointerEvent<HTMLElement>) => {
            const d = drag.current
            if (!d) return
            if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return
            d.moved = true
            setGhost({ tokenId: d.tokenId, from: d.from, x: e.clientX, y: e.clientY })
          },
          onPointerUp: (e: PointerEvent<HTMLElement>) => {
            const d = drag.current
            drag.current = null
            if (!d?.moved) return
            setGhost(null)
            // Swallow the click that follows a drop.
            justDropped.current = true
            setTimeout(() => (justDropped.current = false), 0)
            const target = (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') as HTMLElement | null)
              ?.dataset.drop
            if (target === 'bank') {
              if (d.from) clear(d.from)
            } else if (target) place(target, d.tokenId)
          },
          onPointerCancel: () => {
            drag.current = null
            setGhost(null)
          },
        }
      : {}
  const unlessDropped = (fn: () => void) => () => {
    if (justDropped.current) {
      justDropped.current = false
      return
    }
    fn()
  }
  const correct = rows.filter((r) => props.locked[r.id]?.outcome === 'fully_correct').length

  return (
    <div className={`pronoun-match${ghost ? ' is-dragging' : ''}`}>
      {checked ? (
        <p className="match-summary" role="status">
          <strong>{t('session.rowsSummary', { correct, total: rows.length })}</strong>
        </p>
      ) : (
        <p className="muted">{t('session.formMatchHint')}</p>
      )}
      {!checked && (
        <div className="form-bank" data-drop="bank" role="group" aria-label={t('session.formBank')}>
          {bank.length ? (
            bank.map((token) => (
              <button
                key={token.id}
                type="button"
                className="token form-token"
                lang={plan.lang}
                disabled={!editable}
                aria-pressed={selection?.kind === 'token' && selection.id === token.id}
                onClick={unlessDropped(() => clickToken(token.id))}
                {...dragHandlers(token.id, null)}
              >
                {token.text}
              </button>
            ))
          ) : (
            <span className="muted">{t('session.formBankEmpty')}</span>
          )}
        </div>
      )}
      <ul className="form-rows" aria-label={t('session.subject')}>
        {rows.map((row) => {
          const placed = placedIn(row.id)
          const outcome = checked ? props.locked[row.id]?.outcome : undefined
          const state = outcome ? (outcome === 'fully_correct' ? ' is-right' : ' is-wrong') : ''
          return (
            <li key={row.id} className={`form-row${state}`}>
              <span className="form-pronoun" lang={plan.lang}>
                {row.prompt.learning}
              </span>
              <button
                type="button"
                data-drop={row.id}
                className={`form-slot${placed ? ' is-filled' : ''}${state}`}
                disabled={!editable}
                aria-pressed={selection?.kind === 'row' && selection.id === row.id}
                aria-label={
                  placed
                    ? t('session.slotFilled', { pronoun: row.prompt.learning ?? '', form: tokenText(placed) })
                    : t('session.slotEmpty', { pronoun: row.prompt.learning ?? '' })
                }
                onClick={unlessDropped(() => clickRow(row.id))}
                {...(placed ? dragHandlers(placed, row.id) : {})}
              >
                {placed ? (
                  <span className="form-placed" lang={plan.lang}>
                    {tokenText(placed)}
                  </span>
                ) : (
                  <span className="muted">{t('session.dropForm')}</span>
                )}
              </button>
              {outcome && outcome !== 'fully_correct' && (
                <>
                  <strong className="inline-answer" lang={plan.lang}>
                    <span className="visually-hidden">{t('result.correctAnswer')}: </span>
                    {row.answer}
                  </strong>
                  <p className="row-explanation">{row.explanation[locale]}</p>
                </>
              )}
            </li>
          )
        })}
      </ul>
      {!checked && (
        <p className="muted" aria-live="polite">
          {selection?.kind === 'token' ? t('session.matchSelected', { item: tokenText(selection.id) }) : ''}
        </p>
      )}
      {ghost && (
        <span className="token form-token drag-ghost" lang={plan.lang} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {tokenText(ghost.tokenId)}
        </span>
      )}
    </div>
  )
}
