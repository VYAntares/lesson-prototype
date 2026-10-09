import { StatusMessage } from '../../components/layout/StatusMessage'
import type { LoadedFile } from '../../lib/content/useArtifactFile'
import type { Issue } from '../../lib/content/validate'
import { useI18n } from '../../lib/i18n'
import type { OutlineEntry } from '../../schemas/outline'
import { IssueList } from './IssueList'
import { JsonTree, type TreeOverrides } from './JsonTree'

type Props = {
  entry: OutlineEntry
  draft: LoadedFile
  content: LoadedFile
  issues: { draft?: Issue[]; content?: Issue[] }
  overrides: TreeOverrides
  onOverridesChange: (overrides: TreeOverrides) => void
}

/** "Raw JSON" view: outline entry, brief and content as one tree, plus diagnostics. */
export function RawJsonView({ entry, draft, content, issues, overrides, onOverridesChange }: Props) {
  const { t } = useI18n()
  const value: Record<string, unknown> = { outline: entry }
  if (draft.status === 'parsed') value.draft = draft.data
  if (content.status === 'parsed') value.content = content.data
  const failed = (
    [
      ['draft', draft],
      ['content', content],
    ] as const
  ).filter(([, f]) => f.status === 'parseError' || f.status === 'loadError')

  return (
    <section aria-label={t('action.rawJson')}>
      <p className="muted">{t('raw.hint')}</p>
      <JsonTree value={value} rootLabel={t('raw.rootLabel')} overrides={overrides} onOverridesChange={onOverridesChange} />
      {(['draft', 'content'] as const).map(
        (slot) =>
          issues[slot] &&
          issues[slot].length > 0 && (
            <div key={`issues-${slot}`} className="diagnostic">
              <p>{t(`artifact.${slot}`)}</p>
              <IssueList issues={issues[slot]} />
            </div>
          ),
      )}
      {failed.map(([slot, file]) => (
        <div key={slot} className="diagnostic">
          {file.status === 'parseError' ? (
            <>
              <p>{t('raw.parseError', { artifact: t(`artifact.${slot}`), error: file.error })}</p>
              <pre className="raw-text">{file.text}</pre>
            </>
          ) : (
            file.status === 'loadError' && (
              <StatusMessage kind="error">{t('detail.loadFailed', { error: file.error })}</StatusMessage>
            )
          )}
        </div>
      ))}
    </section>
  )
}
