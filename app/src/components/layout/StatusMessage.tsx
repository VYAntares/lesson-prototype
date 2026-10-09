import type { ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'

type Props = { kind?: 'info' | 'error'; children: ReactNode; onRetry?: () => void }

/** Loading / error box, with an optional retry button. */
export function StatusMessage({ kind = 'info', children, onRetry }: Props) {
  const { t } = useI18n()
  return (
    <div className={`status status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onRetry && (
        <button type="button" className="button button-outline button-small" onClick={onRetry}>
          {t('action.retry')}
        </button>
      )}
    </div>
  )
}
