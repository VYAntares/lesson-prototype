import { nativeLocalesFor, type Locale, type LocalizedText, type NativeText } from '../schemas/common'
import { useI18n } from './i18n'
import { usePreferences } from './preferences'

/**
 * Text helpers for a lesson in `lang`: interface-language strings, mother-tongue
 * translations and durations.
 */
export function useLessonText(lang: string) {
  const i18n = useI18n()
  const { motherTongue } = usePreferences()
  const allowed = nativeLocalesFor(lang)
  const nativeLocale: Locale = allowed.includes(motherTongue) ? motherTongue : allowed[0]
  return {
    ...i18n,
    nativeLocale,
    ui: (text: LocalizedText) => text[i18n.locale],
    native: <T,>(text: Partial<Record<Locale, T>>) => text[nativeLocale] as T,
    duration: (seconds: number) => {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return m
        ? s
          ? i18n.t('unit.minutesSeconds', { m, s })
          : i18n.t('unit.minutes', { n: m })
        : i18n.t('unit.seconds', { n: s })
    },
  }
}

export type LessonText = ReturnType<typeof useLessonText>
export type { NativeText }
