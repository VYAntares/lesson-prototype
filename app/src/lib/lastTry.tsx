import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Score of the last completed try per lesson (kept in memory for the session only). */
type LastTry = { scores: Map<string, number>; recordCompletion: (lessonId: string, score: number) => void }

const LastTryContext = createContext<LastTry | null>(null)

export function LastTryProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState(() => new Map<string, number>())
  const recordCompletion = useCallback((lessonId: string, score: number) => {
    setScores((s) => new Map(s).set(lessonId, score))
  }, [])
  const value = useMemo(() => ({ scores, recordCompletion }), [scores, recordCompletion])
  return <LastTryContext.Provider value={value}>{children}</LastTryContext.Provider>
}

export function useLastTry() {
  const ctx = useContext(LastTryContext)
  if (!ctx) throw Error('useLastTry outside LastTryProvider')
  return ctx
}
