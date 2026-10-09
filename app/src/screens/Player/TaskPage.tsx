import { useEffect, useRef, useState } from 'react'
import { VoiceHelpSteps } from '../../components/voice/VoiceHelpSteps'
import { useI18n } from '../../lib/i18n'
import type { Plan, PlanPage } from '../../lib/lesson/plan'
import { isMissingArticle } from '../../lib/session/answers'
import { allCardsRevealed, isListeningPage, isSelfCheckingPage } from '../../lib/session/reducer'
import { isAnswered, scoreUnit } from '../../lib/session/scoring'
import type { SessionAction, SessionRecord } from '../../lib/session/types'
import type { VoiceStatus } from '../../lib/speech'
import type { Locale } from '../../schemas/common'
import { ExamIntro } from './ExamIntro'
import { Exercise } from './exercises/registry'
import { ARRANGE_MS } from './exercises/shared/MatchingFrame'
import { Countdown, SessionHeader } from './SessionHeader'

function pageHeading(page: PlanPage, locale: Locale, t: (key: string) => string) {
  return page.items.length > 0 && page.items.every((i) => i.type === 'vocabulary_typed_gap')
    ? t('session.typedGapInstruction')
    : page.instructions[locale]
}

type Props = {
  plan: Plan
  record: SessionRecord
  dispatch: (action: SessionAction) => void
  remainingMs?: number
  voiceStatus?: VoiceStatus
}

/** The current page of a running lesson. */
export function TaskPage({ plan, record, dispatch, remainingMs, voiceStatus = 'available' }: Props) {
  const { t, locale } = useI18n()
  const page = plan.pages[record.pageIndex]
  const waitingForVoice = isListeningPage(page) && record.phase === 'answering'

  // Listening exam pages start their countdown once a voice is available.
  useEffect(() => {
    if (waitingForVoice && page.role === 'exam' && voiceStatus === 'available') dispatch({ type: 'voice_ready' })
  }, [waitingForVoice, page.pageId, page.role, voiceStatus, dispatch])

  const mode = page.role === 'exam' ? 'exam' : record.phase === 'feedback' ? 'feedback' : 'answering'
  const canContinue =
    page.role === 'presentation'
      ? allCardsRevealed(page, record)
      : page.role !== 'practice' || record.phase === 'feedback' || page.units.every((u) => isAnswered(u, record.drafts[u.id]))

  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ;(document.querySelector<HTMLElement>('.task-card input.text-input:not([readonly]):not([disabled])') ?? heading.current)?.focus()
  }, [record.pageIndex])

  const [celebrating, setCelebrating] = useState(false)
  const [articleWarnings, setArticleWarnings] = useState<string[]>([])
  useEffect(() => setArticleWarnings([]), [record.pageIndex])

  const inlineFeedback = page.role === 'practice' && isSelfCheckingPage(page)
  const almostNotes =
    inlineFeedback && record.phase === 'feedback'
      ? page.units.filter((u) => record.locked[u.id]?.outcome === 'orthography_only')
      : []

  const onContinue = () => {
    if (page.role === 'exam') {
      // First press: point out translations that lack their article. Second press: submit anyway.
      const missing = page.units
        .filter(
          (u) =>
            u.itemType === 'vocabulary_translation_exam' &&
            isMissingArticle((record.drafts[u.id] as string) ?? '', u.answer, plan.lang),
        )
        .map((u) => u.id)
      if (missing.length && !articleWarnings.length) return setArticleWarnings(missing)
      setArticleWarnings([])
    }
    const allCorrect =
      record.phase === 'answering' &&
      isSelfCheckingPage(page) &&
      page.units.every((u) => scoreUnit(u, record.drafts[u.id]).outcome === 'fully_correct')
    if (!allCorrect) return dispatch({ type: 'continue' })
    // Celebrate briefly before moving on (longer for matching boards, which re-arrange).
    setCelebrating(true)
    const delay = page.items.some((i) => i.type === 'vocabulary_matching' || i.type === 'grammar_person_matching')
      ? ARRANGE_MS + 1000
      : 900
    window.setTimeout(() => {
      setCelebrating(false)
      dispatch({ type: 'continue' })
    }, delay)
  }

  const examLabel = t('session.examPage')
  return (
    <>
      <SessionHeader plan={plan} record={record} />
      {waitingForVoice && voiceStatus === 'checking' ? (
        <section className="task-card" role="status">
          <p>{t('session.voiceChecking')}</p>
        </section>
      ) : waitingForVoice && voiceStatus === 'unavailable' ? (
        <section className="task-card voice-help" aria-labelledby="voice-help-title">
          <h1 id="voice-help-title">{t('session.voiceHelpTitle')}</h1>
          <p>{t('session.voiceHelpIntro')}</p>
          <VoiceHelpSteps />
          <p>{t('session.voiceSkipHint')}</p>
          <button type="button" className="button button-primary" onClick={() => dispatch({ type: 'skip_no_voice' })}>
            {t('session.voiceSkip')}
          </button>
        </section>
      ) : (
        <section className={`task-card${celebrating ? ' is-celebrating' : ''}`} aria-labelledby="task-heading">
          {celebrating && (
            <span className="visually-hidden" role="status">
              {t('session.allCorrect')}
            </span>
          )}
          <p className="label-muted">
            {page.stepLabel[locale]}
            {page.role === 'exam' && page.stepLabel[locale] !== examLabel ? ` · ${examLabel}` : ''}
          </p>
          <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">
            {page.special === 'examIntro' ? t('examIntro.title') : pageHeading(page, locale, t)}
          </h1>
          {page.role === 'exam' && remainingMs !== undefined && <Countdown remainingMs={remainingMs} />}
          {page.special === 'examIntro' && <ExamIntro plan={plan} page={page} />}
          {page.items.map((item) => (
            <Exercise
              key={item.itemId}
              item={item}
              units={page.units.filter((u) => u.itemId === item.itemId)}
              plan={plan}
              mode={mode}
              drafts={record.drafts}
              locked={record.locked}
              onChange={(unitId, response) => dispatch({ type: 'draft', unitId, response })}
              seed={record.seed}
              motherTongue={record.motherTongue}
              pageId={page.pageId}
              revealed={record.revealed ?? {}}
              onReveal={(itemKey, key) => dispatch({ type: 'reveal', itemKey, key })}
              celebrating={celebrating}
              articleWarnings={articleWarnings}
              inlineFeedback={inlineFeedback}
            />
          ))}
          <div className="task-footer">
            {page.role === 'presentation' && !canContinue && <p className="muted">{t('session.revealAll')}</p>}
            <span className="continue-wrap">
              <button
                type="button"
                className="button button-primary"
                disabled={!canContinue}
                aria-disabled={celebrating || undefined}
                onClick={() => !celebrating && onContinue()}
              >
                {t(page.role === 'practice' && record.phase === 'answering' ? 'session.check' : 'session.continue')}
              </button>
            </span>
            {almostNotes.map((unit) => (
              <div key={unit.id} className="feedback outcome-orthography_only footer-note" role="status">
                <p className="feedback-title">
                  <span aria-hidden="true">!</span> {t('feedback.almost')}
                </p>
                <p className="explanation">{unit.explanation[locale]}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
