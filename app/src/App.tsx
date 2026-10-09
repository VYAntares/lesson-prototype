import { useEffect, useState, type ReactNode } from 'react'
import { AppHeader, Brand } from './components/layout/AppHeader'
import { StatusMessage } from './components/layout/StatusMessage'
import { ALL_KINDS, defaultSelection, selectLanguage, type CourseSelection } from './lib/content/courses'
import { useManifest } from './lib/content/manifest'
import { useI18n } from './lib/i18n'
import { LastTryProvider } from './lib/lastTry'
import { adjustMotherTongue, PreferencesProvider, usePreferences } from './lib/preferences'
import { routes, useRoute } from './lib/router'
import { CourseIndex } from './screens/CourseIndex/CourseIndex'
import { LessonDetail } from './screens/LessonDetail/LessonDetail'
import { LessonPlayer } from './screens/Player/LessonPlayer'

export function App() {
  return (
    <PreferencesProvider>
      <LastTryProvider>
        <Routes />
      </LastTryProvider>
    </PreferencesProvider>
  )
}

function Routes() {
  const { t } = useI18n()
  const route = useRoute()
  const manifest = useManifest()
  const [selection, setSelection] = useState<CourseSelection>()
  const [categories, setCategories] = useState<ReadonlySet<string>>(ALL_KINDS)
  const [announcement, setAnnouncement] = useState('')
  const { motherTongue, setMotherTongue } = usePreferences()

  useEffect(() => {
    if (manifest.status === 'ready' && !selection) setSelection(defaultSelection(manifest.data))
  }, [manifest, selection])

  // The mother tongue may not be the language being learned.
  useEffect(() => {
    if (!selection) return
    const adjusted = adjustMotherTongue(motherTongue, selection.lang)
    if (adjusted !== motherTongue) {
      setMotherTongue(adjusted)
      setAnnouncement(t('prefs.motherTongueChanged', { locale: t(`locale.${adjusted}`) }))
    }
  }, [selection, motherTongue, setMotherTongue, t])

  const shell = (content: ReactNode) => (
    <>
      <AppHeader motherTongueEditable={route.name === 'index'} title={<Brand />} />
      <main id="main" tabIndex={-1} className="page page-wide">
        {content}
      </main>
    </>
  )

  if (manifest.status === 'loading') return shell(<StatusMessage>{t('state.loading')}</StatusMessage>)
  if (manifest.status === 'error')
    return shell(
      <StatusMessage kind="error" onRetry={manifest.retry}>
        {t('state.invalidManifest', { error: manifest.error })}
      </StatusMessage>,
    )
  if (manifest.data.courses.length === 0 || !selection)
    return shell(<StatusMessage kind="error">{t('state.noCourses')}</StatusMessage>)

  switch (route.name) {
    case 'lesson':
      return (
        <LessonDetail
          key={route.id}
          manifest={manifest.data}
          lessonId={route.id}
          onReturnToOverview={(course) => {
            setSelection({ lang: course.lang, level: course.level })
            window.location.hash = routes.index()
          }}
        />
      )
    case 'play':
      return <LessonPlayer key={route.id} manifest={manifest.data} lessonId={route.id} />
    default:
      return (
        <CourseIndex
          manifest={manifest.data}
          selection={selection}
          categories={categories}
          announcement={announcement}
          onSelectLanguage={(lang) => setSelection((s) => (s && selectLanguage(manifest.data, s, lang)) ?? s)}
          onSelectLevel={(level) => setSelection((s) => s && { ...s, level })}
          onCategoriesChange={setCategories}
        />
      )
  }
}
