import { useId, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { isValidMotherTongue, usePreferences } from '../../lib/preferences'
import { routes } from '../../lib/router'
import { LOCALES, type Locale } from '../../schemas/common'

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

/**
 * One language setting: the learner's mother tongue. The interface, the instructions and the
 * explanations all use it (team feedback: instructions belong in the mother tongue).
 */
export function AppHeader({ motherTongueEditable, courseLang, motherTongueOverride, announcement, title, actions }: Props) {
  const { t } = useI18n()
  const prefs = usePreferences()
  const motherTongue = motherTongueOverride ?? prefs.motherTongue
  const lockedId = useId()

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
        <div className="header-bar">
          <div className="header-title">{title}</div>
          {actions && <nav className="header-actions">{actions}</nav>}
        </div>
        <div className="prefs">
          <fieldset
            className="segmented"
            disabled={!motherTongueEditable}
            aria-describedby={motherTongueEditable ? undefined : lockedId}
          >
            <legend className="label-muted">{t('prefs.myLanguage')}</legend>
            {LOCALES.map((locale) => {
              const allowed = !courseLang || isValidMotherTongue(locale, courseLang)
              return (
                <label
                  key={locale}
                  className="segment"
                  title={allowed ? t(`locale.${locale}`) : t('prefs.sameAsCourse', { locale: t(`locale.${locale}`) })}
                >
                  <input
                    type="radio"
                    name="mother-tongue"
                    value={locale}
                    checked={motherTongue === locale}
                    disabled={!allowed}
                    onChange={() => prefs.setMotherTongue(locale)}
                  />
                  <span lang={locale}>{locale}</span>
                </label>
              )
            })}
          </fieldset>
          {!motherTongueEditable && (
            <p id={lockedId} className="visually-hidden">
              {t('prefs.motherTongueLocked')}
            </p>
          )}
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
  return (
    <a className="brand" href={routes.index()}>
      {t('app.brand')}
    </a>
  )
}
