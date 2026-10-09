import type { ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { detectPlatform, type Platform } from '../../lib/speech'

const LINUX_PACKAGES: [string, string][] = [
  ['Debian / Ubuntu', 'sudo apt install speech-dispatcher espeak-ng'],
  ['Fedora', 'sudo dnf install speech-dispatcher speech-dispatcher-utils espeak-ng'],
  ['Arch', 'sudo pacman -S speech-dispatcher espeak-ng'],
]

/** How to install a speech voice on the detected OS and browser. */
export function VoiceHelpSteps({ platform = detectPlatform() }: { platform?: Platform }) {
  const { t } = useI18n()
  const { os, browser } = platform
  const browserName = t(`voice.browserName.${browser}`)
  const restart = (
    <li>{browser === 'other' ? t('voice.restartAnyBrowser') : t('voice.restartBrowser', { browser: browserName })}</li>
  )
  let steps: ReactNode
  let notes: string[] = []
  switch (os) {
    case 'windows':
      steps = (
        <>
          <li>{t('voice.win.open')}</li>
          <li>{t('voice.win.add')}</li>
          {restart}
        </>
      )
      notes = [t('voice.win.existing')]
      if (browser === 'firefox') notes.push(t('voice.win.firefox'))
      break
    case 'mac':
      steps = (
        <>
          <li>{t('voice.mac.open')}</li>
          <li>{t('voice.mac.download')}</li>
          {restart}
        </>
      )
      break
    case 'linux':
      steps = (
        <>
          <li>
            {t('voice.linux.install')}
            <ul>
              {LINUX_PACKAGES.map(([distro, command]) => (
                <li key={distro}>
                  {distro}: <code>{command}</code>
                </li>
              ))}
            </ul>
          </li>
          <li>
            {t('voice.linux.test')} <code>spd-say -l fr bonjour</code>
          </li>
          {restart}
        </>
      )
      notes = [t('voice.linux.sandbox')]
      break
    case 'android':
      steps = (
        <>
          <li>{t('voice.android.steps')}</li>
          {restart}
        </>
      )
      break
    case 'ios':
      steps = (
        <>
          <li>{t('voice.ios.steps')}</li>
          {restart}
        </>
      )
      break
    default:
      steps = (
        <>
          <li>{t('voice.other.steps')}</li>
          {restart}
        </>
      )
  }
  if (os !== 'linux' && browser === 'chrome') notes.push(t('voice.online.chrome'))
  if (os !== 'linux' && browser === 'edge') notes.push(t('voice.online.edge'))
  return (
    <div className="voice-help-steps">
      <p>{t('voice.detected', { os: t(`voice.osName.${os}`), browser: browserName })}</p>
      <ol>{steps}</ol>
      {notes.map((note, i) => (
        <p key={i}>{note}</p>
      ))}
    </div>
  )
}
