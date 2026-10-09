import { useEffect, useMemo, useState } from 'react'
import { AppHeader, Brand } from '../../components/layout/AppHeader'
import { StatusMessage } from '../../components/layout/StatusMessage'
import { findCourseOfLesson } from '../../lib/content/courses'
import { useOutline } from '../../lib/content/manifest'
import { startBlockers } from '../../lib/content/status'
import { useArtifactFile } from '../../lib/content/useArtifactFile'
import { validateBrief, validateContent, type Issue } from '../../lib/content/validate'
import { useI18n } from '../../lib/i18n'
import { routes } from '../../lib/router'
import { needsContentFile, type Brief } from '../../schemas/brief'
import type { Course, Manifest } from '../../schemas/manifest'
import { ArtifactSection } from './ArtifactSection'
import { StartBlockerList } from './IssueList'
import type { TreeOverrides } from './JsonTree'
import { OutlineMeta } from './OutlineMeta'
import { RawJsonView } from './RawJsonView'

const SECTIONS = ['outline', 'draft', 'content'] as const

type Props = { manifest: Manifest; lessonId: string; onReturnToOverview: (course: Course) => void }

/** Lesson detail: outline entry, brief and content, with a structured and a raw JSON view. */
export function LessonDetail({ manifest, lessonId, onReturnToOverview }: Props) {
  const { t } = useI18n()
  const course = findCourseOfLesson(manifest, lessonId)
  const outline = useOutline(course)
  const artifacts = manifest.artifacts[lessonId]
  const draft = useArtifactFile(artifacts?.draft)
  const content = useArtifactFile(artifacts?.content)
  const [view, setView] = useState<'structured' | 'raw'>('structured')
  const [treeOverrides, setTreeOverrides] = useState<TreeOverrides>(() => new Map())
  const [jumpTarget, setJumpTarget] = useState<(typeof SECTIONS)[number]>()

  useEffect(() => {
    if (jumpTarget && view === 'structured') {
      document.getElementById(`${jumpTarget}-heading`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setJumpTarget(undefined)
    }
  }, [jumpTarget, view])

  const index = outline.status === 'ready' ? outline.data.entries.findIndex((e) => e.id === lessonId) : -1
  const entry = outline.status === 'ready' ? outline.data.entries[index] : undefined
  const blockers = entry ? startBlockers(entry.kind, artifacts) : []

  const checks = useMemo((): { draft?: Issue[]; content?: Issue[]; brief?: Brief } => {
    if (!entry || !course) return {}
    const ctx = { entry, lang: course.lang, level: course.level }
    const briefResult = draft.status === 'parsed' ? validateBrief(draft.data, ctx) : undefined
    let contentIssues: Issue[] | undefined
    if (content.status === 'parsed')
      contentIssues =
        briefResult?.value && briefResult.status !== 'invalid'
          ? validateContent(content.data, { ...ctx, brief: briefResult.value }).issues
          : [{ path: '', message: 'no valid draft to check this content against' }]
    return { draft: briefResult?.issues, content: contentIssues, brief: briefResult?.value }
  }, [entry, course, draft, content])

  const canStart = entry !== undefined && blockers.length === 0

  const actions = course && (
    <>
      <a
        className="button button-outline"
        href={routes.index()}
        onClick={(e) => {
          e.preventDefault()
          onReturnToOverview(course)
        }}
      >
        {t('action.lessonOverview')}
      </a>
      <button
        type="button"
        className="button button-outline"
        aria-pressed={view === 'raw'}
        onClick={() => setView(view === 'raw' ? 'structured' : 'raw')}
      >
        {t(view === 'raw' ? 'action.structuredView' : 'action.rawJson')}
      </button>
      {canStart && (
        <a className="button button-primary artifact-start" href={routes.play(lessonId)}>
          {t('action.startLesson')}
        </a>
      )}
      {entry && (
        <div className="header-jump" role="group" aria-label={t('detail.jumpTo')}>
          {SECTIONS.filter((s) => s !== 'content' || needsContentFile(entry.kind)).map((section) => (
            <button
              key={section}
              type="button"
              className="button button-outline"
              onClick={() => {
                setView('structured')
                setJumpTarget(section)
              }}
            >
              {t(`artifact.${section}`)}
            </button>
          ))}
        </div>
      )}
    </>
  )

  let body
  if (!course)
    body = (
      <StatusMessage kind="error">
        {t('detail.notFound', { id: lessonId })} <a href={routes.index()}>{t('action.lessonOverview')}</a>
      </StatusMessage>
    )
  else if (outline.status === 'loading') body = <StatusMessage>{t('state.loading')}</StatusMessage>
  else if (outline.status === 'error')
    body = (
      <StatusMessage kind="error" onRetry={outline.retry}>
        {t('state.outlineFailed', { error: outline.error })}
      </StatusMessage>
    )
  else if (!entry) body = <StatusMessage kind="error">{t('detail.notFound', { id: lessonId })}</StatusMessage>
  else if (view === 'raw')
    body = (
      <RawJsonView
        entry={entry}
        draft={draft}
        content={content}
        issues={checks}
        overrides={treeOverrides}
        onOverridesChange={setTreeOverrides}
      />
    )
  else {
    const pendingCategory = entry.kind === 'functions' || entry.kind === 'reading'
    body = (
      <>
        {pendingCategory && <StatusMessage>{t('detail.pendingCategory', { kind: t(`kind.${entry.kind}`) })}</StatusMessage>}
        {!canStart && !pendingCategory && (
          <div className="note" role="note">
            <p>{t('detail.startUnavailable')}</p>
            <StartBlockerList reasons={blockers} />
          </div>
        )}
        <section className="artifact-section" aria-labelledby="outline-heading">
          <h2 id="outline-heading">
            <span className="section-tag">{t('artifact.outline')}</span> {t('detail.outlineHeading')}
          </h2>
          <OutlineMeta entry={entry} ordinal={index + 1} lang={course.lang} level={course.level} />
        </section>
        <ArtifactSection slot="draft" kind={entry.kind} loaded={draft} issues={checks.draft} file={artifacts?.draft} />
        {needsContentFile(entry.kind) && (
          <ArtifactSection
            slot="content"
            kind={entry.kind}
            loaded={content}
            issues={checks.content}
            file={artifacts?.content}
            brief={checks.brief}
          />
        )}
      </>
    )
  }

  return (
    <>
      <AppHeader motherTongueEditable courseLang={course?.lang} title={<Brand />} actions={actions} />
      <main id="main" tabIndex={-1} className="page page-wide">
        <h1 lang={course?.lang}>{entry?.workingTitle ?? lessonId}</h1>
        {body}
      </main>
    </>
  )
}
