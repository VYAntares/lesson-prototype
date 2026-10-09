import { useId, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { isValidMotherTongue, usePreferences } from '../../lib/preferences'
import { LOCALES, type Locale } from '../../schemas/common'

const INTERFACE_LANGUAGES: Locale[] = ['fr', 'en', 'de']

type Props = {
  /** Mother tongue can only be changed on the course index and lesson overview. */
  motherTongueEditable: boolean
  /** Course language: that locale is disabled as mother tongue. */
  courseLang?: string
  /** Show this mother tongue instead of the saved preference (locked sessions). */
  motherTongueOverride?: Locale
  /** Screen-reader announcement. */
  announcement?: string
  title: ReactNode
  actions?: ReactNode
}

export function AppHeader({
  motherTongueEditable,
  courseLang,
  motherTongueOverride,
  announcement,
  title,
  actions,
}: Props) {
  const { t } = useI18n()
  const prefs = usePreferences()
  const motherTongue = motherTongueOverride ?? prefs.motherTongue
  const lockedId = useId()
  const sameAsCourseId = useId()
  const interfaceId = useId()

  return (
    <header className="app-header">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        {t('app.skipToContent')}
      </a>
      <div className="header-inner">
        <div className="prefs">
          <fieldset
            className="segmented"
            disabled={!motherTongueEditable}
            aria-describedby={motherTongueEditable ? undefined : lockedId}
          >
            <legend className="label-muted">{t('prefs.motherTongue')}</legend>
            {LOCALES.map((locale) => {
              const allowed = !courseLang || isValidMotherTongue(locale, courseLang)
              return (
                <label
                  key={locale}
                  className="segment"
                  title={
                    allowed
                      ? t(`locale.${locale}`)
                      : t('prefs.sameAsCourse', { locale: t(`locale.${locale}`) })
                  }
                >
                  <input
                    type="radio"
                    name="mother-tongue"
                    value={locale}
                    checked={motherTongue === locale}
                    disabled={!allowed}
                    aria-describedby={allowed ? undefined : sameAsCourseId}
                    onChange={() => prefs.setMotherTongue(locale)}
                  />
                  <span lang={locale}>{locale}</span>
                </label>
              )
            })}
          </fieldset>
          <div className="select-field">
            <label className="label-muted" htmlFor={interfaceId}>
              {t('prefs.interfaceLanguage')}
            </label>
            <select
              id={interfaceId}
              value={prefs.interfaceLanguage}
              onChange={(e) => prefs.setInterfaceLanguage(e.target.value as Locale)}
            >
              {INTERFACE_LANGUAGES.map((locale) => (
                <option key={locale} value={locale} lang={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </div>
          {!motherTongueEditable && (
            <p id={lockedId} className="visually-hidden">
              {t('prefs.motherTongueLocked')}
            </p>
          )}
          {courseLang && (LOCALES as readonly string[]).includes(courseLang) && (
            <p id={sameAsCourseId} className="visually-hidden">
              {t('prefs.sameAsCourse', { locale: t(`locale.${courseLang}`) })}
            </p>
          )}
        </div>
        <div className="header-bar">
          <div className="header-title">{title}</div>
          <nav className="header-actions">{actions}</nav>
        </div>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </header>
  )
}

export function Brand() {
  const { t } = useI18n()
  return <span className="brand">{t('app.brand')}</span>
}
