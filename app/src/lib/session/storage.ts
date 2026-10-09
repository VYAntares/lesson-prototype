import type { SessionRecord } from './types'

const KEY_PREFIX = 'lesson-prototype:session:'

export function loadSession(lessonId: string): SessionRecord | undefined {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + lessonId)
    if (!raw) return undefined
    const data = JSON.parse(raw)
    return data?.version === 1 && data.lessonId === lessonId && typeof data.contentHash === 'string'
      ? { ...data, skippedNoVoice: data.skippedNoVoice ?? [], revealed: data.revealed ?? {} }
      : undefined
  } catch {
    return undefined
  }
}

export function saveSession(record: SessionRecord): boolean {
  try {
    localStorage.setItem(KEY_PREFIX + record.lessonId, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export function clearSession(lessonId: string) {
  try {
    localStorage.removeItem(KEY_PREFIX + lessonId)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}
