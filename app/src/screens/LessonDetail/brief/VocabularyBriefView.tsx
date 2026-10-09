import { Lang } from '../../../components/text/Lang'
import { useLessonText } from '../../../lib/lessonText'
import { compileVocabularyLesson, VOCABULARY_TIMING } from '../../../lib/vocabulary/compileLesson'
import type { VocabularyBrief } from '../../../schemas/brief'
import type { VocabularyPage } from '../../../schemas/lesson'
import { ContentPreview } from '../ContentPreview'
import { BriefBlock, BriefList, BriefSummary, ColorTabs, ScoringNote } from './BriefParts'
import { TargetTable } from './TargetTable'

const totalSeconds = (pages: VocabularyPage[]) => pages.reduce((sum, p) => sum + p.estimatedDurationS, 0)

/** Structured view of a vocabulary brief, with a preview of the generated lesson. */
export function VocabularyBriefView({ data }: { data: VocabularyBrief }) {
  const text = useLessonText(data.lang)
  const { t, ui, duration } = text
  const byId = new Map(data.targets.map((target) => [target.id, target]))
  const teachingForms = (ids: string[]) => ids.map((id) => byId.get(id)?.teachingForm ?? id).join(', ')
  const demanding = data.targets.filter((target) => target.difficulty === 'demanding').length
  const lesson = compileVocabularyLesson(data)
  const [intro, cards, matching, overview, practice, listening, exam] = lesson.steps
  const hasNouns = data.targets.some((target) => target.wordClass === 'noun')
  const stages = [
    { stage: 'introduction', activity: t('activity.introduction'), durationS: totalSeconds(intro.pages), scored: false },
    {
      stage: 'flashcards',
      activity: t('activity.flashcards', { count: data.targets.length }),
      durationS: totalSeconds(cards.pages),
      scored: false,
    },
    {
      stage: 'matching',
      activity: t('activity.matching', { size: VOCABULARY_TIMING.matchingGroupSize }),
      durationS: totalSeconds(matching.pages),
      scored: true,
    },
    {
      stage: 'genderOverview',
      activity: t(hasNouns ? 'activity.genderOverview' : 'activity.overview'),
      durationS: totalSeconds(overview.pages),
      scored: hasNouns,
    },
    {
      stage: 'typedGaps',
      activity: t('activity.typedGaps', { count: data.targets.length }),
      durationS: totalSeconds(practice.pages),
      scored: true,
    },
    {
      stage: 'listening',
      activity: t('activity.listening', { count: data.targets.length }),
      durationS: totalSeconds(listening.pages),
      scored: true,
    },
  ]
  const examKind = (page: VocabularyPage) =>
    page.items[0]?.type === 'vocabulary_listening_dictation' ? 'listening_dictation' : 'translation'
  const examItems = exam.pages.reduce((sum, p) => sum + p.items.length, 0)

  return (
    <div className="brief">
      <BriefSummary
        items={[
          t('brief.summary.targets', { count: data.targetCount }),
          t('brief.summary.minutes', { minutes: data.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(data.objective)}</p>
        <p>{ui(data.coverageNotes)}</p>
      </BriefBlock>
      <BriefBlock title={t('brief.prerequisites')}>
        <BriefList items={data.prerequisites.map(ui)} empty={t('brief.none')} />
      </BriefBlock>
      <BriefBlock title={t('brief.targets')}>
        <ColorTabs
          label={t('brief.targets')}
          tabs={data.groups.map((g) => ({
            id: g.id,
            title: ui(g.label),
            meta: t('brief.summary.targets', { count: g.targetIds.length }),
          }))}
        >
          {(index) => {
            const group = data.groups[index]
            return (
              <TargetTable
                caption={t('brief.group', { label: ui(group.label), count: group.targetIds.length })}
                targets={group.targetIds.flatMap((id) => byId.get(id) ?? [])}
                lang={data.lang}
                text={text}
              />
            )
          }}
        </ColorTabs>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={t('brief.countRationale')}>
          <p>{ui(data.countRationale)}</p>
        </BriefBlock>
        <BriefBlock title={t('brief.difficultyBalance')}>
          <p className="muted">
            {t('brief.difficultyCounts', { core: data.targets.length - demanding, demanding })}
          </p>
          <p>{ui(data.difficultyBalance)}</p>
        </BriefBlock>
      </div>
      <BriefBlock title={t('brief.plan')}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.stage')}</th>
                <th scope="col">{t('brief.col.activity')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.assessment')}</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.stage}>
                  <th scope="row">
                    <span className="step-number">{String(i + 1).padStart(2, '0')}</span> {t(`stage.${s.stage}`)}
                  </th>
                  <td>{s.activity}</td>
                  <td>{duration(s.durationS)}</td>
                  <td>{t(s.scored ? 'assessment.practice' : 'assessment.none')}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <span className="step-number">{String(stages.length + 1).padStart(2, '0')}</span> {t('stage.exam')}
                </th>
                <td>{t('activity.exam', { count: examItems, pages: exam.pages.length })}</td>
                <td>{duration(totalSeconds(exam.pages))}</td>
                <td>{t('assessment.exam')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BriefBlock>
      <BriefBlock title={t('brief.examPlan')}>
        <p className="muted">{t('brief.examPlanNote')}</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.page')}</th>
                <th scope="col">{t('brief.col.task')}</th>
                <th scope="col">{t('brief.col.covers')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.timeLimit')}</th>
              </tr>
            </thead>
            <tbody>
              {exam.pages.map((page, i) => (
                <tr key={page.pageId}>
                  <th scope="row">{i + 1}</th>
                  <td>{t(`examKind.${examKind(page)}`)}</td>
                  <td>
                    <Lang lang={data.lang}>
                      {teachingForms(page.items.flatMap((item) => ('targetId' in item ? [item.targetId] : [])))}
                    </Lang>
                  </td>
                  <td>{duration(page.estimatedDurationS)}</td>
                  <td>{duration(page.timeLimitS ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScoringNote scoring={data.scoring} />
      </BriefBlock>
      <BriefBlock title={t('brief.lessonPreview')}>
        <ContentPreview content={lesson} brief={data} />
      </BriefBlock>
    </div>
  )
}
