import { StatusMessage } from '../../components/layout/StatusMessage'
import type { Issue } from '../../lib/content/validate'
import { useI18n } from '../../lib/i18n'

/** Validation errors for a brief or content file. */
export function IssueList({ issues }: { issues: Issue[] }) {
  const { t } = useI18n()
  return (
    <StatusMessage kind="error">
      {t('detail.invalid')}
      <ul className="reasons">
        {issues.map((issue, i) => (
          <li key={i}>
            {issue.path && <code>{issue.path}</code>} {issue.message}
          </li>
        ))}
      </ul>
    </StatusMessage>
  )
}

/** Why a lesson cannot be started. */
export function StartBlockerList({ reasons }: { reasons: string[] }) {
  const { t } = useI18n()
  return (
    <ul className="reasons">
      {reasons.map((r) => (
        <li key={r}>{t(`reason.${r}`)}</li>
      ))}
    </ul>
  )
}
