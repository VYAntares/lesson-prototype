import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { useMediaQuery } from './useMediaQuery'

const WIDE = '(min-width: 720px)'
/** Duration of the re-arrange animation after checking (ms). */
export const ARRANGE_MS = 1200

type Props = {
  /** Pairs to connect, as [native box key, learning box key]. */
  pairs: string[][]
  /** Key of the selected box, if any (draws a live curve to the pointer). */
  selected: string | null
  boxes: MutableRefObject<Map<string, HTMLElement>>
  /** After checking: rows move so that each word sits next to its translation. */
  arranged?: boolean
  celebrating?: boolean
  children: ReactNode
}

type Point = { x: number; y: number }

/** Draws curves between paired boxes (wide screens) and animates the re-arranged rows (FLIP). */
export function MatchingFrame({ pairs, selected, boxes, arranged = false, celebrating = false, children }: Props) {
  const wide = useMediaQuery(WIDE)
  const frame = useRef<HTMLDivElement>(null)
  const lastTops = useRef(new Map<string, number>())
  const wasArranged = useRef(arranged)
  const animating = useRef(false)
  const [, rerender] = useState(0)

  // FLIP: when rows get re-arranged, start each row at its old position and slide it into place.
  useLayoutEffect(() => {
    const rows = [...(frame.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])]
    if (arranged && !wasArranged.current) {
      const offsets = rows.map(
        (row) =>
          [
            row,
            (lastTops.current.get(row.dataset.flip!) ?? row.getBoundingClientRect().top) - row.getBoundingClientRect().top,
          ] as const,
      )
      const start = performance.now()
      animating.current = true
      const step = (time: number) => {
        const p = Math.min(1, (time - start) / ARRANGE_MS)
        const eased = p < 0.5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2
        for (const [row, offset] of offsets)
          row.style.transform = p < 1 && offset ? `translateY(${offset * (1 - eased)}px)` : ''
        rerender((n) => n + 1)
        if (p < 1) requestAnimationFrame(step)
        else animating.current = false
      }
      for (const [row, offset] of offsets) if (offset) row.style.transform = `translateY(${offset}px)`
      requestAnimationFrame(step)
    }
    wasArranged.current = arranged
  }, [arranged])

  // Remember row positions while answering, for the animation above.
  useLayoutEffect(() => {
    if (arranged || animating.current) return
    const rows = [...(frame.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])]
    lastTops.current = new Map(rows.map((row) => [row.dataset.flip!, row.getBoundingClientRect().top]))
  })

  const [pointer, setPointer] = useState<Point | null>(null)
  const [curves, setCurves] = useState<{ pairs: string[]; live: string | null }>({ pairs: [], live: null })
  const [, onResize] = useState(0)

  useEffect(() => {
    if (!frame.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => onResize((n) => n + 1))
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!wide || !frame.current) return
    const origin = frame.current.getBoundingClientRect()
    const anchor = (key: string): Point | undefined => {
      const box = boxes.current.get(key)?.getBoundingClientRect()
      if (!box) return undefined
      return { x: (key.startsWith('native:') ? box.right : box.left) - origin.left, y: box.top + box.height / 2 - origin.top }
    }
    const curve = (a: Point, b: Point) => {
      const bend = Math.max(40, Math.abs(b.x - a.x) / 2) * (b.x >= a.x ? 1 : -1)
      return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`
    }
    const next = {
      pairs: pairs.flatMap(([from, to]) => {
        const a = anchor(from)
        const b = anchor(to)
        return a && b ? [curve(a, b)] : []
      }),
      live: (() => {
        const start = selected ? anchor(selected) : undefined
        if (!start || !pointer || !selected) return null
        const otherSide = selected.startsWith('native:') ? 'learning:' : 'native:'
        for (const [key, el] of boxes.current) {
          if (!key.startsWith(otherSide)) continue
          const box = el.getBoundingClientRect()
          const x = pointer.x + origin.left
          const y = pointer.y + origin.top
          if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
            return curve(start, { x: (otherSide === 'learning:' ? box.left : box.right) - origin.left, y: pointer.y })
        }
        return curve(start, pointer)
      })(),
    }
    if (JSON.stringify(next) !== JSON.stringify(curves)) setCurves(next)
  })

  return (
    <div
      ref={frame}
      className={`matching-frame${wide ? ' is-wide' : ''}`}
      onPointerMove={(e) => {
        if (!wide || !selected || !frame.current) return
        const origin = frame.current.getBoundingClientRect()
        setPointer({ x: e.clientX - origin.left, y: e.clientY - origin.top })
      }}
      onPointerLeave={() => setPointer(null)}
    >
      {children}
      {wide && (
        <svg className="match-curves" aria-hidden="true">
          {curves.pairs.map((d, i) => (
            <path
              key={i}
              d={d}
              className={`match-curve${arranged && !celebrating ? ' is-checked' : ''}${celebrating ? ' is-thin' : ''}`}
            />
          ))}
          {selected && curves.live && <path d={curves.live} className="match-curve match-curve-live" />}
        </svg>
      )}
    </div>
  )
}
