import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ListenButton } from '../../../../components/voice/ListenButton'
import { useI18n } from '../../../../lib/i18n'
import type { ChoiceUnit } from '../../../../lib/lesson/plan'
import { seededShuffle } from '../../../../lib/random'
import type { Response } from '../../../../lib/session/types'
import type { ExerciseProps } from '../types'
import { genderList } from './answerState'
import { MatchingFrame } from './MatchingFrame'

type Selection = { side: 'native' | 'learning'; id: string } | null

/**
 * After checking, order the learning-language rows so each sits next to the option it was
 * (or should have been) matched with: keep correct pairs, then fill in correct partners, then the rest.
 */
function arrangeRows(units: ChoiceUnit[], optionOrder: string[], responseOf: (id: string) => Response | undefined) {
  const partner = new Map<string, string>()
  const used = new Set<string>()
  for (const unit of units) {
    const r = responseOf(unit.id) as string | undefined
    if (r && unit.correct.includes(r) && !used.has(r)) {
      partner.set(unit.id, r)
      used.add(r)
    }
  }
  for (const fits of [(u: ChoiceUnit, o: string) => u.correct.includes(o), () => true])
    for (const unit of units) {
      if (partner.has(unit.id)) continue
      const option = optionOrder.find((o) => !used.has(o) && fits(unit, o))
      if (option) {
        partner.set(unit.id, option)
        used.add(option)
      }
    }
  return [...units].sort((a, b) => optionOrder.indexOf(partner.get(a.id)!) - optionOrder.indexOf(partner.get(b.id)!))
}

/** Two-column matching board used by vocabulary matching and grammar person matching. */
export function MatchingBoard(props: ExerciseProps<'vocabulary_matching' | 'grammar_person_matching'>) {
  const { t } = useI18n()
  const { item, units, plan, seed, mode } = props
  const [selection, setSelection] = useState<Selection>(null)
  const boxes = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection])

  const isPerson = item.type === 'grammar_person_matching'
  const choiceUnits = units.filter((u): u is ChoiceUnit => u.kind === 'choice')
  const options = choiceUnits[0]?.options ?? []
  const responseOf = (unitId: string) => props.locked[unitId]?.response ?? props.drafts[unitId]
  const optionText = (id: string) => options.find((o) => o.id === id)?.text ?? ''
  const targetOf = (unitId: string) => plan.targets.get(choiceUnits.find((u) => u.id === unitId)?.correct[0] ?? '')
  const learningLabel = (unitId: string) => {
    if (isPerson) return choiceUnits.find((u) => u.id === unitId)?.prompt.learning ?? ''
    const target = targetOf(unitId)
    return target?.genders.length ? `${target.teachingForm} (${genderList(target, t)})` : (target?.teachingForm ?? '')
  }
  const nativeColumn = isPerson ? options : seededShuffle(options, seed, `${item.itemId}/native`)
  /** Six persons are shown as two groups of three (singular / plural). */
  const splitInHalves = isPerson && options.length === 6
  const checked = mode !== 'answering' || props.celebrating
  const outcomeOf = (unitId: string) => props.locked[unitId]?.outcome ?? (props.celebrating ? 'fully_correct' : undefined)
  const isWrong = (unitId: string) => checked && outcomeOf(unitId) !== 'fully_correct'
  const shuffledRows = seededShuffle(choiceUnits, seed, `${item.itemId}/learning`)
  const learningColumn = checked
    ? arrangeRows(
        choiceUnits,
        nativeColumn.map((o) => o.id),
        responseOf,
      )
    : shuffledRows
  const badges = new Map(
    learningColumn.filter((u) => responseOf(u.id) && (!checked || isWrong(u.id))).map((u, i) => [u.id, i + 1]),
  )
  const unitPairedWith = (optionId: string) => choiceUnits.find((u) => responseOf(u.id) === optionId)
  const assign = (unitId: string, optionId: string) => {
    for (const u of choiceUnits) if (u.id !== unitId && responseOf(u.id) === optionId) props.onChange(u.id, '')
    props.onChange(unitId, optionId)
    setSelection(null)
  }
  const select = (side: 'native' | 'learning', id: string) => {
    if (checked) return
    if (selection && selection.side !== side) {
      if (side === 'learning') assign(id, selection.id)
      else assign(selection.id, id)
    } else setSelection(selection?.side === side && selection.id === id ? null : { side, id })
  }
  const pairedCount = choiceUnits.filter((u) => responseOf(u.id)).length
  const selectedLabel = selection ? (selection.side === 'native' ? optionText(selection.id) : learningLabel(selection.id)) : ''
  const boxRef = (key: string) => (el: HTMLElement | null) => {
    if (el) boxes.current.set(key, el)
    else boxes.current.delete(key)
  }
  const selectedKey = selection && `${selection.side}:${selection.id}`
  const curves = choiceUnits
    .flatMap((u) =>
      responseOf(u.id) && (!checked || isWrong(u.id) || props.celebrating)
        ? [[`native:${responseOf(u.id)}`, `learning:${u.id}`]]
        : [],
    )
    .filter(([a, b]) => a !== selectedKey && b !== selectedKey)
  const correctCount = choiceUnits.filter((u) => outcomeOf(u.id) === 'fully_correct').length

  return (
    <div className={`matching${checked ? ' is-checked' : ''}${splitInHalves ? ' has-gap' : ''}`}>
      {checked && !props.celebrating ? (
        <p className="match-summary" role="status">
          <strong>{t('session.matchSummary', { correct: correctCount, total: choiceUnits.length })}</strong>
        </p>
      ) : (
        <p className="muted">{t('session.matchHint')}</p>
      )}
      <MatchingFrame
        pairs={curves}
        selected={selectedKey}
        boxes={boxes}
        arranged={checked}
        celebrating={props.celebrating}
      >
        <div
          className="matching-columns"
          style={
            splitInHalves
              ? { gridTemplateRows: 'repeat(3, 1fr) var(--person-gap) repeat(3, 1fr)' }
              : ({ '--rows': choiceUnits.length } as CSSProperties)
          }
        >
          <ul aria-label={options[0]?.lang === 'learning' ? t('session.subject') : t(`locale.${props.motherTongue}`)}>
            {nativeColumn.map((option, i) => {
              const unit = unitPairedWith(option.id)
              const badge = unit ? badges.get(unit.id) : undefined
              return (
                <Fragment key={option.id}>
                  {splitInHalves && i === 3 && <li className="match-gap" aria-hidden="true" />}
                  <li>
                    <button
                      type="button"
                      ref={boxRef(`native:${option.id}`)}
                      className={`match-item${badge ? ' is-paired' : ''}`}
                      disabled={checked}
                      aria-pressed={selection?.side === 'native' && selection.id === option.id}
                      aria-label={badge ? t('session.pairedWith', { item: option.text, partner: learningLabel(unit!.id) }) : option.text}
                      onClick={() => select('native', option.id)}
                    >
                      <span lang={option.lang === 'learning' ? plan.lang : undefined}>{option.text}</span>
                      {badge && (
                        <span className="pair-badge" aria-hidden="true">
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                </Fragment>
              )
            })}
          </ul>
          <ul aria-label={t('session.frenchForms')}>
            {learningColumn.map((unit, i) => {
              const badge = badges.get(unit.id)
              const target = targetOf(unit.id)
              return (
                <Fragment key={unit.id}>
                  {splitInHalves && i === 3 && <li className="match-gap" aria-hidden="true" />}
                  <li className="match-cell" data-flip={unit.id}>
                    <button
                      type="button"
                      ref={boxRef(`learning:${unit.id}`)}
                      disabled={checked}
                      className={`match-item${badge ? ' is-paired' : ''}${
                        checked && !props.celebrating ? (isWrong(unit.id) ? ' is-wrong' : ' is-right') : ''
                      }`}
                      lang={plan.lang}
                      aria-pressed={selection?.side === 'learning' && selection.id === unit.id}
                      aria-label={
                        badge
                          ? t('session.pairedWith', {
                              item: learningLabel(unit.id),
                              partner: optionText(responseOf(unit.id) as string),
                            })
                          : learningLabel(unit.id)
                      }
                      onClick={() => select('learning', unit.id)}
                    >
                      {isPerson ? (
                        <span>{unit.prompt.learning}</span>
                      ) : (
                        <span>
                          {target?.teachingForm}
                          {target?.genders.length ? <small>{genderList(target, t)}</small> : null}
                        </span>
                      )}
                      {badge && (
                        <span className="pair-badge" aria-hidden="true">
                          {badge}
                        </span>
                      )}
                    </button>
                    {learningLabel(unit.id) && (
                      <span className="match-audio">
                        <ListenButton
                          text={isPerson ? learningLabel(unit.id) : target!.teachingForm}
                          lang={plan.lang}
                          variant="icon"
                          label={t('session.listenWord', { word: learningLabel(unit.id) })}
                        />
                      </span>
                    )}
                  </li>
                </Fragment>
              )
            })}
          </ul>
        </div>
      </MatchingFrame>
      {!checked && (
        <p className="muted" aria-live="polite">
          {selectedLabel ? t('session.matchSelected', { item: selectedLabel }) : ''}{' '}
          {t('session.pairsAssigned', { n: pairedCount, total: choiceUnits.length })}
        </p>
      )}
    </div>
  )
}
