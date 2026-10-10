// Business checks of format v3, beyond what zod can say. Run by `npm test` on every shipped file
// and by the generator, which sends the errors back to the LLM to fix.

import type { z } from 'zod'
import type { OutlineEntry } from '../schemas/outline'
import { blockSignature, learningForms, parseRichText } from '../lib/richText'
import { explainsInMotherTongue, LESSON_SECONDS, type Level, type Locale, type Localized } from './base'
import { BRIEF_LIMITS, briefSchema, THEORY_BY_KIND, type Brief, type LexEntry } from './brief'
import { contentSchema, type Content, type Theory } from './content'
import { contentSeconds, countWords, plannedSeconds } from './durations'
import { EXERCISE_INFO, interactionOf, type Exercise, type ExerciseType } from './exercises'
import { unknownWords, withLesson, type KnownWords } from './lexicon'
import { normalizeAnswer } from './normalize'

export type Severity = 'error' | 'warning'
export type Issue = { path: string; message: string; severity: Severity }

class Issues {
  list: Issue[] = []
  error(path: string, message: string) {
    this.list.push({ path, message, severity: 'error' })
  }
  warn(path: string, message: string) {
    this.list.push({ path, message, severity: 'warning' })
  }
  /** Records an error when `ok` is false; returns `ok`. */
  check(ok: boolean, path: string, message: string) {
    if (!ok) this.error(path, message)
    return ok
  }
  /** Reports values that are equal once normalised. */
  unique(values: string[], path: string, what: string, normalize = normalizeAnswer) {
    const seen = new Map<string, string>()
    for (const v of values) {
      const key = normalize(v)
      const first = seen.get(key)
      if (first !== undefined) this.error(path, `${what} listed twice: "${first}" and "${v}"`)
      else seen.set(key, v)
    }
  }
}

export type Checked<T> = { value?: T; issues: Issue[] }
export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === 'error')

function zodIssues(error: z.ZodError): Issue[] {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message, severity: 'error' as const }))
}

const LANGUAGES_WITH_GENDER: readonly Locale[] = ['fr', 'de']
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

// ---------- brief ----------

export type BriefContext = {
  entry: OutlineEntry
  lang: Locale
  level: Level
  /** Words known before this lesson (lexicon.knownBefore). Without it, no lexicon check. */
  known?: KnownWords
}

function checkLexEntry(e: LexEntry, path: string, lang: Locale, pointIds: Set<string>, issues: Issues) {
  issues.check(
    e.forms.some((f) => normalizeAnswer(f) === normalizeAnswer(e.term)),
    `${path}.forms`,
    `must include the term "${e.term}"`,
  )
  if (e.pos === 'noun' && LANGUAGES_WITH_GENDER.includes(lang))
    issues.check(e.gender !== null, `${path}.gender`, `"${e.term}" is a noun: give its gender`)
  if (e.pos !== 'noun') issues.check(e.gender === null, `${path}.gender`, 'only nouns have a gender')
  if (e.pos !== 'expression') issues.check(e.register === null, `${path}.register`, 'only expressions have a register')
  if (lang === 'fr' && e.pos === 'noun')
    issues.check(!/^(le|la|les|un|une|des) |^l'/iu.test(e.term), `${path}.term`, `"${e.term}" must be given without article`)
  if (e.pointId !== null) issues.check(pointIds.has(e.pointId), `${path}.pointId`, `unknown point ${e.pointId}`)
}

function typingShare(items: { type: ExerciseType; count: number }[]) {
  const all = items.reduce((n, i) => n + i.count, 0)
  const typing = items.filter((i) => interactionOf(i.type) === 'typing').reduce((n, i) => n + i.count, 0)
  return all ? typing / all : 0
}

const percent = (x: number) => `${Math.round(x * 100)}%`

export function checkBrief(brief: Brief, ctx: BriefContext): Issue[] {
  const issues = new Issues()
  const { entry } = ctx

  // Same lesson as the outline entry.
  issues.check(brief.id === entry.id, 'id', `must equal the outline id ${entry.id}`)
  issues.check(brief.kind === entry.kind, 'kind', `must equal the outline kind ${entry.kind}`)
  issues.check(brief.level === ctx.level, 'level', `must equal the course level ${ctx.level}`)
  issues.check(brief.topic === (entry.topic ?? null), 'topic', `must equal the outline topic (${entry.topic ?? 'null'})`)
  issues.check(brief.theme === (entry.theme ?? null), 'theme', `must equal the outline theme (${entry.theme ?? 'null'})`)
  if (brief.tooBig)
    issues.error('tooBig', 'the generator found this lesson too big for ten minutes: a human must decide (never split it)')

  // Points and words.
  const pointIds = new Set(brief.points.map((p) => p.id))
  issues.unique(brief.points.map((p) => p.id), 'points', 'point id', (s) => s)
  brief.introduces.forEach((e, i) => checkLexEntry(e, `introduces.${i}`, ctx.lang, pointIds, issues))
  brief.glossary.forEach((e, i) => {
    checkLexEntry(e, `glossary.${i}`, ctx.lang, pointIds, issues)
    issues.check(e.pointId === null, `glossary.${i}.pointId`, 'glossary words are not taught: pointId must be null')
  })
  issues.unique([...brief.introduces, ...brief.glossary].map((e) => e.term), 'introduces', 'word')
  brief.names.forEach((n, i) => issues.check(/^\p{Lu}/u.test(n), `names.${i}`, `"${n}" must start with a capital letter`))
  if (ctx.known)
    brief.introduces.forEach((e, i) => {
      if (ctx.known!.forms.has(normalizeAnswer(e.term)))
        issues.warn(`introduces.${i}`, `"${e.term}" is already known (base word or earlier lesson)`)
    })

  // What each kind needs.
  const taught = (pointId: string) => brief.introduces.filter((e) => e.pointId === pointId)
  if (brief.kind === 'vocabulary') {
    const { min, max } = BRIEF_LIMITS.vocabularyWords
    const words = brief.introduces.filter((e) => e.pointId !== null).length
    issues.check(words >= min && words <= max, 'introduces', `a vocabulary lesson teaches ${min} to ${max} words, not ${words}`)
    brief.points.forEach((p, i) =>
      issues.check(taught(p.id).length >= 2, `points.${i}`, `point ${p.id} must teach at least 2 words`),
    )
  }
  if (brief.kind === 'functions')
    brief.points.forEach((p, i) =>
      issues.check(
        taught(p.id).some((e) => e.pos === 'expression'),
        `points.${i}`,
        `point ${p.id} must teach at least one expression`,
      ),
    )
  issues.check(
    (brief.reading !== null) === (brief.kind === 'reading'),
    'reading',
    brief.kind === 'reading' ? 'a reading lesson describes its text' : 'only reading lessons have a text',
  )

  // Practice: per point, in point order, each opening with a click exercise.
  const order = brief.points.map((p) => p.id)
  let lastPoint = -1
  const opened = new Set<string>()
  brief.practice.forEach((item, i) => {
    const at = `practice.${i}`
    if (!issues.check(pointIds.has(item.pointId), `${at}.pointId`, `unknown point ${item.pointId}`)) return
    checkTypeAllowed(item.type, brief, `${at}.type`, issues)
    const index = order.indexOf(item.pointId)
    issues.check(index >= lastPoint, `${at}.pointId`, 'practice follows the order of the points')
    lastPoint = Math.max(lastPoint, index)
    if (!opened.has(item.pointId)) {
      opened.add(item.pointId)
      issues.check(
        interactionOf(item.type) === 'click',
        `${at}.type`,
        `point ${item.pointId} must open with a click exercise, not ${item.type}`,
      )
    }
  })
  for (const id of order) issues.check(opened.has(id), 'practice', `point ${id} is never practised`)

  // Quiz: covers every point.
  const quizzed = new Set<string>()
  brief.quiz.forEach((item, i) => {
    item.pointIds.forEach((id) => {
      issues.check(pointIds.has(id), `quiz.${i}.pointIds`, `unknown point ${id}`)
      quizzed.add(id)
    })
    checkTypeAllowed(item.type, brief, `quiz.${i}.type`, issues)
  })
  for (const id of order) issues.check(quizzed.has(id), 'quiz', `the quiz does not cover point ${id}`)
  const quizCount = brief.quiz.reduce((n, i) => n + i.count, 0)
  const { min: qMin, max: qMax } = BRIEF_LIMITS.quizExercises
  issues.check(quizCount >= qMin && quizCount <= qMax, 'quiz', `the quiz has ${qMin} to ${qMax} exercises, not ${quizCount}`)

  // Balance between clicking and typing.
  const practiceTyping = typingShare(brief.practice)
  issues.check(
    practiceTyping <= BRIEF_LIMITS.practiceTyping.max,
    'practice',
    `${percent(practiceTyping)} of practice is typing; at most ${percent(BRIEF_LIMITS.practiceTyping.max)}`,
  )
  const quizLimits = brief.kind === 'reading' ? BRIEF_LIMITS.readingQuizTyping : BRIEF_LIMITS.quizTyping
  const quizTyping = typingShare(brief.quiz)
  issues.check(
    quizTyping >= quizLimits.min && quizTyping <= quizLimits.max,
    'quiz',
    `${percent(quizTyping)} of the quiz is typing; between ${percent(quizLimits.min)} and ${percent(quizLimits.max)}`,
  )

  // Gender exercises need gendered nouns.
  const gendered = brief.introduces.filter((e) => e.gender !== null).length
  const genderItems = [...brief.practice, ...brief.quiz].filter((i) => i.type === 'gender').reduce((n, i) => n + i.count, 0)
  if (genderItems) issues.check(gendered >= 3, 'introduces', `gender exercises need at least 3 nouns with a gender, not ${gendered}`)

  // Ten minutes.
  const time = plannedSeconds(brief)
  issues.check(
    time.total <= LESSON_SECONDS,
    'practice',
    `the plan lasts ${time.total}s (theory ${time.theory}, reading ${time.reading}, practice ${time.practice}, quiz ${time.quiz}); at most ${LESSON_SECONDS}s: plan fewer exercises`,
  )

  return issues.list
}

function checkTypeAllowed(type: ExerciseType, brief: Brief, path: string, issues: Issues) {
  issues.check(EXERCISE_INFO[type].kinds.includes(brief.kind), path, `${type} is not used in ${brief.kind} lessons`)
}

export function validateBrief(data: unknown, ctx: BriefContext): Checked<Brief> {
  const parsed = briefSchema(ctx.lang, ctx.level).safeParse(data)
  if (!parsed.success) return { issues: zodIssues(parsed.error) }
  return { value: parsed.data, issues: checkBrief(parsed.data, ctx) }
}

// ---------- content ----------

export type ContentContext = {
  brief: Brief
  /** Words known before this lesson. Without it, no lexicon check. */
  known?: KnownWords
}

/** Course-language texts of an exercise, with their path, for the lexicon check. */
function courseTexts(ex: Exercise): string[] {
  const choices = 'choices' in ex && ex.choices ? ex.choices.map((c) => (typeof c === 'string' ? c : c.text)) : []
  switch (ex.type) {
    case 'gap_choice':
      return [ex.before, ex.after, ...choices]
    case 'question_choice':
      return [ex.question, ...choices]
    case 'situation_choice':
      return choices
    case 'listen_choice':
      return [ex.audio, ...choices]
    case 'pick_reply':
      return [ex.line.text, ...choices]
    case 'true_false':
      return [ex.statement]
    case 'match_meaning':
      return ex.pairs.map((p) => p.term)
    case 'match_forms':
      return ex.pairs.flatMap((p) => [p.left, p.right])
    case 'gender':
      return [ex.term]
    case 'order_words':
      return ex.tokens
    case 'order_dialogue':
      return ex.lines.map((l) => l.text)
    case 'gap_typing':
      return [ex.before, ex.after, ...ex.accepted]
    case 'translate':
      return ex.accepted
    case 'short_answer':
      return [ex.question, ...ex.accepted]
    case 'conjugation_pick':
      return [ex.verb, ...ex.rows.flatMap((r) => [r.subject, ...r.accepted]), ...choices]
    case 'conjugation_typing':
      return [ex.verb, ...ex.rows.flatMap((r) => [r.subject, ...r.accepted])]
  }
}

/** What the learner is asked, to spot a quiz exercise that repeats a practice one. */
function promptKey(ex: Exercise): string {
  switch (ex.type) {
    case 'gap_choice':
    case 'gap_typing':
      return `${ex.before}|${ex.after}`
    case 'question_choice':
    case 'short_answer':
      return ex.question
    case 'situation_choice':
      return Object.values(ex.situation).join('|')
    case 'listen_choice':
      return ex.audio
    case 'pick_reply':
      return ex.line.text
    case 'true_false':
      return ex.statement
    case 'translate':
      return Object.values(ex.source).join('|')
    case 'gender':
      return ex.term
    case 'order_words':
      return ex.tokens.join(' ')
    default:
      return `${ex.type}:${ex.id}`
  }
}

function theoryTexts(card: Theory): string[] {
  switch (card.type) {
    case 'rule':
      return [
        ...card.examples.map((e) => e.text),
        ...(card.table?.rows.flat() ?? []),
        ...Object.values(card.text).flatMap((t) => (t ? learningForms(parseRichText(t).blocks) : [])),
      ]
    case 'words':
      return card.words.flatMap((w) => [w.display, w.example.text])
    case 'expressions':
      return [...card.expressions.flatMap((e) => [e.term, e.example.text]), ...card.dialogue.map((d) => d.text)]
  }
}

/** Restricted Markdown, with the same structure and course-language forms in every locale. */
function checkRichText(text: Localized, path: string, issues: Issues) {
  const parsed = Object.entries(text).map(([locale, t]) => ({ locale, ...parseRichText(t ?? '') }))
  for (const p of parsed) for (const e of p.errors) issues.error(`${path}.${p.locale}`, `${e} (restricted Markdown)`)
  const [first, ...others] = parsed
  for (const p of others) {
    issues.check(
      blockSignature(p.blocks) === blockSignature(first.blocks),
      `${path}.${p.locale}`,
      `block structure differs from ${first.locale}`,
    )
    const a = learningForms(p.blocks).sort().join('|')
    const b = learningForms(first.blocks).sort().join('|')
    issues.check(a === b, `${path}.${p.locale}`, `course-language forms differ from ${first.locale}`)
  }
}

function checkExample(
  e: { text: string; highlight: string[]; translation: Localized | null },
  path: string,
  level: Level,
  issues: Issues,
) {
  if (explainsInMotherTongue(level))
    issues.check(e.translation !== null, `${path}.translation`, `examples are translated in ${level}`)
  for (const h of e.highlight)
    issues.check(e.text.includes(h), `${path}.highlight`, `"${h}" is not part of "${e.text}"`)
}

function checkTheory(card: Theory, path: string, brief: Brief, pointId: string, issues: Issues) {
  const level = brief.level
  switch (card.type) {
    case 'rule':
      checkRichText(card.text, `${path}.text`, issues)
      card.examples.forEach((e, i) => checkExample(e, `${path}.examples.${i}`, level, issues))
      if (card.table) {
        const width = card.table.header?.length ?? card.table.rows[0].length
        card.table.rows.forEach((r, i) =>
          issues.check(r.length === width, `${path}.table.rows.${i}`, `every row has ${width} cells`),
        )
      }
      break
    case 'words': {
      card.words.forEach((w, i) => checkExample(w.example, `${path}.words.${i}.example`, level, issues))
      const shown = card.words.map((w) => normalizeAnswer(w.term))
      const vocabulary = [...brief.introduces, ...brief.glossary].map((e) => normalizeAnswer(e.term))
      shown.forEach((t, i) =>
        issues.check(vocabulary.includes(t), `${path}.words.${i}.term`, `"${card.words[i].term}" is not a word of the brief`),
      )
      if (brief.kind === 'vocabulary')
        for (const e of brief.introduces.filter((e) => e.pointId === pointId))
          issues.check(shown.includes(normalizeAnswer(e.term)), `${path}.words`, `"${e.term}" is taught by this point but not shown`)
      break
    }
    case 'expressions': {
      card.expressions.forEach((e, i) => checkExample(e.example, `${path}.expressions.${i}.example`, level, issues))
      if (explainsInMotherTongue(level))
        card.dialogue.forEach((d, i) =>
          issues.check(d.translation !== null, `${path}.dialogue.${i}.translation`, `dialogues are translated in ${level}`),
        )
      const shown = card.expressions.map((e) => normalizeAnswer(e.term))
      for (const e of brief.introduces.filter((e) => e.pointId === pointId && e.pos === 'expression'))
        issues.check(shown.includes(normalizeAnswer(e.term)), `${path}.expressions`, `"${e.term}" is taught by this point but not shown`)
      break
    }
  }
}

function checkExercise(ex: Exercise, path: string, content: Content, brief: Brief, issues: Issues) {
  if ('choices' in ex && ex.choices && typeof ex.choices[0] === 'object') {
    const choices = ex.choices as { text: string; correct: boolean }[]
    issues.check(choices.some((c) => c.correct), `${path}.choices`, 'at least one choice is correct')
    issues.check(choices.some((c) => !c.correct), `${path}.choices`, 'at least one choice is wrong')
    issues.unique(choices.map((c) => c.text), `${path}.choices`, 'choice')
  }
  if ('accepted' in ex) issues.unique(ex.accepted, `${path}.accepted`, 'accepted answer')
  switch (ex.type) {
    case 'gap_choice':
    case 'gap_typing': {
      const context = countWords(`${ex.before} ${ex.after}`)
      issues.check(context >= 3, path, `the sentence around the gap needs at least 3 words, not ${context}`)
      issues.check(!/_{2,}/.test(`${ex.before}${ex.after}`), path, 'the gap is between before and after, never written as ___')
      break
    }
    case 'order_words': {
      const n = ex.tokens.length
      ex.acceptedOrders.forEach((order, i) =>
        issues.check(
          order.length === n && new Set(order).size === n && order.every((k) => k < n),
          `${path}.acceptedOrders.${i}`,
          `must use each of the ${n} tokens exactly once`,
        ),
      )
      issues.unique(ex.acceptedOrders.map((o) => o.join(',')), `${path}.acceptedOrders`, 'order', (s) => s)
      break
    }
    case 'match_meaning':
      issues.unique(ex.pairs.map((p) => p.term), `${path}.pairs`, 'term')
      for (const locale of Object.keys(ex.pairs[0].meaning))
        issues.unique(ex.pairs.map((p) => (p.meaning as Record<string, string>)[locale]), `${path}.pairs`, `${locale} meaning`)
      break
    case 'match_forms':
      issues.unique(ex.pairs.map((p) => p.left), `${path}.pairs`, 'left side')
      issues.unique(ex.pairs.map((p) => p.right), `${path}.pairs`, 'right side')
      break
    case 'gender': {
      const noun = brief.introduces.find((e) => normalizeAnswer(e.term) === normalizeAnswer(ex.term))
      if (issues.check(noun?.pos === 'noun' && noun.gender !== null, `${path}.term`, `"${ex.term}" is not a noun with a gender taught by this lesson`))
        issues.check(noun!.gender === ex.gender, `${path}.gender`, `"${ex.term}" is ${noun!.gender} in the brief`)
      break
    }
    case 'true_false': {
      issues.check(
        (ex.evidence === null) === (ex.answer === 'not_said'),
        `${path}.evidence`,
        'quote the text for true or false, and only then',
      )
      const text = content.reading ? content.reading.paragraphs.join(' ').replace(/\s+/g, ' ') : ''
      if (ex.evidence)
        issues.check(text.includes(ex.evidence.replace(/\s+/g, ' ')), `${path}.evidence`, 'must be an exact quote of the text')
      break
    }
    case 'conjugation_pick':
      issues.unique(ex.rows.map((r) => r.subject), `${path}.rows`, 'subject')
      ex.rows.forEach((r, i) =>
        issues.check(
          r.accepted.some((a) => ex.choices.some((c) => normalizeAnswer(c) === normalizeAnswer(a))),
          `${path}.rows.${i}`,
          'no choice is an accepted answer',
        ),
      )
      break
    case 'conjugation_typing':
      issues.unique(ex.rows.map((r) => r.subject), `${path}.rows`, 'subject')
      break
  }
}

export function checkContent(content: Content, ctx: ContentContext): Issue[] {
  const issues = new Issues()
  const { brief } = ctx

  issues.check(content.id === brief.id, 'id', `must equal the brief id ${brief.id}`)
  issues.check(content.kind === brief.kind, 'kind', `must equal the brief kind ${brief.kind}`)
  issues.check(content.level === brief.level, 'level', `must equal the brief level ${brief.level}`)

  // Reading text.
  issues.check(
    (content.reading !== null) === (brief.kind === 'reading'),
    'reading',
    brief.kind === 'reading' ? 'a reading lesson has a text' : 'only reading lessons have a text',
  )
  if (content.reading && brief.reading) {
    const words = countWords(content.reading.paragraphs.join(' '))
    const target = brief.reading.words
    issues.check(
      words >= target * 0.7 && words <= target * 1.3,
      'reading.paragraphs',
      `the text has ${words} words; the brief plans about ${target}`,
    )
  }

  // One section per point, in order, following the brief's plan.
  const points = brief.points.map((p) => p.id)
  const sectionPoints = content.sections.map((s) => s.pointId)
  if (!issues.check(sameList(sectionPoints, points), 'sections', `sections must follow the points of the brief: ${points.join(', ')}`))
    return issues.list

  content.sections.forEach((section, s) => {
    const at = `sections.${s}`
    const expectedTheory = THEORY_BY_KIND[brief.kind]
    if (section.theory) {
      issues.check(section.theory.type === expectedTheory, `${at}.theory.type`, `${brief.kind} lessons use ${expectedTheory} cards`)
      checkTheory(section.theory, `${at}.theory`, brief, section.pointId, issues)
    } else
      issues.check(
        brief.kind === 'reading' && s > 0,
        `${at}.theory`,
        'every section has a theory card (later reading sections excepted)',
      )

    const planned = brief.practice
      .filter((p) => p.pointId === section.pointId)
      .flatMap((p) => Array<ExerciseType>(p.count).fill(p.type))
    const types = section.practice.map((ex) => ex.type)
    issues.check(sameList(types, planned), `${at}.practice`, `the brief plans ${planned.join(', ')}; found ${types.join(', ')}`)

    section.practice.forEach((ex, i) => {
      const exAt = `${at}.practice.${i}`
      issues.check(ex.pointIds[0] === section.pointId, `${exAt}.pointIds`, `the first point is the section's own, ${section.pointId}`)
      for (const id of ex.pointIds)
        issues.check(points.indexOf(id) >= 0 && points.indexOf(id) <= s, `${exAt}.pointIds`, `${id} is not taught by this section or an earlier one`)
      issues.check(ex.hint !== null, `${exAt}.hint`, 'every practice exercise has a hint')
      checkExercise(ex, exAt, content, brief, issues)
    })
  })

  // Quiz: as planned, no hints, nothing copied from practice.
  const plannedQuiz = brief.quiz.flatMap((q) => Array<ExerciseType>(q.count).fill(q.type)).sort()
  const quizTypes = content.quiz.map((ex) => ex.type).sort()
  issues.check(sameList(quizTypes, plannedQuiz), 'quiz', `the brief plans ${plannedQuiz.join(', ')}; found ${quizTypes.join(', ')}`)
  const covered = new Set(content.quiz.flatMap((ex) => ex.pointIds))
  for (const id of points) issues.check(covered.has(id), 'quiz', `the quiz does not cover point ${id}`)
  const practised = new Set(content.sections.flatMap((s) => s.practice).map((ex) => normalizeAnswer(promptKey(ex))))
  content.quiz.forEach((ex, i) => {
    const at = `quiz.${i}`
    for (const id of ex.pointIds) issues.check(points.includes(id), `${at}.pointIds`, `unknown point ${id}`)
    issues.check(ex.hint === null, `${at}.hint`, 'quiz exercises have no hint')
    issues.check(!practised.has(normalizeAnswer(promptKey(ex))), at, 'repeats a practice exercise')
    checkExercise(ex, at, content, brief, issues)
  })

  // Ids.
  const all = [...content.sections.flatMap((s) => s.practice), ...content.quiz]
  issues.unique(all.map((ex) => ex.id), 'sections', 'exercise id', (s) => s)

  // Known words only.
  if (ctx.known) {
    const known = withLesson(ctx.known, brief)
    const texts: [string, string][] = []
    if (content.reading)
      [content.reading.title, ...content.reading.paragraphs].forEach((t, i) => texts.push([`reading.${i}`, t]))
    content.sections.forEach((s, i) => {
      if (s.theory) theoryTexts(s.theory).forEach((t) => texts.push([`sections.${i}.theory`, t]))
      s.practice.forEach((ex, j) => courseTexts(ex).forEach((t) => texts.push([`sections.${i}.practice.${j}`, t])))
    })
    content.quiz.forEach((ex, i) => courseTexts(ex).forEach((t) => texts.push([`quiz.${i}`, t])))
    const reported = new Set<string>()
    for (const [path, text] of texts)
      for (const word of unknownWords(text, known.forms)) {
        if (reported.has(word)) continue
        reported.add(word)
        const message = `"${word}" is not known: add it to introduces or glossary, or use a known word`
        if (known.complete) issues.error(path, message)
        else issues.warn(path, `${message} (earlier briefs missing: ${known.missing.length})`)
      }
  }

  // Ten minutes, added up.
  const time = contentSeconds(content)
  issues.check(
    time.total <= LESSON_SECONDS,
    'sections',
    `the lesson lasts ${time.total}s (theory ${time.theory}, reading ${time.reading}, practice ${time.practice}, quiz ${time.quiz}); at most ${LESSON_SECONDS}s`,
  )

  return issues.list
}

export function validateContent(data: unknown, ctx: ContentContext & { lang: Locale }): Checked<Content> {
  const parsed = contentSchema(ctx.lang, ctx.brief.level).safeParse(data)
  if (!parsed.success) return { issues: zodIssues(parsed.error) }
  return { value: parsed.data, issues: checkContent(parsed.data, ctx) }
}

