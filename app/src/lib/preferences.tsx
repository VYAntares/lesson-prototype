import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { LOCALES, localeSchema, type Locale } from '../schemas/common'

export type Preferences = { motherTongue: Locale; interfaceLanguage: Locale }

const DEFAULTS: Preferences = { motherTongue: 'en', interfaceLanguage: 'en' }
const STORAGE_KEY = 'lessonPrototype.preferences.v1'
const preferencesSchema = z.object({ motherTongue: localeSchema, interfaceLanguage: localeSchema })

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function loadPreferences(store = storage()): Preferences {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = preferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePreferences(prefs: Preferences, store = storage()): boolean {
  try {
    if (!store) return false
    store.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

/** A mother tongue is valid for a course unless it is the course language itself. */
export function isValidMotherTongue(locale: string, courseLang: string) {
  return locale !== courseLang
}

/** Keep the mother tongue, or switch to the first locale that differs from the course language. */
export function adjustMotherTongue(locale: Locale, courseLang: string): Locale {
  return isValidMotherTongue(locale, courseLang)
    ? locale
    : (LOCALES.find((l) => l !== courseLang) ?? locale)
}

type PreferencesContextValue = Preferences & {
  setMotherTongue: (locale: Locale) => void
  setInterfaceLanguage: (locale: Locale) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children, initial }: { children: ReactNode; initial?: Preferences }) {
  const [prefs, setPrefs] = useState(() => initial ?? loadPreferences())

  useEffect(() => {
    savePreferences(prefs)
    document.documentElement.lang = prefs.motherTongue
  }, [prefs])

  const value = useMemo(
    () => ({
      ...prefs,
      setMotherTongue: (locale: Locale) =>
        setPrefs((p) => (p.motherTongue === locale ? p : { ...p, motherTongue: locale })),
      setInterfaceLanguage: (locale: Locale) => setPrefs((p) => ({ ...p, interfaceLanguage: locale })),
    }),
    [prefs],
  )
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw Error('usePreferences outside PreferencesProvider')
  return ctx
}
