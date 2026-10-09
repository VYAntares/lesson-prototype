import { useEffect, useMemo, useState } from 'react'
import { AppHeader, Brand } from '../../components/layout/AppHeader'
import { StatusMessage } from '../../components/layout/StatusMessage'
import { findCourseOfLesson } from '../../lib/content/courses'
import { tryFetchText } from '../../lib/content/fetch'
import { useOutline } from '../../lib/content/manifest'
import { startBlockers } from '../../lib/content/status'
import { validateBrief, validateContent } from '../../lib/content/validate'
import { useI18n } from '../../lib/i18n'
import { buildPlan } from '../../lib/lesson/plan'
import { isValidMotherTongue, usePreferences } from '../../lib/preferences'
import { routes } from '../../lib/router'
import { createSession } from '../../lib/session/reducer'
import { clearSession, loadSession } from '../../lib/session/storage'
import type { SessionRecord } from '../../lib/session/types'
import { clock } from '../../lib/session/useSession'
import { compileVocabularyLesson } from '../../lib/vocabulary/compileLesson'
import { needsContentFile, type Brief } from '../../schemas/brief'
import { LOCALES } from '../../schemas/common'
import type { Lesson } from '../../schemas/lesson'
import type { Manifest } from '../../schemas/manifest'
import { StartBlockerList } from '../LessonDetail/IssueList'
import { PlayerSession } from './PlayerSession'
import { StartScreen } from './StartScreen'

type Loaded = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; brief: Brief; content: Lesson }

/** Route #/lesson/<id>/play: loads and validates the lesson, then shows start screen and session. */
export function LessonPlayer({ manifest, lessonId }: { manifest: Manifest; lessonId: string }) {
  const { t } = useI18n()
  const prefs = usePreferences()
  const course = findCourseOfLesson(manifest, lessonId)
  const outline = useOutline(course)
  const entry = outline.status === 'ready' ? outline.data.entries.find((e) => e.id === lessonId) : undefined
  const artifacts = manifest.artifacts[lessonId]
  const blockers = entry ? startBlockers(entry.kind, artifacts) : []
  const playable = entry !== undefined && blockers.length === 0
  /** Hash of the file the lesson is built from; a saved session is only resumed for the same hash. */
  const contentHash = (entry && !needsContentFile(entry.kind) ? artifacts?.draft?.sourceHash : artifacts?.content?.sourceHash) ?? ''
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' })

  useEffect(() => {
    if (!playable || !course || !entry || !artifacts?.draft) return
    const controller = new AbortController()
    const contentUrl = needsContentFile(entry.kind) ? artifacts.content?.url : undefined
    Promise.all([
      tryFetchText(artifacts.draft.url, controller.signal),
      contentUrl ? tryFetchText(contentUrl, controller.signal) : Promise.resolve(undefined),
    ]).then(
      ([draftFile, contentFile]) => {
        if (draftFile.status === 'error' || contentFile?.status === 'error')
          return setLoaded({
            status: 'error',
            error: draftFile.status === 'error' ? draftFile.error : (contentFile as { error: string }).error,
          })
        try {
          const ctx = { entry, lang: course.lang, level: course.level }
          const brief = validateBrief(JSON.parse(draftFile.text), ctx)
          const content = brief.value
            ? brief.value.kind === 'vocabulary'
              ? { status: brief.status, value: compileVocabularyLesson(brief.value) as Lesson }
              : contentFile?.status === 'ok'
                ? validateContent(JSON.parse(contentFile.text), { ...ctx, brief: brief.value })
                : undefined
            : undefined
          if (brief.status !== 'valid' || !content || content.status !== 'valid' || !brief.value || !content.value)
            return setLoaded({ status: 'error', error: t('reason.invalid') })
          setLoaded({ status: 'ready', brief: brief.value, content: content.value })
        } catch (e) {
          setLoaded({ status: 'error', error: (e as Error).message })
        }
      },
      () => undefined,
    )
    return () => controller.abort()
  }, [playable, course, entry, artifacts, t])

  const saved = useMemo(() => loadSession(lessonId), [lessonId])
  const resumable = saved && saved.status === 'active' && saved.contentHash === contentHash ? saved : undefined
  const contentChanged = saved && saved.status === 'active' && saved.contentHash !== contentHash
  const [session, setSession] = useState<SessionRecord>()
  const [inProgress, setInProgress] = useState(false)
  const motherTongue =
    course && isValidMotherTongue(prefs.motherTongue, course.lang)
      ? prefs.motherTongue
      : (LOCALES.find((l) => l !== course?.lang) ?? 'en')

  const plan = useMemo(
    () =>
      loaded.status === 'ready'
        ? buildPlan(loaded.content, loaded.brief, session?.motherTongue ?? motherTongue, {
            interleaveGroups: true,
            examIntro: true,
          })
        : undefined,
    [loaded, session?.motherTongue, motherTongue],
  )

  const start = () => {
    if (!plan || !course) return
    clearSession(lessonId)
    setSession(
      createSession(plan, {
        sessionId: crypto.randomUUID(),
        contentHash,
        level: course.level,
        motherTongue,
        seed: Math.floor(Math.random() * 2 ** 31),
        now: clock.now(),
      }),
    )
  }

  let body
  if (!course) body = <StatusMessage kind="error">{t('detail.notFound', { id: lessonId })}</StatusMessage>
  else if (outline.status === 'loading') body = <StatusMessage>{t('state.loading')}</StatusMessage>
  else if (outline.status === 'error')
    body = (
      <StatusMessage kind="error" onRetry={outline.retry}>
        {t('state.outlineFailed', { error: outline.error })}
      </StatusMessage>
    )
  else if (!playable)
    body = (
      <StatusMessage kind="error">
        {t('play.unavailable')}
        <StartBlockerList reasons={blockers} />
      </StatusMessage>
    )
  else if (loaded.status === 'loading' || !plan)
    body =
      loaded.status === 'error' ? (
        <StatusMessage kind="error">{t('detail.loadFailed', { error: loaded.error })}</StatusMessage>
      ) : (
        <StatusMessage>{t('state.loading')}</StatusMessage>
      )
  else if (session)
    body = <PlayerSession key={session.sessionId} plan={plan} initial={session} onRestart={start} onPhase={setInProgress} />
  else
    body = (
      <StartScreen
        plan={plan}
        level={course.level}
        resumable={!!resumable}
        notice={contentChanged ? t('session.changedContent') : undefined}
        onStart={start}
        onResume={() => resumable && setSession(resumable)}
      />
    )

  return (
    <>
      <AppHeader
        motherTongueEditable={false}
        courseLang={course?.lang}
        motherTongueOverride={session?.motherTongue}
        title={<Brand />}
        actions={
          <a className="button button-outline" href={routes.index()}>
            {t(session && inProgress ? 'action.cancelLesson' : 'action.lessonOverview')}
          </a>
        }
      />
      <main id="main" tabIndex={-1} className="page page-task">
        {body}
      </main>
    </>
  )
}
