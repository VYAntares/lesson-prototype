import { compareLevels, LESSON_KINDS, type Level } from '../../schemas/common'
import type { Manifest } from '../../schemas/manifest'
import type { OutlineEntry } from '../../schemas/outline'

export type CourseSelection = { lang: string; level: Level }

export function courseLanguages(manifest: Manifest) {
  return [...new Set(manifest.courses.map((c) => c.lang))].sort()
}

export function courseLevels(manifest: Manifest, lang: string) {
  return manifest.courses
    .filter((c) => c.lang === lang)
    .map((c) => c.level)
    .sort(compareLevels)
}

function pickLevel(levels: Level[], preferred?: Level) {
  return preferred && levels.includes(preferred) ? preferred : levels.includes('A1') ? 'A1' : levels[0]
}

/** French A1 when available, otherwise the first course. */
export function defaultSelection(manifest: Manifest): CourseSelection | undefined {
  const langs = courseLanguages(manifest)
  const lang = langs.includes('fr') ? 'fr' : langs[0]
  if (!lang) return undefined
  const level = pickLevel(courseLevels(manifest, lang))
  return level ? { lang, level } : undefined
}

/** Switch language, keeping the level when the new language offers it. */
export function selectLanguage(manifest: Manifest, current: CourseSelection, lang: string) {
  const level = pickLevel(courseLevels(manifest, lang), current.level)
  return level ? { lang, level } : undefined
}

export function findCourse(manifest: Manifest, selection: CourseSelection) {
  return manifest.courses.find((c) => c.lang === selection.lang && c.level === selection.level)
}

export function findCourseOfLesson(manifest: Manifest, lessonId: string) {
  return manifest.courses.find((c) => c.lessonIds.includes(lessonId))
}

/** Outline entries with their 1-based position in the course, filtered by category. */
export function numberedEntries(entries: OutlineEntry[], kinds: Set<string>) {
  return entries.map((entry, i) => ({ ordinal: i + 1, entry })).filter((e) => kinds.has(e.entry.kind))
}

export const ALL_KINDS: ReadonlySet<string> = new Set(LESSON_KINDS)
