import { Fragment, useId, useRef, useState } from 'react'
import { RichText } from '../../components/text/RichText'
import { Lang } from '../../components/text/Lang'
import { previewLabels } from '../../i18n/previewLabels'
import { buildPlan, type TextLang, type Unit } from '../../lib/lesson/plan'
import { useLessonText } from '../../lib/lessonText'
import type { Brief } from '../../schemas/brief'
import { lessonSteps, type Lesson } from '../../schemas/lesson'
import { reviewColor } from '../../lib/reviewColor'
import { BriefSummary, ScoringNote } from './brief/BriefParts'

/** Page-by-page preview of a lesson with every answer, for reviewing content. */
export function ContentPreview({ content, brief }: { content: Lesson; brief: Brief }) {
  const text = useLessonText(content.lang)
  const labels = previewLabels[text.locale]
  const plan = buildPlan(content, brief, text.nativeLocale)
  const [selectedId, setSelectedId] = useState(plan.pages[0].pageId)
  const selected = plan.pages.find((p) => p.pageId === selectedId) ?? plan.pages[0]
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const steps = lessonSteps(content)

  const learning = (s: string) => <Lang lang={content.lang}>{s}</Lang>
  const showText = (s: string, lang: TextLang) => (lang === 'ui' && s.startsWith('gender.') ? text.t(s) : s)
  const langAttr = (lang: TextLang) =>
    lang === 'native' ? text.nativeLocale : lang === 'learning' ? content.lang : text.locale
  const acceptedAnswers = (unit: Unit) =>
    unit.kind === 'text'
      ? unit.accepted.answers.join(' / ')
      : unit.kind === 'order'
        ? unit.acceptedOrders.map((o) => o.map((tid) => unit.tokens.find((tk) => tk.id === tid)!.text).join(' ')).join(' / ')
        : unit.kind === 'spot'
          ? unit.correction.accepted.answers.join(' / ')
          : unit.correct
              .map((cid) => {
                const option = unit.options.find((o) => o.id === cid)!
                return showText(option.text, option.lang)
              })
              .join(' / ')

  return (
    <>
      <BriefSummary
        items={[
          text.t('brief.summary.minutes', { minutes: content.estimatedMinutes }),
          text.t('brief.summary.translation', { locale: text.languageName(text.nativeLocale) }),
          text.t('brief.summary.explanations', { locale: text.languageName(text.locale) }),
        ]}
      />
      <p>{text.ui(content.objective)}</p>
      <ScoringNote scoring={brief.scoring} />
      <nav className="content-outline" aria-label={labels.outline}>
        <h3>{labels.outline}</h3>
        <ol>
          {steps.map((step, i) => {
            const pages = plan.pages.filter((p) => p.stepId === step.id)
            return (
              <li key={step.id} style={reviewColor(i)}>
                <button
                  type="button"
                  aria-current={selected.stepId === step.id ? 'step' : undefined}
                  onClick={() => setSelectedId(pages[0].pageId)}
                >
                  <span>{text.ui(step.label)}</span>
                  <small>
                    {labels.page} {pages[0].index + 1}
                    {pages.length > 1 && `–${pages.at(-1)!.index + 1}`}
                  </small>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="content-page-navigation">
        <div className="content-tabs" role="tablist" aria-label={labels.pages}>
          {steps.map((step, i) => (
            <div key={step.id} className="content-tab-group" role="presentation" style={reviewColor(i)}>
              <div className="content-tab-group-title">
                {i + 1}. {text.ui(step.label)}
              </div>
              <div className="content-tab-buttons" role="presentation">
                {plan.pages
                  .filter((p) => p.stepId === step.id)
                  .map((page) => (
                    <button
                      key={page.pageId}
                      type="button"
                      role="tab"
                      id={`${id}-tab-${page.index}`}
                      aria-controls={`${id}-panel`}
                      aria-selected={selected.pageId === page.pageId}
                      tabIndex={selected.pageId === page.pageId ? 0 : -1}
                      ref={(el) => {
                        tabs.current[page.index] = el
                      }}
                      onClick={() => setSelectedId(page.pageId)}
                      onKeyDown={(e) => {
                        const count = plan.pages.length
                        const next =
                          e.key === 'ArrowRight'
                            ? (page.index + 1) % count
                            : e.key === 'ArrowLeft'
                              ? (page.index + count - 1) % count
                              : e.key === 'Home'
                                ? 0
                                : e.key === 'End'
                                  ? count - 1
                                  : undefined
                        if (next !== undefined) {
                          e.preventDefault()
                          setSelectedId(plan.pages[next].pageId)
                          tabs.current[next]?.focus()
                        }
                      }}
                    >
                      {labels.page} {page.index + 1}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected.index}`} tabIndex={0}>
        {steps.map(
          (step, i) =>
            step.id === selected.stepId && (
              <section key={step.id} className="brief-block content-selected-step" style={reviewColor(i)}>
                <h3>
                  {i + 1}. {text.ui(step.label)}
                </h3>
                {plan.pages
                  .filter((p) => p.pageId === selected.pageId)
                  .map((page) => (
                    <section key={page.pageId} className="content-page">
                      <h4>
                        {labels.page} {page.index + 1} <small className="muted">({page.pageId})</small>
                      </h4>
                      <p className="muted">
                        {text.duration(page.estimatedDurationS)} ·{' '}
                        {page.timeLimitS === null ? labels.noTimer : `${labels.timer}: ${text.duration(page.timeLimitS)}`} ·{' '}
                        {labels.units}: {page.units.length}
                      </p>
                      <p>{text.ui(page.instructions)}</p>
                      {page.items.map((item) => (
                        <article key={item.itemId} className="content-item">
                          <p className="muted">
                            {labels.type}: <code>{item.type}</code> · <code>{item.itemId}</code>
                          </p>
                          {'ruleIds' in item && (
                            <p>
                              {labels.rules}: {item.ruleIds.join(', ')}
                            </p>
                          )}
                          {item.type === 'grammar_explanation' && (
                            <>
                              <h5>{text.ui(item.heading)}</h5>
                              <RichText text={text.ui(item.text)} lang={content.lang} />
                              {item.formTable.length > 0 && (
                                <div className="table-wrap">
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>{labels.subject}</th>
                                        <th>{labels.form}</th>
                                        <th>{text.t('brief.col.example')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.formTable.map((row, r) => (
                                        <tr key={r}>
                                          <td>{learning(row.subject)}</td>
                                          <td>{learning(row.form)}</td>
                                          <td>{row.example && learning(row.example)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <ul>
                                {item.examples.map((example, e) => (
                                  <li key={e}>
                                    {learning(example.text)} —{' '}
                                    <span lang={text.nativeLocale}>{text.native(example.translation)}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {item.type === 'production_feedback_placeholder' && <p>{labels.placeholder}</p>}
                          {(item.type === 'grammar_gap_typing' || item.type === 'grammar_gap_choice') && item.hint && (
                            <p>{text.ui(item.hint)}</p>
                          )}
                          {item.type === 'vocabulary_introduction' && (
                            <RichText text={text.ui(item.text)} lang={content.lang} />
                          )}
                          {'targetIds' in item && (
                            <div className="table-wrap">
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>{item.type === 'vocabulary_flashcards' ? labels.front : text.t('brief.col.target')}</th>
                                    <th>
                                      {item.type === 'vocabulary_flashcards'
                                        ? labels.back
                                        : text.t('brief.col.translation', { locale: text.languageName(text.nativeLocale) })}
                                    </th>
                                    <th>{text.t('brief.col.gender')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.targetIds.map((tid) => {
                                    const target = plan.targets.get(tid)!
                                    return (
                                      <tr key={tid}>
                                        <td>
                                          {learning(target.teachingForm)}
                                          <br />
                                          <small>{target.pronunciation}</small>
                                        </td>
                                        <td lang={text.nativeLocale}>{text.native(target.translations)?.join(' / ')}</td>
                                        <td>{target.genders.map((g) => text.t(`gender.${g}`)).join(' / ')}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {item.type === 'vocabulary_typed_gap' && (
                            <p>
                              {labels.references}:{' '}
                              {item.referenceTargetIds.map((tid) => plan.targets.get(tid)!.term).join(' · ')}
                            </p>
                          )}
                          {page.units
                            .filter((u) => u.itemId === item.itemId)
                            .map((unit) => (
                              <div key={unit.id} className="content-answer">
                                <p>
                                  <code>{unit.id}</code> · {labels.units}: 1
                                </p>
                                <p>
                                  {unit.prompt.native && <span lang={text.nativeLocale}>{unit.prompt.native} </span>}
                                  {unit.prompt.learning && learning(unit.prompt.learning)}
                                  {unit.prompt.before !== undefined &&
                                    learning(`${unit.prompt.before} ___ ${unit.prompt.after ?? ''}`)}
                                </p>
                                {unit.speak && (
                                  <p>
                                    {text.t('brief.pronunciation', {
                                      value:
                                        ('targetId' in item && plan.targets.get(item.targetId)?.pronunciation) ||
                                        unit.speak,
                                    })}
                                  </p>
                                )}
                                {(unit.kind === 'choice' || unit.kind === 'order' || unit.kind === 'spot') && (
                                  <p>
                                    {labels.options}:{' '}
                                    {(unit.kind === 'choice' ? unit.options : unit.tokens).map((option, o) => (
                                      <Fragment key={option.id}>
                                        {o > 0 && ' · '}
                                        <span lang={langAttr(option.lang)}>{showText(option.text, option.lang)}</span>
                                      </Fragment>
                                    ))}
                                  </p>
                                )}
                                <p>
                                  <strong>{labels.answers}: </strong>
                                  <span lang={langAttr(unit.answerLang)}>{acceptedAnswers(unit)}</span>
                                  {unit.kind === 'choice' && unit.form && <> · {learning(unit.form)}</>}
                                </p>
                                {unit.kind === 'text' && unit.accepted.accentSensitive.length > 0 && (
                                  <p>
                                    {labels.accents}: {unit.accepted.accentSensitive.join(', ')}
                                  </p>
                                )}
                                {unit.kind === 'spot' && (
                                  <p>
                                    {labels.correction}: {unit.tokens.find((tk) => tk.id === unit.faultyTokenId)?.text} →{' '}
                                    {unit.correction.accepted.answers.join(' / ')} ({unit.correction.mode}){' '}
                                    {unit.correction.choices.join(' / ')}
                                  </p>
                                )}
                                <p>
                                  <strong>{labels.explanation}: </strong>
                                  {text.ui(unit.explanation)}
                                </p>
                              </div>
                            ))}
                        </article>
                      ))}
                    </section>
                  ))}
              </section>
            ),
        )}
      </div>
    </>
  )
}
