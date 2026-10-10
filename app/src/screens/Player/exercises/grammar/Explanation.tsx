import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Inlines } from '../../../../components/text/RichText'
import { useI18n } from '../../../../lib/i18n'
import { parseRichText, type Inline } from '../../../../lib/richText'
import type { ExerciseProps } from '../types'
import { NewVerbsTable } from './NewVerbsTable'

/** "`le` – masculine singular": a course-language form, then what it is for. */
function formRow(item: Inline[]) {
  const [first, ...rest] = item
  if (first?.kind !== 'learning' || !rest.length) return undefined
  const head = rest[0]
  const tail = head.kind === 'text' ? [{ ...head, text: head.text.replace(/^\s*[–—:-]\s*/, '') }, ...rest.slice(1)] : rest
  return { form: first.text, meaning: tail }
}

/**
 * grammar_explanation, point by point (team feedback): each paragraph or list of the rule is a
 * point, then the form table and the examples. Lists of forms become rows with the form highlighted.
 */
export function Explanation({ item, plan, motherTongue, pageId, mode }: ExerciseProps<'grammar_explanation'>) {
  const { locale, t } = useI18n()
  const lang = plan.lang
  const isFirstExplanation = plan.pages.find((p) => p.items.some((i) => i.type === 'grammar_explanation'))?.pageId === pageId
  const { blocks } = parseRichText(item.text[locale])

  const points: ReactNode[] = blocks.map((block, i) => {
    if (block.kind === 'paragraph')
      return (
        <p key={i} className="theory-text">
          <Inlines inlines={block.inlines} lang={lang} />
        </p>
      )
    const rows = block.items.map(formRow)
    if (rows.every((r) => r))
      return (
        <ul key={i} className="form-list">
          {rows.map((row, j) => (
            <li key={j}>
              <span className="form-chip" lang={lang}>
                {row!.form}
              </span>
              <span>
                <Inlines inlines={row!.meaning} lang={lang} />
              </span>
            </li>
          ))}
        </ul>
      )
    const List = block.ordered ? 'ol' : 'ul'
    return (
      <List key={i} className="theory-list">
        {block.items.map((li, j) => (
          <li key={j}>
            <Inlines inlines={li} lang={lang} />
          </li>
        ))}
      </List>
    )
  })
  if (item.formTable.length)
    points.push(
      <div key="table" className="table-wrap">
        <table className="data-table form-table">
          <thead>
            <tr>
              <th scope="col">{t('session.subject')}</th>
              <th scope="col">{t('session.form')}</th>
              <th scope="col">{t('brief.col.example')}</th>
            </tr>
          </thead>
          <tbody lang={lang}>
            {item.formTable.map((row, i) => (
              <tr key={i}>
                <th scope="row">{row.subject}</th>
                <td>
                  <span className="form-chip">{row.form}</span>
                </td>
                <td>{row.example ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
  if (item.examples.length)
    points.push(
      <div key="examples">
        <p className="theory-label">{t('theory.examples')}</p>
        <ul className="example-cards">
          {item.examples.map((example, i) => (
            <li key={i}>
              <strong lang={lang}>{example.text}</strong>
              <span lang={motherTongue}>{example.translation[motherTongue]}</span>
            </li>
          ))}
        </ul>
      </div>,
    )

  const [shown, setShown] = useState(1)
  const visible = mode === 'feedback' ? points.length : Math.min(shown, points.length)
  const nextButton = useRef<HTMLButtonElement>(null)
  const last = useRef<HTMLLIElement>(null)
  useEffect(() => {
    // After the page's own focus handling, so Enter reveals the next point.
    const id = window.setTimeout(() => nextButton.current?.focus({ preventScroll: true }), 50)
    if (visible > 1) last.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    return () => window.clearTimeout(id)
  }, [visible])

  return (
    <div className="theory">
      {isFirstExplanation && <NewVerbsTable plan={plan} motherTongue={motherTongue} />}
      <h2 className="theory-title">{item.heading[locale]}</h2>
      <ol className="theory-points">
        {points.slice(0, visible).map((point, i) => (
          <li key={i} ref={i === visible - 1 ? last : undefined} className="theory-point">
            {point}
          </li>
        ))}
      </ol>
      {visible < points.length && (
        <button ref={nextButton} type="button" className="theory-next" onClick={() => setShown(visible + 1)}>
          {t('theory.nextPoint')} <span className="muted">{t('player.pageOf', { n: visible, total: points.length })}</span>
          <span aria-hidden="true">↓</span>
        </button>
      )}
    </div>
  )
}
