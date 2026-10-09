import { useEffect, useRef, type CSSProperties } from 'react'
import { roundScore } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { useLastTry } from '../../lib/lastTry'
import type { Plan, PlanPage, Unit } from '../../lib/lesson/plan'
import { reviewColor } from '../../lib/reviewColor'
import { lessonScore } from '../../lib/session/scoring'
import type { SessionAction, SessionRecord } from '../../lib/session/types'
import { resultPrompt, ResultItem } from './ResultItem'

/** Vocabulary target of a unit (via the item, or the unit id suffix). */
function targetOfUnit(page: PlanPage, unit: Unit) {
  const item = page.items.find((i) => i.itemId === unit.itemId)
  if (item && 'targetId' in item) return item.targetId
  const prefix = `${page.pageId}/${unit.itemId}/`
  return unit.id.startsWith(prefix) ? unit.id.slice(prefix.length) : undefined
}

type Section = { key: string; groupId?: string; part: number; units: Unit[] }

/** Groups answers by word group (vocabulary), by page (multi-unit pages) or in runs of single answers. */
function sectionsOf(plan: Plan, pages: PlanPage[]) {
  const groupOf = new Map(plan.groups.flatMap((g) => g.targetIds.map((id) => [id, g])))
  const sections: Section[] = []
  pages.forEach((page, index) => {
    for (const unit of page.units) {
      const targetId = targetOfUnit(page, unit)
      const group = targetId ? groupOf.get(targetId) : undefined
      const key = group ? `group|${group.id}` : page.units.length > 1 ? `page|${page.pageId}` : 'single'
      const existing = group ? sections.find((s) => s.key === key) : sections.at(-1)?.key === key ? sections.at(-1) : undefined
      if (existing) existing.units.push(unit)
      else sections.push({ key, groupId: group?.id, part: index + 1, units: [unit] })
    }
  })
  return sections
}

const isDictationPage = (page: PlanPage) =>
  page.units.length > 0 && page.units.every((u) => u.itemType === 'vocabulary_listening_dictation')

/** Results after the lesson: score, then the answers of the exam or of a chosen practice step. */
export function Results({ plan, record, dispatch }: { plan: Plan; record: SessionRecord; dispatch: (a: SessionAction) => void }) {
  const { t, locale, languageName } = useI18n()
  const score = lessonScore(plan, record)
  const { recordCompletion } = useLastTry()
  const recorded = useRef(false)
  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true
      recordCompletion(plan.lessonId, score.total)
    }
  }, [plan.lessonId, recordCompletion, score.total])

  const number = (n: number) => n.toLocaleString(locale)
  const step = record.selection === 'exam' ? undefined : plan.steps.find((s) => s.stepId === record.selection)
  const pages = plan.pages.filter(
    (p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && (step ? p.stepId === step.stepId : p.role === 'exam'),
  )
  const units = pages.flatMap((p) => p.units)
  const tally = step ? score.steps.find((s) => s.stepId === step.stepId)?.tally : score.exam
  const headline =
    step?.role === 'presentation' || !tally?.possible ? t('result.completedShort') : `${number(tally.earned)} / ${tally.possible}`
  const reviewableSteps = score.steps.filter(
    (s) => s.role !== 'exam' && s.role !== 'presentation' && s.tally.possible > 0 && plan.steps.some((p) => p.stepId === s.stepId),
  )
  const answered = units.filter((u) => record.locked[u.id])
  const correctIn = (list: Unit[]) => list.filter((u) => record.locked[u.id].outcome === 'fully_correct').length

  const renderSections = (sectionPages: PlanPage[]) => {
    const sections = sectionsOf(plan, sectionPages)
      .map((s) => ({ ...s, units: s.units.filter((u) => record.locked[u.id]) }))
      .filter((s) => s.units.length)
    const title = (s: Section) => plan.groups.find((g) => g.id === s.groupId)?.label[locale] ?? t('result.part', { n: s.part })
    return sections.map((section) => {
      const columns = Math.max(...section.units.map((u) => resultPrompt(u, t).length))
      return (
        <section
          key={section.key}
          className={`result-section${sections.length > 1 ? ' is-framed' : ''}`}
          style={section.groupId ? reviewColor(plan.groups.findIndex((g) => g.id === section.groupId)) : undefined}
        >
          {sections.length > 1 && (section.groupId || section.key !== 'single') && (
            <h3 className="result-section-title">{title(section)}</h3>
          )}
          <ul className={`result-list${columns ? '' : ' no-prompt'}`} style={{ '--parts': Math.max(1, columns) } as CSSProperties}>
            {section.units.map((unit) => (
              <ResultItem key={unit.id} unit={unit} locked={record.locked[unit.id]} lang={plan.lang} columns={columns} />
            ))}
          </ul>
        </section>
      )
    })
  }

  // The vocabulary exam has translation and dictation pages: show them in two accordions.
  const examParts =
    !step && pages.some(isDictationPage) && pages.some((p) => !isDictationPage(p))
      ? [
          { key: 'translation', label: t('result.translation'), pages: pages.filter((p) => !isDictationPage(p)) },
          { key: 'dictation', label: t('result.dictation'), pages: pages.filter(isDictationPage) },
        ]
      : undefined

  return (
    <section aria-labelledby="results-title">
      <div className="summary-card">
        <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level: record.level })}</p>
        <h1 id="results-title">{step ? step.label[locale] : t('session.examPage')}</h1>
        <p className="total-score">{headline}</p>
        <p className="results-lesson" lang={plan.lang}>
          {plan.title}
        </p>
        <p className="results-total">{t('result.lessonTotal', { score: roundScore(score.total).toLocaleString(locale) })}</p>
      </div>
      <h2 className="small-heading">{t('result.chooseReview')}</h2>
      <div className="result-menu" role="group" aria-label={t('result.chooseReview')}>
        <button
          type="button"
          className="button button-outline button-exam"
          aria-pressed={record.selection === 'exam'}
          onClick={() => dispatch({ type: 'select', selection: 'exam' })}
        >
          {t('session.examPage')}
        </button>
        {reviewableSteps.map((s) => (
          <button
            key={s.stepId}
            type="button"
            className="button button-outline"
            aria-pressed={record.selection === s.stepId}
            onClick={() => dispatch({ type: 'select', selection: s.stepId })}
          >
            {plan.steps.find((p) => p.stepId === s.stepId)!.label[locale]}
          </button>
        ))}
      </div>
      <h2 className="small-heading">{step ? step.label[locale] : t('result.examAnswers')}</h2>
      {answered.length ? (
        <>
          <p className="match-summary">
            <strong>{t('result.summary', { correct: correctIn(answered), total: answered.length })}</strong>
          </p>
          {examParts
            ? examParts.map((part, i) => {
                const partUnits = part.pages.flatMap((p) => p.units).filter((u) => record.locked[u.id])
                return (
                  <details key={part.key} className="result-accordion" open={i === 0}>
                    <summary>
                      <span>{part.label}</span>
                      <span className="muted">{t('result.summary', { correct: correctIn(partUnits), total: partUnits.length })}</span>
                    </summary>
                    {renderSections(part.pages)}
                  </details>
                )
              })
            : renderSections(pages)}
        </>
      ) : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
    </section>
  )
}
