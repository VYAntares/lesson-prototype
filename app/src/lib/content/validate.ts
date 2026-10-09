// Checks that go beyond the Zod schemas: consistency between the outline entry,
// the brief and the lesson content, plus editorial rules. Mirrors the original checks
// and messages (the D-numbers refer to the authoring guidelines).

import type { z } from 'zod'
import {
  briefSchemaFor,
  isPlayableKind,
  needsContentFile,
  PERSON_EXERCISE_TYPES,
  PERSON_MATCHING_TOPICS,
  PERSONS,
  PRONOUN_FORM_EXCLUDED_LESSONS,
  PRONOUN_FORM_TOPICS,
  type Brief,
  type GrammarBrief,
  type VocabularyBrief,
} from '../../schemas/brief'
import { nativeLocalesFor, type LocalizedText } from '../../schemas/common'
import {
  lessonSchemaFor,
  lessonSteps,
  type GrammarItem,
  type GrammarLesson,
  type Lesson,
  type LessonPage,
} from '../../schemas/lesson'
import type { OutlineEntry } from '../../schemas/outline'
import { blockSignature, learningForms, parseRichText } from '../richText'
import { compileVocabularyLesson, matchingBoards } from '../vocabulary/compileLesson'

export type Issue = { path: string; message: string }

class Issues {
  list: Issue[] = []
  add(path: string, message: string) {
    this.list.push({ path, message })
  }
  /** Records an issue when `ok` is false; returns `ok`. */
  check(ok: boolean, path: string, message: string) {
    if (!ok) this.add(path, message)
    return ok
  }
  unique(values: string[], path: string, what: string) {
    const seen = new Set<string>()
    for (const v of values) {
      if (seen.has(v)) this.add(path, `duplicate ${what} ${v}`)
      seen.add(v)
    }
  }
}

function zodIssues(error: z.ZodError): Issue[] {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const sameMembers = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('\0') === [...b].sort().join('\0')
/** "written with é" style explanations must name the mark instead. */
const NAMES_ONLY_THE_CHARACTER = /\bwritten with (an? )?[àâäçéèêëîïôöûùüÿœæ](?![\p{L}])/iu

export type ValidationContext = {
  entry: OutlineEntry
  lang: string
  level: string
  /** From the manifest: hash of the outline entry the artifact should be based on. */
  outlineHash?: string
  /** From the manifest: hash of the brief the content should be based on. */
  briefHash?: string
}

export type ValidationResult<T> =
  | { status: 'invalid'; value?: T; issues: Issue[]; staleReasons: string[] }
  | { status: 'valid' | 'stale'; value: T; issues: Issue[]; staleReasons: string[] }

function checkHeader(a: Brief | Lesson, ctx: ValidationContext, issues: Issues) {
  issues.check(a.id === ctx.entry.id, 'id', `must equal the outline ID ${ctx.entry.id}`)
  issues.check(a.kind === ctx.entry.kind, 'kind', `must equal the outline kind ${ctx.entry.kind}`)
  issues.check(a.lang === ctx.lang, 'lang', `must equal the course language ${ctx.lang}`)
  issues.check(a.level === ctx.level, 'level', `must equal the course level ${ctx.level}`)
  if (a.kind === 'grammar')
    issues.check(a.topic === ctx.entry.topic, 'topic', `must equal the outline topic ${ctx.entry.topic}`)
  else issues.check(a.theme === ctx.entry.theme, 'theme', `must equal the outline theme ${ctx.entry.theme}`)
}

function checkMinutes(estimatedMinutes: number, totalSeconds: number, issues: Issues) {
  const expected = Math.max(1, Math.round(totalSeconds / 60))
  issues.check(
    estimatedMinutes === expected,
    'estimatedMinutes',
    `must equal the summed page estimates rounded to minutes (${expected})`,
  )
}

// ---------- vocabulary briefs ----------

const WITH_INDEFINITE_ARTICLE = /^(un|une|des) \S/u

function articleProblem(target: VocabularyBrief['targets'][number], form: string) {
  const article = /^(un|une|des) /u.exec(form)?.[1]
  if (!article)
    return `"${form}" must include the indefinite article un/une/des (D39) or the target must declare an articleException`
  const expected =
    target.number === 'plural' ? ['des'] : target.genders.map((g) => (g === 'feminine' ? 'une' : 'un'))
  if (!expected.includes(article))
    return `"${form}" uses "${article}" but a ${target.number} ${target.genders.join('/')} noun takes ${expected.join(' or ')}`
}

const ANY_ARTICLE = /^(un|une|des|le|la|les|l')(\s|$)|^l'/iu

function checkVocabularyBrief(brief: VocabularyBrief, ctx: ValidationContext, issues: Issues) {
  const ids = brief.targets.map((t) => t.id)
  const idSet = new Set(ids)
  issues.unique(ids, 'targets', 'target ID')
  issues.check(
    brief.targets.length === brief.targetCount,
    'targetCount',
    `is ${brief.targetCount} but ${brief.targets.length} targets are listed`,
  )
  issues.unique(
    brief.groups.map((g) => g.id),
    'groups',
    'group ID',
  )
  const grouped = brief.groups.flatMap((g) => g.targetIds)
  issues.check(
    sameMembers(grouped, ids) && grouped.length === ids.length,
    'groups',
    'every target must belong to exactly one group',
  )

  brief.targets.forEach((t, i) => {
    const at = `targets.${i}`
    if (t.wordClass === 'noun') {
      issues.check(t.genders.length > 0, `${at}.genders`, 'a noun needs at least one accepted gender')
      issues.check(t.number !== null, `${at}.number`, 'a noun needs a grammatical number')
      if (ctx.lang === 'fr' && t.articleException === null) {
        for (const form of t.examForms) {
          const problem = articleProblem(t, form)
          issues.check(!problem, `${at}.examForms`, problem ?? '')
        }
        const problem = articleProblem(t, t.teachingForm)
        issues.check(!problem, `${at}.teachingForm`, problem ?? '')
        for (const variant of t.genderVariants)
          issues.check(
            WITH_INDEFINITE_ARTICLE.test(variant),
            `${at}.genderVariants`,
            `"${variant}" must include the indefinite article un/une/des (D39)`,
          )
      }
      if (ctx.lang === 'fr' && t.articleException !== null)
        issues.check(
          !t.examForms.some((f) => WITH_INDEFINITE_ARTICLE.test(f)),
          `${at}.articleException`,
          'remove the articleException: the exam forms use an indefinite article',
        )
    } else {
      issues.check(t.genders.length === 0, `${at}.genders`, 'only nouns have a gender (D8)')
      issues.check(t.number === null, `${at}.number`, 'only nouns have a grammatical number here')
      issues.check(t.articleException === null, `${at}.articleException`, 'only nouns can have an article exception')
    }
    if (ctx.lang === 'fr' && t.wordClass === 'noun')
      issues.check(
        !/^(le|la|les|un|une|des) |^l'/iu.test(t.term),
        `${at}.term`,
        `"${t.term}" must be the base term without article`,
      )
    issues.check(
      t.examForms.includes(t.teachingForm) || t.teachingForm === t.examForms.join(', '),
      `${at}.teachingForm`,
      `"${t.teachingForm}" must be one of the exam forms (D39)`,
    )
    const examWords = new Set(t.examForms.flatMap((f) => f.toLowerCase().split(/\s+/)))
    for (const word of t.accentSensitive)
      issues.check(
        examWords.has(word.toLowerCase()),
        `${at}.accentSensitive`,
        `"${word}" is not a word of the exam forms`,
      )
  })

  const known = (id: string, path: string) => issues.check(idSet.has(id), path, `unknown target ${id}`)
  brief.targets.forEach((t, i) => {
    const at = `targets.${i}`
    issues.check(
      (t.genderExplanation !== null) === (t.wordClass === 'noun'),
      `${at}.genderExplanation`,
      t.wordClass === 'noun' ? 'required for a noun' : 'only nouns have a gender explanation',
    )
    const refs = t.gap.referenceTargetIds
    issues.check(
      new Set(refs).size === 4 && refs.includes(t.id),
      `${at}.gap.referenceTargetIds`,
      'four distinct reference targets including the word',
    )
    refs.forEach((id) => known(id, `${at}.gap.referenceTargetIds`))
    if (ctx.lang === 'fr')
      for (const answer of t.gap.accepted.answers)
        issues.check(
          (answer === 'un' && t.wordClass === 'numeral') || !ANY_ARTICLE.test(answer),
          `${at}.gap.accepted`,
          `typed-gap answer "${answer}" must be article-free`,
        )
    const otherTerms = refs
      .filter((id) => id !== t.id)
      .map((id) => brief.targets.find((x) => x.id === id)?.term.toLowerCase())
    issues.check(
      !t.gap.accepted.answers.some((a) => otherTerms.includes(a.toLowerCase())),
      `${at}.gap`,
      'exactly one reference choice may fit the gap',
    )
    const options = t.listeningOptionTargetIds
    issues.check(
      new Set(options).size === 4 && options.includes(t.id),
      `${at}.listeningOptionTargetIds`,
      'four distinct options including the word',
    )
    options.forEach((id) => known(id, `${at}.listeningOptionTargetIds`))
    for (const [field, text] of [
      ['explanation', t.explanation],
      ['gap.explanation', t.gap.explanation],
      ['genderExplanation', t.genderExplanation],
    ] as const)
      if (text && NAMES_ONLY_THE_CHARACTER.test(text.en))
        issues.add(
          `${at}.${field}`,
          `explanation "${text.en}" must name the mark (accent aigu, cédille, umlaut…), not only the character`,
        )
    if (t.genderVariants.length && t.examPrompt)
      issues.check(
        nativeLocalesFor(ctx.lang).every((l) => t.examPrompt![l] !== t.translations[l]?.[0]),
        `${at}.examPrompt`,
        'must disambiguate gender/number in every mother tongue, or be null so every gender variant is accepted',
      )
  })
  brief.groups.forEach((g, i) => checkRichText(g.introduction, `groups.${i}.introduction`, issues))
  matchingBoards(brief).forEach((board, i) => {
    const targets = board.map((id) => brief.targets.find((t) => t.id === id)).filter((t) => t !== undefined)
    for (const locale of nativeLocalesFor(ctx.lang))
      issues.unique(
        targets.map((t) => t.matchingLabel?.[locale] ?? t.translations[locale]?.[0] ?? ''),
        `matching.${i + 1}`,
        `${locale} matching label (set matchingLabel)`,
      )
  })
  if (!issues.list.length)
    checkMinutes(
      brief.estimatedMinutes,
      compileVocabularyLesson(brief)
        .steps.flatMap((s) => s.pages)
        .reduce((total, p) => total + p.estimatedDurationS, 0),
      issues,
    )
}

// ---------- grammar briefs ----------

function checkExerciseSuitsTopic(brief: GrammarBrief, type: string, path: string, issues: Issues) {
  if ((PERSON_EXERCISE_TYPES as readonly string[]).includes(type))
    issues.check(
      (PERSON_MATCHING_TOPICS as readonly string[]).includes(brief.topic),
      path,
      `${type} suits only ${PERSON_MATCHING_TOPICS.join(', ')} topics, not ${brief.topic}; use gaps or word order`,
    )
}

function checkGrammarBrief(brief: GrammarBrief, issues: Issues) {
  const ruleIds = new Set(brief.rules.map((r) => r.id))
  issues.unique(
    brief.rules.map((r) => r.id),
    'rules',
    'rule ID',
  )
  issues.unique(
    brief.blocks.map((b) => b.id),
    'blocks',
    'block ID',
  )
  issues.unique(
    brief.blocks.flatMap((b) => b.exercises.map((e) => e.id)),
    'blocks',
    'exercise ID',
  )
  issues.unique(
    brief.exam.pages.map((p) => p.pageId),
    'exam.pages',
    'page ID',
  )
  const taught = new Set<string>()
  brief.blocks.forEach((block, b) => {
    for (const id of block.ruleIds) {
      issues.check(ruleIds.has(id), `blocks.${b}.ruleIds`, `unknown rule ${id}`)
      taught.add(id)
    }
    block.exercises.forEach((ex, e) => {
      const isPersonMatching = ex.type === 'grammar_person_matching'
      // Person matching may also practise rules from earlier blocks.
      const allowed = (id: string) => block.ruleIds.includes(id) || (isPersonMatching && taught.has(id))
      for (const id of ex.ruleIds)
        issues.check(
          allowed(id),
          `blocks.${b}.exercises.${e}.ruleIds`,
          `rule ${id} is not taught in this block${isPersonMatching ? ' or an earlier one' : ''}`,
        )
      checkExerciseSuitsTopic(brief, ex.type, `blocks.${b}.exercises.${e}.type`, issues)
    })
  })
  for (const id of ruleIds) issues.check(taught.has(id), 'blocks', `rule ${id} is never taught`)
  if (
    (PRONOUN_FORM_TOPICS as readonly string[]).includes(brief.topic) &&
    !(PRONOUN_FORM_EXCLUDED_LESSONS as readonly string[]).includes(brief.id)
  )
    issues.check(
      brief.blocks.some((b) => b.exercises.some((e) => e.type === 'grammar_person_matching')),
      'blocks',
      `${brief.topic} lessons include a grammar_person_matching exercise`,
    )
  issues.unique(
    brief.newVerbs.map((v) => v.infinitive),
    'newVerbs',
    'infinitive',
  )
  const examined = new Set(brief.exam.pages.flatMap((p) => p.ruleIds))
  brief.exam.pages.forEach((page, p) => {
    for (const id of page.ruleIds) issues.check(ruleIds.has(id), `exam.pages.${p}.ruleIds`, `unknown rule ${id}`)
    checkExerciseSuitsTopic(brief, page.type, `exam.pages.${p}.type`, issues)
  })
  for (const id of ruleIds) issues.check(examined.has(id), 'exam.pages', `the exam does not cover rule ${id}`)
  checkMinutes(
    brief.estimatedMinutes,
    sum(brief.blocks.map((b) => b.explanationDurationS + sum(b.exercises.map((e) => e.estimatedDurationS)))) +
      brief.feedbackPlaceholder.estimatedDurationS +
      sum(brief.exam.pages.map((p) => p.estimatedDurationS)),
    issues,
  )
}

function result<T>(value: T, issues: Issues, staleReasons: string[]): ValidationResult<T> {
  return issues.list.length
    ? { status: 'invalid', value, issues: issues.list, staleReasons }
    : { status: staleReasons.length ? 'stale' : 'valid', value, issues: [], staleReasons }
}

export function validateBrief(data: unknown, ctx: ValidationContext): ValidationResult<Brief> {
  if (!isPlayableKind(ctx.entry.kind))
    return {
      status: 'invalid',
      issues: [{ path: 'kind', message: `${ctx.entry.kind} lessons have no agreed brief schema yet` }],
      staleReasons: [],
    }
  const parsed = briefSchemaFor(ctx.entry.kind, ctx.lang).safeParse(data)
  if (!parsed.success) return { status: 'invalid', issues: zodIssues(parsed.error), staleReasons: [] }
  const brief = parsed.data as Brief
  const issues = new Issues()
  checkHeader(brief, ctx, issues)
  if (brief.kind === 'vocabulary') checkVocabularyBrief(brief, ctx, issues)
  else checkGrammarBrief(brief, issues)
  return result(
    brief,
    issues,
    ctx.outlineHash && brief.provenance.inputHashes.outline !== ctx.outlineHash
      ? ['the outline entry changed after this brief was generated']
      : [],
  )
}

// ---------- grammar content ----------

function checkExplanationMarks(rows: { answerExplanation?: LocalizedText | null }[], path: string, issues: Issues) {
  for (const row of rows)
    if (row.answerExplanation && NAMES_ONLY_THE_CHARACTER.test(row.answerExplanation.en))
      issues.add(
        path,
        `explanation "${row.answerExplanation.en}" must name the mark (accent aigu, cédille, umlaut…), not only the character`,
      )
}

/** Explanations use restricted Markdown, with the same structure and forms in every locale. */
export function checkRichText(text: LocalizedText, path: string, issues: Issues) {
  const parsed = Object.entries(text).map(([locale, t]) => ({ locale, ...parseRichText(t) }))
  for (const p of parsed) for (const e of p.errors) issues.add(`${path}.${p.locale}`, `${e} (restricted Markdown, D46)`)
  const [first, ...others] = parsed
  for (const p of others) {
    issues.check(
      blockSignature(p.blocks) === blockSignature(first.blocks),
      `${path}.${p.locale}`,
      `block structure ${blockSignature(p.blocks)} differs from ${first.locale} (${blockSignature(first.blocks)})`,
    )
    const forms = learningForms(p.blocks)
    const firstForms = learningForms(first.blocks)
    issues.check(
      sameMembers(forms, firstForms),
      `${path}.${p.locale}`,
      `learning-language forms differ from ${first.locale}: ${forms.map((f) => `\`${f}\``).join(', ') || 'none'} vs ${firstForms.map((f) => `\`${f}\``).join(', ') || 'none'}`,
    )
  }
}

function checkGrammarItem(item: GrammarItem, path: string, ruleIds: Set<string>, isExam: boolean, issues: Issues) {
  if ('ruleIds' in item)
    for (const id of item.ruleIds) issues.check(ruleIds.has(id), `${path}.ruleIds`, `unknown rule ${id}`)
  const tokens = 'tokens' in item ? item.tokens : []
  issues.unique(
    tokens.map((t) => t.tokenId),
    path,
    'token ID',
  )
  switch (item.type) {
    case 'grammar_explanation':
      checkRichText(item.text, `${path}.text`, issues)
      break
    case 'grammar_gap_choice':
      issues.unique(
        item.choices.map((c) => c.choiceId),
        path,
        'choice ID',
      )
      issues.unique(
        item.choices.map((c) => c.text),
        path,
        'choice text',
      )
      issues.check(
        item.choices.some((c) => c.choiceId === item.answerChoiceId),
        path,
        'answerChoiceId must be one of the choices',
      )
      issues.check(
        !/\(.*\)/.test(`${item.before} ${item.after}`),
        path,
        'put cues into hint (shown above the sentence), not in parentheses inside the sentence',
      )
      break
    case 'grammar_gap_typing':
      if (isExam) issues.check(item.hint === null, path, 'exam gaps have no hint')
      break
    case 'grammar_pronoun_form_match':
      issues.unique(
        item.rows.map((r) => r.rowId),
        path,
        'row ID',
      )
      for (const row of item.rows)
        issues.check(
          tokens.some((t) => row.validForms.includes(t.text)),
          path,
          `row ${row.rowId} has no token with a valid form`,
        )
      checkExplanationMarks(item.rows, path, issues)
      break
    case 'grammar_person_matching': {
      const persons = item.rows.map((r) => r.person).join(',')
      const allowed = [PERSONS.slice(0, 3), PERSONS.slice(3), PERSONS].map((p) => p.join(','))
      issues.check(
        allowed.includes(persons),
        `${path}.rows`,
        `persons must be ${allowed.map((p) => `[${p}]`).join(' or ')} in this order, not [${persons}]`,
      )
      const translationMode = item.mode === 'translation'
      item.rows.forEach((row, i) =>
        issues.check(
          translationMode ? row.native !== null && row.pronoun === null : row.pronoun !== null && row.native === null,
          `${path}.rows.${i}`,
          translationMode
            ? 'translation rows have a native prompt and no pronoun'
            : 'forms rows have a pronoun and no native prompt',
        ),
      )
      if (translationMode) {
        const locales = [...new Set(item.rows.flatMap((r) => Object.keys(r.native ?? {})))]
        for (const locale of locales)
          issues.unique(
            item.rows.map((r) => (r.native as Record<string, string> | null)?.[locale] ?? ''),
            path,
            `${locale} prompt`,
          )
      } else
        issues.unique(
          item.rows.map((r) => r.pronoun ?? ''),
          path,
          'pronoun',
        )
      checkExplanationMarks(item.rows, path, issues)
      break
    }
    case 'grammar_pronoun_form_typing':
      issues.unique(
        item.rows.map((r) => r.rowId),
        path,
        'row ID',
      )
      checkExplanationMarks(item.rows, path, issues)
      break
    case 'grammar_word_order': {
      const all = tokens.map((t) => t.tokenId)
      for (const order of item.acceptedOrders)
        issues.check(
          order.length === all.length && sameMembers(order, all),
          path,
          'each accepted order uses every token exactly once',
        )
      break
    }
    case 'grammar_error_spotter': {
      const faulty = tokens.find((t) => t.tokenId === item.faultyTokenId)
      if (issues.check(faulty !== undefined, path, 'faultyTokenId must be one of the tokens') && faulty)
        issues.check(
          !item.correction.accepted.answers.includes(faulty.text),
          path,
          'the correction must differ from the faulty token',
        )
      if (item.correction.mode === 'select')
        issues.check(
          item.correction.choices.length >= 2 &&
            item.correction.choices.some((c) => item.correction.accepted.answers.includes(c)),
          path,
          'select mode needs 2–4 choices including an accepted answer',
        )
      else issues.check(item.correction.choices.length === 0, path, 'type mode has no choices')
      break
    }
  }
  if ('answerExplanation' in item) checkExplanationMarks([item], path, issues)
}

function checkRuleCoverage(items: GrammarItem[], planned: string[], path: string, what: string, issues: Issues) {
  const assessed = new Set(items.flatMap((i) => ('ruleIds' in i ? i.ruleIds : [])))
  for (const id of assessed) issues.check(planned.includes(id), path, `rule ${id} is not planned for ${what}`)
  for (const id of planned) issues.check(assessed.has(id), path, `no item of ${what} assesses rule ${id}`)
}

/** The lesson must follow the brief: one step per block explanation and exercise, then feedback and exam. */
function checkGrammarContentAgainstBrief(lesson: GrammarLesson, brief: GrammarBrief, issues: Issues) {
  const ruleIds = new Set(brief.rules.map((r) => r.id))
  type Expected = {
    role: GrammarLesson['steps'][number]['role']
    blockId: string | null
    exercise?: GrammarBrief['blocks'][number]['exercises'][number]
  }
  const expected: Expected[] = []
  for (const block of brief.blocks) {
    expected.push({ role: 'explanation', blockId: block.id })
    for (const exercise of block.exercises) expected.push({ role: 'exercise', blockId: block.id, exercise })
  }
  expected.push({ role: 'feedback', blockId: null }, { role: 'exam', blockId: null })
  if (
    !issues.check(
      lesson.steps.length === expected.length,
      'steps',
      `expected ${expected.length} steps from the brief's blocks, exercises, feedback and exam`,
    )
  )
    return

  const examPlan = new Map(brief.exam.pages.map((p) => [p.pageId, p]))
  lesson.steps.forEach((step, s) => {
    const want = expected[s]
    const at = `steps.${s}`
    issues.check(
      step.role === want.role && step.blockId === want.blockId,
      at,
      `expected a ${want.role} step${want.blockId ? ` for block ${want.blockId}` : ''}`,
    )
    const items = step.pages.flatMap((p) => p.items)
    if (want.role === 'explanation')
      issues.check(
        items.every((i) => i.type === 'grammar_explanation'),
        at,
        'explanation steps contain explanations only',
      )
    if (want.role === 'feedback')
      issues.check(
        items.length === 1 && items[0].type === 'production_feedback_placeholder',
        at,
        'the feedback step is the fixed production placeholder',
      )
    if (want.exercise) {
      issues.check(
        items.every((i) => i.type === want.exercise!.type),
        at,
        `planned exercise ${want.exercise.id} is ${want.exercise.type}`,
      )
      if (want.exercise.type === 'grammar_person_matching')
        issues.check(
          step.pages.every((p) => p.items.length === 1),
          at,
          'each person matching board has a page of its own',
        )
      issues.check(
        items.length === want.exercise.itemCount,
        at,
        `planned exercise ${want.exercise.id} has ${want.exercise.itemCount} items`,
      )
      checkRuleCoverage(items, want.exercise.ruleIds, at, `planned exercise ${want.exercise.id}`, issues)
    }
    if (want.role === 'explanation') {
      const block = brief.blocks.find((b) => b.id === want.blockId)!
      for (const item of items)
        if ('ruleIds' in item)
          for (const id of item.ruleIds)
            issues.check(block.ruleIds.includes(id), at, `rule ${id} is not taught in block ${block.id}`)
    }
    step.pages.forEach((page, p) => {
      const pageAt = `${at}.pages.${p}`
      if (want.role === 'exam') {
        const plan = examPlan.get(page.pageId)
        if (
          issues.check(
            plan !== undefined,
            `${pageAt}.pageId`,
            `exam page ${page.pageId} is not in the brief's exam plan`,
          ) &&
          plan
        ) {
          issues.check(
            page.timeLimitS === plan.timeLimitS,
            `${pageAt}.timeLimitS`,
            `must equal the brief's limit ${plan.timeLimitS}s`,
          )
          issues.check(
            page.items.every((i) => i.type === plan.type) && page.items.length === plan.itemCount,
            `${pageAt}.items`,
            `page plan expects ${plan.itemCount} ${plan.type} items`,
          )
          checkRuleCoverage(page.items, plan.ruleIds, `${pageAt}.items`, `exam page ${plan.pageId}`, issues)
        }
      } else issues.check(page.timeLimitS === null, `${pageAt}.timeLimitS`, 'only exam pages have a countdown')
      page.items.forEach((item, i) => checkGrammarItem(item, `${pageAt}.items.${i}`, ruleIds, want.role === 'exam', issues))
    })
  })
  const examPages = lesson.steps[lesson.steps.length - 1].pages.map((p) => p.pageId)
  issues.check(sameMembers(examPages, [...examPlan.keys()]), 'steps', 'exam pages must match the brief exam plan')
}

export function validateContent(
  data: unknown,
  ctx: ValidationContext & { brief: Brief },
): ValidationResult<Lesson> {
  if (!isPlayableKind(ctx.entry.kind))
    return {
      status: 'invalid',
      issues: [{ path: 'kind', message: `${ctx.entry.kind} lessons have no agreed content schema yet` }],
      staleReasons: [],
    }
  if (!needsContentFile(ctx.entry.kind))
    return {
      status: 'invalid',
      issues: [
        { path: '', message: 'vocabulary lessons have no content file: the brief is the whole lesson (P2-04)' },
      ],
      staleReasons: [],
    }
  const parsed = lessonSchemaFor(ctx.entry.kind, ctx.lang).safeParse(data)
  if (!parsed.success) return { status: 'invalid', issues: zodIssues(parsed.error), staleReasons: [] }
  const lesson = parsed.data as Lesson
  const issues = new Issues()
  checkHeader(lesson, ctx, issues)
  const steps = lessonSteps(lesson)
  const pages = steps.flatMap<LessonPage>((s) => s.pages)
  issues.unique(
    steps.map((s) => s.id),
    'steps',
    'step ID',
  )
  issues.unique(
    pages.map((p) => p.pageId),
    'steps',
    'page ID',
  )
  issues.unique(
    pages.flatMap((p) => p.items.map((i: { itemId: string }) => i.itemId)),
    'steps',
    'item ID',
  )
  checkMinutes(lesson.estimatedMinutes, sum(pages.map((p) => p.estimatedDurationS)), issues)
  if (lesson.kind === 'grammar' && ctx.brief.kind === 'grammar') checkGrammarContentAgainstBrief(lesson, ctx.brief, issues)

  const staleReasons: string[] = []
  if (ctx.outlineHash && lesson.provenance.inputHashes.outline !== ctx.outlineHash)
    staleReasons.push('the outline entry changed after this content was generated')
  if (ctx.briefHash && lesson.provenance.inputHashes.brief !== ctx.briefHash)
    staleReasons.push('the brief changed after this content was generated')
  return result(lesson, issues, staleReasons)
}

