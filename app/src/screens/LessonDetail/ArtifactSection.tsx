import type { ComponentType } from 'react'
import { StatusMessage } from '../../components/layout/StatusMessage'
import type { LoadedFile } from '../../lib/content/useArtifactFile'
import type { Issue } from '../../lib/content/validate'
import { useI18n } from '../../lib/i18n'
import type { Brief, GrammarBrief, VocabularyBrief } from '../../schemas/brief'
import type { ArtifactRef } from '../../schemas/manifest'
import { GrammarBriefView } from './brief/GrammarBriefView'
import { VocabularyBriefView } from './brief/VocabularyBriefView'
import { GrammarContentView } from './GrammarContentView'
import { IssueList } from './IssueList'

type ViewProps = { data: unknown; brief?: Brief }

/** Structured views per artifact slot and lesson kind. Data reaching them has passed validation. */
const VIEWS: Record<'draft' | 'content', Partial<Record<string, ComponentType<ViewProps>>>> = {
  draft: {
    vocabulary: ({ data }) => <VocabularyBriefView data={data as VocabularyBrief} />,
    grammar: ({ data }) => <GrammarBriefView data={data as GrammarBrief} />,
  },
  content: { grammar: GrammarContentView },
}

type Props = {
  slot: 'draft' | 'content'
  kind: string
  loaded: LoadedFile
  issues?: Issue[]
  file?: ArtifactRef
  brief?: Brief
}

/** "Draft" or "Content" section of the lesson detail page. */
export function ArtifactSection({ slot, kind, loaded, issues, file, brief }: Props) {
  const { t } = useI18n()
  const headingId = `${slot}-heading`
  const View = VIEWS[slot][kind]
  let body
  switch (loaded.status) {
    case 'absent':
      body = <p className="muted">{t(slot === 'draft' ? 'detail.missingDraft' : 'detail.missingContent')}</p>
      break
    case 'loading':
      body = <p className="muted">{t('state.loading')}</p>
      break
    case 'loadError':
      body = <StatusMessage kind="error">{t('detail.loadFailed', { error: loaded.error })}</StatusMessage>
      break
    case 'parseError':
      body = (
        <>
          <StatusMessage kind="error">{t('detail.malformed', { error: loaded.error })}</StatusMessage>
          <pre className="raw-text">{loaded.text}</pre>
        </>
      )
      break
    case 'parsed':
      body = (
        <>
          {file?.status === 'stale' && <StatusMessage>{t('detail.stale')}</StatusMessage>}
          {issues && issues.length > 0 ? (
            <IssueList issues={issues} />
          ) : View ? (
            <View data={loaded.data} brief={brief} />
          ) : (
            <p className="muted">{t('detail.noStructuredView')}</p>
          )}
        </>
      )
  }
  return (
    <section className="artifact-section" aria-labelledby={headingId}>
      <h2 id={headingId}>
        <span className="section-tag">{t(`artifact.${slot}`)}</span>{' '}
        {t(slot === 'draft' ? 'detail.draftHeading' : 'detail.contentHeading')}
      </h2>
      {body}
    </section>
  )
}
