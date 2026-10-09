import { useMemo } from 'react'
import { languageNames } from '../i18n/languageNames'
import { messages } from '../i18n/messages'
import { themes } from '../i18n/themes'
import { topics } from '../i18n/topics'
import type { GrammarTopic, Locale, VocabularyTheme } from '../schemas/common'
import { usePreferences } from './preferences'

export type MessageKey = keyof (typeof messages)['en']
export type MessageParams = Record<string, string | number>

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const text: string = messages[locale][key]
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text
}

/** Interface strings in the current interface language. */
export function useI18n() {
  const { interfaceLanguage: locale } = usePreferences()
  return useMemo(
    () => ({
      locale,
      /** Translate a message key. Dynamic keys (e.g. `kind.${kind}`) are accepted as strings. */
      t: (key: MessageKey | (string & {}), params?: MessageParams) =>
        translate(locale, key as MessageKey, params),
      topic: (topic: GrammarTopic) => topics[locale][topic],
      theme: (theme: VocabularyTheme) => themes[locale][theme],
      languageName: (lang: string) => languageNames[locale][lang] ?? lang.toUpperCase(),
    }),
    [locale],
  )
}
