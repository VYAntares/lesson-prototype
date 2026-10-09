import { Lang } from '../../../components/text/Lang'
import { useLessonText } from '../../../lib/lessonText'
import type { GrammarBrief } from '../../../schemas/brief'
import { BriefBlock, BriefList, BriefSummary, ColorTabs, ScoringNote } from './BriefParts'

/** Structured view of a grammar brief (lesson plan). */
export function GrammarBriefView({ data }: { data: GrammarBrief }) {
  const text = useLessonText(data.lang)
  const { t, ui, native, duration } = text
  const ruleNumber = new Map(data.rules.map((r, i) => [r.id, i + 1]))
  const ruleList = (ids: string[]) => ids.map((id) => t('brief.rule', { number: ruleNumber.get(id) ?? id })).join(', ')

  return (
    <div className="brief">
      <BriefSummary
        items={[
          t('brief.summary.blocks', { count: data.blocks.length }),
          t('brief.summary.minutes', { minutes: data.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(data.objective)}</p>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={t('brief.scope')}>
          <p>{ui(data.scopeBoundaries)}</p>
        </BriefBlock>
        <BriefBlock title={t('brief.prerequisites')}>
          <BriefList items={data.prerequisites.map(ui)} empty={t('brief.none')} />
        </BriefBlock>
      </div>
      <BriefBlock title={t('brief.rules')}>
        <ol className="brief-list rules">
          {data.rules.map((rule) => (
            <li key={rule.id}>{ui(rule.summary)}</li>
          ))}
        </ol>
      </BriefBlock>
      <BriefBlock title={t('brief.blocks')}>
        <ColorTabs
          label={t('brief.blocks')}
          tabs={data.blocks.map((b) => ({ id: b.id, title: ui(b.title), meta: ruleList(b.ruleIds) }))}
        >
          {(index) => {
            const block = data.blocks[index]
            return (
              <article key={block.id} className="block-card" aria-labelledby={`block-${block.id}`}>
                <h4 id={`block-${block.id}`}>
                  <span className="step-number">{String(index + 1).padStart(2, '0')}</span> {ui(block.title)}
                </h4>
                <p className="muted">{ruleList(block.ruleIds)}</p>
                <h5>{t('brief.explanationPlan', { duration: duration(block.explanationDurationS) })}</h5>
                <p>{ui(block.explanationPlan)}</p>
                <h5>{t('brief.examples')}</h5>
                <ul className="brief-list examples">
                  {block.examples.map((example, i) => (
                    <li key={i}>
                      <Lang lang={data.lang}>
                        <strong>{example.text}</strong>
                      </Lang>{' '}
                      <span className="muted">– {native(example.translation)}</span>
                    </li>
                  ))}
                </ul>
                <h5>{t('brief.pitfalls')}</h5>
                <BriefList items={block.pitfalls.map(ui)} empty={t('brief.none')} />
                <h5>{t('brief.exercises')}</h5>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('brief.col.exercise')}</th>
                        <th scope="col">{t('brief.col.items')}</th>
                        <th scope="col">{t('brief.col.rules')}</th>
                        <th scope="col">{t('brief.col.duration')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.exercises.map((ex) => (
                        <tr key={ex.id}>
                          <th scope="row">{t(`exercise.${ex.type}`)}</th>
                          <td>{ex.itemCount}</td>
                          <td>{ruleList(ex.ruleIds)}</td>
                          <td>{duration(ex.estimatedDurationS)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )
          }}
        </ColorTabs>
        <p className="muted">
          {t('brief.feedbackPlaceholder', { duration: duration(data.feedbackPlaceholder.estimatedDurationS) })}
        </p>
      </BriefBlock>
      <BriefBlock title={t('brief.mixedExam')}>
        <p className="muted">{t('brief.examPlanNote')}</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.page')}</th>
                <th scope="col">{t('brief.col.task')}</th>
                <th scope="col">{t('brief.col.items')}</th>
                <th scope="col">{t('brief.col.rules')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.timeLimit')}</th>
              </tr>
            </thead>
            <tbody>
              {data.exam.pages.map((page, i) => (
                <tr key={page.pageId}>
                  <th scope="row">{i + 1}</th>
                  <td>{t(`exercise.${page.type}`)}</td>
                  <td>{page.itemCount}</td>
                  <td>{ruleList(page.ruleIds)}</td>
                  <td>{duration(page.estimatedDurationS)}</td>
                  <td>{duration(page.timeLimitS)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScoringNote scoring={data.scoring} />
      </BriefBlock>
    </div>
  )
}
