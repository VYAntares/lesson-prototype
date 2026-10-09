import { useI18n } from '../../lib/i18n'
import type { OutlineEntry } from '../../schemas/outline'

type Props = { entry: OutlineEntry; ordinal: number; lang: string; level: string }

/** Outline entry details: number, category, course, topic/theme, id and intent. */
export function OutlineMeta({ entry, ordinal, lang, level }: Props) {
  const { t, topic, theme, languageName } = useI18n()
  return (
    <dl className="meta-grid">
      <div>
        <dt className="visually-hidden">{t('col.number')}</dt>
        <dd className="label-muted">{t('detail.lessonNumber', { number: ordinal })}</dd>
      </div>
      <div>
        <dt className="visually-hidden">{t('col.category')}</dt>
        <dd>
          <span className={`badge badge-${entry.kind}`}>{t(`kind.${entry.kind}`)}</span>
        </dd>
      </div>
      <div>
        <dt className="visually-hidden">{t('index.learningLanguage')}</dt>
        <dd>{t('index.courseLabel', { language: languageName(lang), level })}</dd>
      </div>
      {entry.topic && (
        <div>
          <dt>{t('detail.topic')}</dt>
          <dd>{topic(entry.topic)}</dd>
        </div>
      )}
      {entry.theme && (
        <div>
          <dt>{t('detail.theme')}</dt>
          <dd>{theme(entry.theme)}</dd>
        </div>
      )}
      <div>
        <dt>{t('detail.id')}</dt>
        <dd>
          <code className="secondary">{entry.id}</code>
        </dd>
      </div>
      <div className="meta-wide">
        <dt>{t('detail.intent')}</dt>
        <dd lang={lang} className="intent">
          {entry.intent}
        </dd>
      </div>
    </dl>
  )
}
