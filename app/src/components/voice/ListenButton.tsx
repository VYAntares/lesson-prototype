import { useId, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { speak, useVoiceStatus } from '../../lib/speech'
import { VoiceHelpSteps } from './VoiceHelpSteps'

type Props = {
  text: string
  lang: string
  /** "text": labelled button; "icon": round speaker button. */
  variant?: 'text' | 'icon'
  label?: string
  size?: 'small' | 'large'
}

/** Speaks a word or sentence; when no voice is installed, opens installation help. */
export function ListenButton({ text, lang, variant = 'icon', label, size = 'small' }: Props) {
  const { t } = useI18n()
  const voice = useVoiceStatus(lang)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [helpOpen, setHelpOpen] = useState(false)
  const openHelp = () => {
    setHelpOpen(true)
    dialog.current?.showModal()
  }
  const unavailable = voice === 'unavailable'
  const iconLabel = unavailable ? t('voice.install') : (label ?? t('session.listen'))

  return (
    <div className="listen">
      {variant === 'icon' ? (
        <button
          type="button"
          className={`icon-button icon-button-${size}${unavailable ? ' is-unavailable' : ''}`}
          aria-haspopup={unavailable ? 'dialog' : undefined}
          aria-label={iconLabel}
          title={iconLabel}
          onClick={() => (unavailable ? openHelp() : speak(text, lang) || openHelp())}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={size === 'large' ? 22 : 16}
            height={size === 'large' ? 22 : 16}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
          </svg>
        </button>
      ) : unavailable ? (
        <button type="button" className="button button-outline button-small" aria-haspopup="dialog" onClick={openHelp}>
          {t('voice.install')}
        </button>
      ) : (
        <button type="button" className="button button-outline button-small" onClick={() => speak(text, lang) || openHelp()}>
          {t('session.listen')}
        </button>
      )}
      <dialog
        ref={dialog}
        className="voice-help-dialog"
        aria-labelledby={titleId}
        onClose={() => setHelpOpen(false)}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <h2 id={titleId}>{t('voice.missingTitle')}</h2>
        <p>{t('voice.missingIntro')}</p>
        {helpOpen && <VoiceHelpSteps />}
        <button type="button" className="button button-primary button-small" onClick={() => dialog.current?.close()}>
          {t('voice.close')}
        </button>
      </dialog>
    </div>
  )
}
