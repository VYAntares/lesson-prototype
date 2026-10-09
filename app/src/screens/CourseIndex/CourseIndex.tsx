import { useId } from 'react'
import { AppHeader, Brand } from '../../components/layout/AppHeader'
import { StatusMessage } from '../../components/layout/StatusMessage'
import {
  ALL_KINDS,
  courseLanguages,
  courseLevels,
  findCourse,
  numberedEntries,
  type CourseSelection,
} from '../../lib/content/courses'
import { useOutline } from '../../lib/content/manifest'
import { startBlockers } from '../../lib/content/status'
import { formatPercent } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { useLastTry } from '../../lib/lastTry'
import { routes } from '../../lib/router'
import { LESSON_KINDS, type Level } from '../../schemas/common'
import type { Manifest } from '../../schemas/manifest'
import { ArtifactLink } from './ArtifactLink'

type Props = {
  manifest: Manifest
  selection: CourseSelection
  categories: ReadonlySet<string>
  announcement: string
  onSelectLanguage: (lang: string) => void
  onSelectLevel: (level: Level) => void
  onCategoriesChange: (categories: ReadonlySet<string>) => void
}

/** Home screen: course filters and the list of lessons. */
export function CourseIndex({
  manifest,
  selection,
  categories,
  announcement,
  onSelectLanguage,
  onSelectLevel,
  onCategoriesChange,
}: Props) {
  const { t, languageName, locale } = useI18n()
  const { scores } = useLastTry()
  const course = findCourse(manifest, selection)
  const outline = useOutline(course)
  const languageLabelId = useId()
  const levelLabelId = useId()
  const categoriesLabelId = useId()
  const levels = courseLevels(manifest, selection.lang)
  const courseLabel = t('index.courseLabel', { language: languageName(selection.lang), level: selection.level })

  const toggleCategory = (kind: string) => {
    const next = new Set(categories)
    if (next.has(kind)) next.delete(kind)
    else next.add(kind)
    onCategoriesChange(next)
  }

  return (
    <>
      <AppHeader
        motherTongueEditable
        courseLang={selection.lang}
        announcement={announcement}
        title={<Brand />}
        actions={<span className="label-muted">{courseLabel}</span>}
      />
      <main id="main" tabIndex={-1} className="page page-wide">
        <div className="filters" role="group" aria-label={t('index.filters')}>
          <div role="radiogroup" aria-labelledby={languageLabelId} className="filter-group">
            <span id={languageLabelId} className="label-muted">
              {t('index.learningLanguage')}
            </span>
            <div className="option-row">
              {courseLanguages(manifest).map((lang) => (
                <label key={lang} className="option">
                  <input
                    type="radio"
                    name="learning-language"
                    checked={selection.lang === lang}
                    onChange={() => onSelectLanguage(lang)}
                  />
                  <span lang={lang} title={languageName(lang)}>
                    {lang}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-labelledby={levelLabelId} className="filter-group">
            <span id={levelLabelId} className="label-muted">
              {t('index.level')}
            </span>
            <div className="option-row">
              {levels.length === 0 && <span>{t('state.noLevels')}</span>}
              {levels.map((level) => (
                <label key={level} className="option">
                  <input
                    type="radio"
                    name="level"
                    checked={selection.level === level}
                    onChange={() => onSelectLevel(level)}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>
          <div role="group" aria-labelledby={categoriesLabelId} className="filter-group">
            <span id={categoriesLabelId} className="label-muted">
              {t('index.categories')}
            </span>
            <div className="option-row">
              {LESSON_KINDS.map((kind) => (
                <label key={kind} className="option">
                  <input type="checkbox" checked={categories.has(kind)} onChange={() => toggleCategory(kind)} />
                  <span>{t(`filter.${kind}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <h1>{t('index.title')}</h1>
        {outline.status === 'ready' && (
          <p className="lead">{t('index.summary', { course: courseLabel, count: outline.data.entries.length })}</p>
        )}
        {!course && <StatusMessage kind="error">{t('state.noLevels')}</StatusMessage>}
        {course && outline.status === 'loading' && <StatusMessage>{t('state.loading')}</StatusMessage>}
        {course && outline.status === 'error' && (
          <StatusMessage kind="error" onRetry={outline.retry}>
            {t('state.outlineFailed', { error: outline.error })}
          </StatusMessage>
        )}

        {outline.status === 'ready' && categories.size === 0 && (
          <div className="empty-state">
            <p>{t('index.noCategories')}</p>
            <a
              href={routes.index()}
              onClick={(e) => {
                e.preventDefault()
                onCategoriesChange(ALL_KINDS)
              }}
            >
              {t('index.resetCategories')}
            </a>
          </div>
        )}

        {outline.status === 'ready' && categories.size > 0 && (
          <div className="table-wrap">
            <table className="lesson-table">
              <thead>
                <tr>
                  <th scope="col">{t('col.number')}</th>
                  <th scope="col">{t('col.lesson')}</th>
                  <th scope="col">{t('col.category')}</th>
                  <th scope="col">{t('col.content')}</th>
                  <th scope="col">{t('col.lastTry')}</th>
                  <th scope="col">{t('col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {numberedEntries(outline.data.entries, new Set(categories)).map(({ ordinal, entry }) => {
                  const artifacts = manifest.artifacts[entry.id]
                  const playable = startBlockers(entry.kind, artifacts).length === 0
                  const score = scores.get(entry.id)
                  return (
                    <tr key={entry.id} data-lesson-id={entry.id}>
                      <td className="ordinal">{String(ordinal).padStart(2, '0')}</td>
                      <td lang={outline.data.lang}>{entry.workingTitle}</td>
                      <td>{t(`kind.${entry.kind}`)}</td>
                      <td>
                        <ArtifactLink lessonId={entry.id} artifacts={artifacts} />
                      </td>
                      <td className="score">{score === undefined ? '' : formatPercent(score, locale)}</td>
                      <td>
                        {playable && (
                          <a className="button button-primary button-small" href={routes.play(entry.id)}>
                            {t('action.startLesson')}
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">{t('index.lastTryNote')}</p>
      </main>
    </>
  )
}
