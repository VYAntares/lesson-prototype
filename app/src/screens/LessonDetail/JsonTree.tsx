import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../lib/i18n'

/** Expanded/collapsed state set by the user, keyed by JSON pointer. */
export type TreeOverrides = Map<string, boolean>

type Row = {
  path: string
  key: string | null
  value: unknown
  depth: number
  parent: string | null
  expanded: boolean
}

const isContainer = (v: unknown): v is object => typeof v === 'object' && !!v
const childrenOf = (v: unknown): [string, unknown][] =>
  Array.isArray(v) ? v.map((x, i) => [String(i), x]) : isContainer(v) ? Object.entries(v) : []
const childPath = (parent: string, key: string) => `${parent}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`
/** Small containers and only children start expanded. */
const expandedByDefault = (v: unknown, onlyChild: boolean) => (isContainer(v) ? onlyChild || childrenOf(v).length <= 3 : false)

function visibleRows(value: unknown, overrides: TreeOverrides): Row[] {
  const rows: Row[] = []
  const visit = (v: unknown, path: string, key: string | null, depth: number, parent: string | null, onlyChild: boolean) => {
    const expanded = isContainer(v) && (overrides.get(path) ?? expandedByDefault(v, onlyChild))
    rows.push({ path, key, value: v, depth, parent, expanded })
    if (expanded) {
      const children = childrenOf(v)
      for (const [k, child] of children) visit(child, childPath(path, k), k, depth + 1, path, children.length === 1)
    }
  }
  visit(value, '', null, 0, null, true)
  return rows
}

const formatValue = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : String(v))
const valueType = (v: unknown) => (v === null ? 'null' : typeof v)

type Props = {
  value: unknown
  rootLabel: string
  overrides: TreeOverrides
  onOverridesChange: (overrides: TreeOverrides) => void
}

/** Accessible, keyboard-navigable JSON tree (ARIA tree pattern). */
export function JsonTree({ value, rootLabel, overrides, onOverridesChange }: Props) {
  const { t } = useI18n()
  const rows = useMemo(() => visibleRows(value, overrides), [value, overrides])
  const [focusedPath, setFocusedPath] = useState('')
  const elements = useRef(new Map<string, HTMLLIElement>())
  const moveFocus = useRef(false)

  const positions = useMemo(() => {
    const sizes = new Map<string | null, number>()
    for (const r of rows) sizes.set(r.parent, (sizes.get(r.parent) ?? 0) + 1)
    const seen = new Map<string | null, number>()
    const out = new Map<string, { setsize: number; posinset: number }>()
    for (const r of rows) {
      const pos = (seen.get(r.parent) ?? 0) + 1
      seen.set(r.parent, pos)
      out.set(r.path, { setsize: sizes.get(r.parent) ?? 1, posinset: pos })
    }
    return out
  }, [rows])

  const focusedIndex = Math.max(
    0,
    rows.findIndex((r) => r.path === focusedPath),
  )

  useEffect(() => {
    if (moveFocus.current) {
      elements.current.get(rows[focusedIndex]?.path ?? '')?.focus()
      moveFocus.current = false
    }
  }, [focusedIndex, rows])

  const setExpanded = (row: Row, expanded: boolean) => {
    const next = new Map(overrides)
    next.set(row.path, expanded)
    onOverridesChange(next)
  }
  const focusRow = (index: number) => {
    const row = rows[Math.min(rows.length - 1, Math.max(0, index))]
    if (row) {
      moveFocus.current = true
      setFocusedPath(row.path)
    }
  }
  const onKeyDown = (e: KeyboardEvent, row: Row, index: number) => {
    const hasChildren = isContainer(row.value) && childrenOf(row.value).length > 0
    const open = hasChildren && row.expanded
    let handled = true
    switch (e.key) {
      case 'ArrowDown':
        focusRow(index + 1)
        break
      case 'ArrowUp':
        focusRow(index - 1)
        break
      case 'Home':
        focusRow(0)
        break
      case 'End':
        focusRow(rows.length - 1)
        break
      case 'ArrowRight':
        if (hasChildren && !open) setExpanded(row, true)
        else if (open) focusRow(index + 1)
        break
      case 'ArrowLeft':
        if (open) setExpanded(row, false)
        else if (row.parent !== null) focusRow(rows.findIndex((r) => r.path === row.parent))
        break
      case 'Enter':
      case ' ':
        if (hasChildren) setExpanded(row, !open)
        break
      default:
        handled = false
    }
    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className="json-tree">
      <ul role="tree" aria-label={rootLabel}>
        {rows.map((row, index) => {
          const container = isContainer(row.value)
          const count = container ? childrenOf(row.value).length : 0
          const hasChildren = container && count > 0
          const open = hasChildren && row.expanded
          const { setsize, posinset } = positions.get(row.path) ?? { setsize: 1, posinset: 1 }
          const summary = container
            ? Array.isArray(row.value)
              ? count === 1
                ? t('raw.arraySummaryOne')
                : t('raw.arraySummary', { count })
              : count === 1
                ? t('raw.objectSummaryOne')
                : t('raw.objectSummary', { count })
            : ''
          const label = row.key === null ? rootLabel : row.key
          const ariaLabel = container
            ? count === 0
              ? `${label}: ${Array.isArray(row.value) ? '[]' : '{}'}`
              : `${label} (${summary})`
            : `${label}: ${formatValue(row.value)}`
          return (
            <li
              key={row.path}
              ref={(el) => {
                if (el) elements.current.set(row.path, el)
                else elements.current.delete(row.path)
              }}
              role="treeitem"
              aria-label={ariaLabel}
              aria-level={row.depth + 1}
              aria-setsize={setsize}
              aria-posinset={posinset}
              aria-expanded={hasChildren ? open : undefined}
              tabIndex={index === focusedIndex ? 0 : -1}
              className={`tree-row${hasChildren ? ' is-container' : ''}`}
              style={{ paddingInlineStart: `${row.depth * 1.25 + 0.25}rem` }}
              onKeyDown={(e) => onKeyDown(e, row, index)}
              onFocus={() => setFocusedPath(row.path)}
              onClick={(e) => {
                e.stopPropagation()
                setFocusedPath(row.path)
                if (hasChildren) setExpanded(row, !open)
              }}
            >
              <span className="tree-toggle" aria-hidden="true">
                {hasChildren ? (open ? '▾' : '▸') : ''}
              </span>
              <span className="tree-key">{label}</span>
              {container ? (
                <span className="tree-summary">
                  {count === 0 ? (Array.isArray(row.value) ? ' []' : ' {}') : ` (${summary})`}
                </span>
              ) : (
                <>
                  <span className="tree-colon">: </span>
                  <span className={`tree-value tree-${valueType(row.value)}`}>{formatValue(row.value)}</span>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
