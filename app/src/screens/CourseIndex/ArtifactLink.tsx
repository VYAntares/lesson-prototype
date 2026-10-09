import { useId } from 'react'
import { useI18n } from '../../lib/i18n'
import { routes } from '../../lib/router'
import { describeArtifacts } from '../../lib/content/status'
import type { LessonArtifacts } from '../../schemas/manifest'

/** "Outline" / "Draft" / "Content" link to the lesson detail page, with a warning when needed. */
export function ArtifactLink({ lessonId, artifacts }: { lessonId: string; artifacts?: LessonArtifacts }) {
  const { t } = useI18n()
  const descriptionId = useId()
  const info = describeArtifacts(artifacts)
  const description = [
    t(`content.describe.${info.label}`),
    info.incomplete ? t('content.describe.incomplete') : '',
    info.problem ? t(`content.describe.${info.problem}`) : '',
  ]
    .filter(Boolean)
    .join(' ')
  const warn = info.incomplete || info.problem !== null

  return (
    <>
      <a
        className={`button button-outline button-small${warn ? ' has-warning' : ''}`}
        href={routes.lesson(lessonId)}
        aria-describedby={descriptionId}
      >
        {t(`artifact.${info.label}`)}
        {warn && <span aria-hidden="true"> ⚠</span>}
      </a>
      <span id={descriptionId} className="visually-hidden">
        {description}
      </span>
    </>
  )
}
