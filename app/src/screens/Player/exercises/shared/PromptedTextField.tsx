import { useI18n } from '../../../../lib/i18n'
import type { TextUnit } from '../../../../lib/lesson/plan'
import { isMissingArticle, startsWithArticle } from '../../../../lib/session/answers'
import type { ExerciseContext } from '../types'
import { isLocked, responseOf } from './answerState'
import { TextAnswer } from './TextAnswer'

/** Labelled text field: translation prompt (with article badge) or "type what you hear". */
export function PromptedTextField({ unit, props }: { unit: TextUnit; props: ExerciseContext }) {
  const { t } = useI18n()
  const lang = props.plan.lang
  const prompt = unit.prompt.native ?? unit.prompt.learning ?? ''
  const label = prompt || t('session.typeWhatYouHear')
  const locked = isLocked(props, unit)
  return (
    <>
      <label className="field">
        <span lang={unit.prompt.native ? undefined : lang}>
          {label}
          {unit.itemType === 'vocabulary_translation_exam' && (
            <small
              className={`article-badge${
                !locked && isMissingArticle(responseOf<string>(props, unit) ?? '', unit.answer, lang) ? ' is-alert' : ''
              }`}
            >
              {t(startsWithArticle(unit.answer, lang) ? 'session.withArticle' : 'session.withoutArticle')}
            </small>
          )}
        </span>
        <TextAnswer unit={unit} props={props} label={label} />
      </label>
      {props.articleWarnings?.includes(unit.id) && !locked && (
        <p className="info-box" role="status">
          {t(/^(un|une|des)\s/iu.test(unit.answer) ? 'session.typeArticle' : 'session.typeDefiniteArticle')}
        </p>
      )}
    </>
  )
}
