import { useEffect, useState } from 'react'

export type VoiceStatus = 'checking' | 'available' | 'unavailable'

/** Best installed voice for a language: exact "fr-FR", then any "fr-…", then "fr". */
function findVoice(lang: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis?.getVoices) return undefined
  const voices = window.speechSynthesis.getVoices()
  const l = lang.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === `${l}-${l.toUpperCase()}`.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${l}-`)) ??
    voices.find((v) => v.lang.toLowerCase() === l)
  )
}

/** Whether a voice for `lang` is installed. Voices load asynchronously, so wait up to 750 ms. */
export function useVoiceStatus(lang: string): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>('checking')
  useEffect(() => {
    const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis
    if (!synth?.getVoices || typeof SpeechSynthesisUtterance === 'undefined') {
      setStatus('unavailable')
      return
    }
    const update = () => {
      if (findVoice(lang)) setStatus('available')
      else setStatus((s) => (s === 'available' ? 'unavailable' : s))
    }
    setStatus('checking')
    update()
    synth.addEventListener?.('voiceschanged', update)
    const timeout = window.setTimeout(() => setStatus((s) => (s === 'checking' ? 'unavailable' : s)), 750)
    return () => {
      window.clearTimeout(timeout)
      synth.removeEventListener?.('voiceschanged', update)
    }
  }, [lang])
  return status
}

/** Speaks `text`; returns false when no suitable voice exists. */
export function speak(text: string, lang: string) {
  const voice = findVoice(lang)
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis
  if (!voice || !synth || typeof SpeechSynthesisUtterance === 'undefined') return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice.lang
  utterance.voice = voice
  synth.cancel()
  synth.speak(utterance)
  return true
}

export type Platform = {
  os: 'ios' | 'android' | 'chromeos' | 'windows' | 'mac' | 'linux' | 'other'
  browser: 'edge' | 'firefox' | 'chrome' | 'safari' | 'other'
}

/** Rough OS/browser detection, used to show the right voice installation steps. */
export function detectPlatform(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): Platform {
  const ua = nav?.userAgent ?? ''
  return {
    os:
      /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1)
        ? 'ios'
        : /Android/.test(ua)
          ? 'android'
          : /CrOS/.test(ua)
            ? 'chromeos'
            : /Windows/.test(ua)
              ? 'windows'
              : /Macintosh|Mac OS X/.test(ua)
                ? 'mac'
                : /Linux|X11/.test(ua)
                  ? 'linux'
                  : 'other',
    browser: /Edg(e|A|iOS)?\//.test(ua)
      ? 'edge'
      : /Firefox\/|FxiOS\//.test(ua)
        ? 'firefox'
        : /OPR\//.test(ua)
          ? 'other'
          : /Chrome\/|CriOS\//.test(ua)
            ? 'chrome'
            : /Safari\//.test(ua)
              ? 'safari'
              : 'other',
  }
}
