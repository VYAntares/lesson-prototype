import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import type { Plan, PlanPage } from '../../lib/lesson/plan'
import { isMissingArticle } from '../../lib/session/answers'
import { advancesWhenRight, allCardsRevealed, isListeningPage, isSelfCheckingPage } from '../../lib/session/reducer'
import { isAnswered, scoreUnit } from '../../lib/session/scoring'
import type { SessionAction, SessionRecord } from '../../lib/session/types'
import type { VoiceStatus } from '../../lib/speech'
import type { Locale } from '../../schemas/common'
import { ExamIntro } from './ExamIntro'
import { Exercise } from './exercises/registry'
import { ARRANGE_MS } from './exercises/shared/MatchingFrame'
import { UnitFeedback } from './exercises/shared/UnitFeedback'
import { canOpen } from './outline'

function pageHeading(page: PlanPage, locale: Locale, t: (key: string) => string) {
  return page.items.length > 0 && page.items.every((i) => i.type === 'vocabulary_typed_gap')
    ? t('session.typedGapInstruction')
    : page.instructions[locale]
}

export type Review = {
  /** The finished page shown again, read-only, with its answers. */
  index: number
  onOpen: (index: number) => void
  onExit: () => void
  exitLabel: string
}

type Props = {
  plan: Plan
  record: SessionRecord
  dispatch: (action: SessionAction) => void
  voiceStatus?: VoiceStatus
  review?: Review
}

const noop = () => undefined

/** One page of the lesson: the current one, or a finished one opened again from the sidebar. */
export function TaskPage({ plan, record, dispatch, voiceStatus = 'available', review }: Props) {
  const { t, locale } = useI18n()
  const index = review?.index ?? record.pageIndex
  const page = plan.pages[index]
  const waitingForVoice = !review && isListeningPage(page) && record.phase === 'answering'

  const mode = review ? 'feedback' : page.role === 'exam' ? 'exam' : record.phase === 'feedback' ? 'feedback' : 'answering'
  const canContinue =
    page.role === 'presentation'
      ? allCardsRevealed(page, record)
      : page.role !== 'practice' || record.phase === 'feedback' || page.units.every((u) => isAnswered(u, record.drafts[u.id]))

  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ;(document.querySelector<HTMLElement>('.task-card input.text-input:not([readonly]):not([disabled])') ?? heading.current)?.focus()
  }, [index])

  const [celebrating, setCelebrating] = useState(false)
  const [articleWarnings, setArticleWarnings] = useState<string[]>([])
  useEffect(() => setArticleWarnings([]), [index])

  const inlineFeedback = page.role === 'practice' && isSelfCheckingPage(page)
  /** Pages checked inline (one answer per item) show their feedback in one panel; matching boards mark their pairs. */
  const feedbackPanel =
    inlineFeedback && !advancesWhenRight(page) && (review || record.phase === 'feedback') ? (
      <div className="feedback-panel">
        {page.units
          .filter((u) => record.locked[u.id] && u.kind !== 'order' && u.kind !== 'spot')
          .map((u) => (
            <UnitFeedback key={u.id} unit={u} locked={record.locked[u.id]} lang={plan.lang} />
          ))}
      </div>
    ) : null

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
      advancesWhenRight(page) &&
      page.units.every((u) => scoreUnit(u, record.drafts[u.id]).outcome === 'fully_correct')
    if (!allCorrect) return dispatch({ type: 'continue' })
    // Matching boards celebrate briefly before moving on.
    setCelebrating(true)
    window.setTimeout(() => {
      setCelebrating(false)
      dispatch({ type: 'continue' })
    }, ARRANGE_MS + 1000)
  }

  // Enter validates (team feedback), unless focus is on a control that handles Enter itself.
  const enter = useRef<() => void>(noop)
  useEffect(() => {
    enter.current = () => {
      if (review || waitingForVoice || celebrating || !canContinue) return
      onContinue()
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('button, a, textarea, select, summary, [role="button"]')) return
      e.preventDefault()
      enter.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (waitingForVoice && voiceStatus === 'checking')
    return (
      <section className="task-card" role="status">
        <p>{t('session.voiceChecking')}</p>
      </section>
    )
  if (waitingForVoice && voiceStatus === 'unavailable')
    return (
      <section className="task-card voice-skip" aria-labelledby="task-heading">
        <span className="voice-skip-icon" aria-hidden="true">
          <SpeakerOff />
        </span>
        <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">
          {t('voice.skippedTitle')}
        </h1>
        <p className="muted">{t('voice.skippedText')}</p>
        <div className="task-footer">
          <span className="footer-spacer" />
          <button type="button" className="button button-primary" onClick={() => dispatch({ type: 'skip_no_voice' })}>
            {t('session.continue')}
          </button>
        </div>
      </section>
    )

  const openable = plan.pages.map((p) => p.index).filter((i) => canOpen(plan, record, i))
  const position = openable.indexOf(index)
  const previous = openable[position - 1]
  const next = openable[position + 1]

  return (
    <section className={`task-card role-${page.role}${celebrating ? ' is-celebrating' : ''}`} aria-labelledby="task-heading">
      {celebrating && (
        <span className="visually-hidden" role="status">
          {t('session.allCorrect')}
        </span>
      )}
      {review && (
        <p className="review-banner" role="note">
          {t('player.reviewing')}
        </p>
      )}
      <p className="task-eyebrow">
        {page.role === 'exam' || page.special === 'examIntro' ? t('player.exam') : page.stepLabel[locale].replace(/\s+\d+$/, '')}
      </p>
      <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">
        {page.special === 'examIntro' ? t('examIntro.title') : pageHeading(page, locale, t)}
      </h1>
      {page.special === 'examIntro' && <ExamIntro plan={plan} page={page} />}
      <div className="task-body">
        {page.items.map((item) => (
          <Exercise
            key={item.itemId}
            item={item}
            units={page.units.filter((u) => u.itemId === item.itemId)}
            plan={plan}
            mode={mode}
            drafts={record.drafts}
            locked={record.locked}
            onChange={review ? noop : (unitId, response) => dispatch({ type: 'draft', unitId, response })}
            seed={record.seed}
            motherTongue={record.motherTongue}
            pageId={page.pageId}
            revealed={record.revealed ?? {}}
            onReveal={review ? noop : (itemKey, key) => dispatch({ type: 'reveal', itemKey, key })}
            celebrating={celebrating}
            articleWarnings={articleWarnings}
            inlineFeedback={inlineFeedback}
          />
        ))}
        {review && feedbackPanel}
      </div>
      <div className="task-footer">
        {review ? (
          <>
            <button
              type="button"
              className="button button-ghost"
              disabled={previous === undefined}
              onClick={() => previous !== undefined && review.onOpen(previous)}
            >
              ← {t('player.previous')}
            </button>
            <button
              type="button"
              className="button button-ghost"
              disabled={next === undefined}
              onClick={() => next !== undefined && review.onOpen(next)}
            >
              {t('player.next')} →
            </button>
            <span className="footer-spacer" />
            <button type="button" className="button button-primary" onClick={review.onExit}>
              {review.exitLabel}
            </button>
          </>
        ) : (
          <>
            {feedbackPanel}
            {page.role === 'presentation' && !canContinue && <p className="muted footer-hint">{t('session.revealAll')}</p>}
            <span className="footer-spacer" />
            <span className="continue-wrap">
              {canContinue && <kbd className="enter-hint">{t('player.pressEnter')} ↵</kbd>}
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
          </>
        )}
      </div>
    </section>
  )
}

function SpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </svg>
  )
}
