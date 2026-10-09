import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '../../schemas/common'
import type { Plan } from '../lesson/plan'
import type { VoiceStatus } from '../speech'
import { isListeningPage, reduceSession } from './reducer'
import { saveSession } from './storage'
import type { SessionAction, SessionRecord } from './types'

/** Replaceable clock (handy for tests). */
export const clock = { now: () => Date.now() }

/** Runs a session: dispatches actions, saves after each change and drives exam countdowns. */
export function useSession(plan: Plan, initial: SessionRecord, interfaceLanguage: Locale, voice: VoiceStatus = 'available') {
  const [record, setRecord] = useState(initial)
  const [saveFailed, setSaveFailed] = useState(false)
  const [now, setNow] = useState(() => clock.now())
  const current = useRef(record)
  current.current = record

  const dispatch = useCallback(
    (action: SessionAction) => {
      const next = reduceSession(plan, current.current, { ...action, now: clock.now(), interfaceLanguage })
      if (next !== current.current) {
        current.current = next
        setRecord(next)
        setSaveFailed(!saveSession(next))
      }
    },
    [plan, interfaceLanguage],
  )

  const page = plan.pages[record.pageIndex]
  const deadline =
    record.phase === 'answering' && page?.role === 'exam' && (!isListeningPage(page) || voice === 'available')
      ? record.exam[page.pageId]?.deadline
      : undefined

  useEffect(() => {
    if (deadline === undefined) return
    const tick = () => {
      const t = clock.now()
      setNow(t)
      if (t >= deadline) dispatch({ type: 'expire' })
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadline, dispatch])

  useEffect(() => {
    setSaveFailed(!saveSession(current.current))
  }, [])

  return {
    record,
    dispatch,
    saveFailed,
    remainingMs: deadline === undefined ? undefined : Math.max(0, deadline - now),
  }
}
