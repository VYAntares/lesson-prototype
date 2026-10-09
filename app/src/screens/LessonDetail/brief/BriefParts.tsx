import { useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import { reviewColor } from '../../../lib/reviewColor'
import type { Scoring } from '../../../schemas/common'

/** One-line summary: "12 targets   /   About 21 minutes   /   …". */
export function BriefSummary({ items }: { items: string[] }) {
  return <p className="brief-summary">{items.join('   /   ')}</p>
}

export function BriefBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="brief-block">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function BriefList({ items, empty }: { items: string[]; empty?: string }) {
  if (items.length)
    return (
      <ul className="brief-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  return empty ? <p className="muted">{empty}</p> : null
}

export function ScoringNote({ scoring }: { scoring: Scoring }) {
  const { t } = useI18n()
  return (
    <p className="muted">
      {t('brief.scoring', {
        practice: scoring.practiceWeight,
        exam: scoring.examWeight,
        credit: Math.round(scoring.orthographyCredit * 100),
      })}
    </p>
  )
}

type Tab = { id: string; title: string; meta: string }

/** Numbered, colour-coded tabs (blocks of a grammar brief, groups of a vocabulary brief). */
export function ColorTabs({ label, tabs, children }: { label: string; tabs: Tab[]; children: (index: number) => ReactNode }) {
  const [selected, setSelected] = useState(0)
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.min(selected, tabs.length - 1)
  const select = (i: number) => {
    setSelected(i)
    buttons.current[i]?.focus()
  }
  return (
    <>
      <ol className="content-outline draft-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <li key={tab.id} role="presentation" style={reviewColor(i)}>
            <button
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-controls={`${id}-panel`}
              aria-selected={i === current}
              tabIndex={i === current ? 0 : -1}
              ref={(el) => {
                buttons.current[i] = el
              }}
              onClick={() => setSelected(i)}
              onKeyDown={(e) => {
                const next =
                  e.key === 'ArrowRight' || e.key === 'ArrowDown'
                    ? (i + 1) % tabs.length
                    : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                      ? (i + tabs.length - 1) % tabs.length
                      : e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? tabs.length - 1
                          : undefined
                if (next !== undefined) {
                  e.preventDefault()
                  select(next)
                }
              }}
            >
              <span>{tab.title}</span>
              <small>{tab.meta}</small>
            </button>
          </li>
        ))}
      </ol>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${current}`}
        tabIndex={0}
        className="draft-tab-panel"
        style={reviewColor(current)}
      >
        {children(current)}
      </div>
    </>
  )
}
