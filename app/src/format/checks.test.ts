import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { OutlineEntry } from '../schemas/outline'
import { briefSchema, type Brief, type LexEntry } from './brief'
import { checkBrief, checkContent, hasErrors, validateBrief, validateContent, type Issue } from './checks'
import { contentSchema, type Content } from './content'
import { contentSeconds } from './durations'
import exampleBrief from './examples/fr-subject-pronouns.brief.json'
import exampleContent from './examples/fr-subject-pronouns.content.json'
import { isKnown, knownBefore, type KnownWords } from './lexicon'
import { gradeAnswer, normalizeAnswer } from './normalize'

const entry: OutlineEntry = {
  id: 'fr-subject-pronouns',
  kind: 'grammar',
  topic: 'pronouns',
  workingTitle: 'Les pronoms je, tu, il, elle…',
  intent: 'Employer les pronoms sujets.',
}
const greetings: OutlineEntry = {
  id: 'fr-greetings-and-goodbyes',
  kind: 'functions',
  theme: 'relations',
  workingTitle: 'Saluer et dire au revoir',
  intent: 'Saluer et prendre congé.',
}
const expression = (term: string): LexEntry => ({
  term,
  pos: 'expression',
  gender: null,
  forms: [term],
  meaning: { en: term, de: term },
  register: 'neutral',
  pointId: 'p-1',
})
/** Lesson 1 taught the greetings: lesson 2 may use them. */
const known: KnownWords = knownBefore(
  'fr',
  [greetings, entry],
  new Map([[greetings.id, { introduces: ['bonjour', 'salut', 'au revoir'].map(expression) }]]),
  entry.id,
)

const ctx = { entry, lang: 'fr' as const, level: 'A1' as const, known }
const brief = (): Brief => briefSchema('fr', 'A1').parse(structuredClone(exampleBrief))
const content = (): Content => contentSchema('fr', 'A1').parse(structuredClone(exampleContent))
const errors = (issues: Issue[]) => issues.filter((i) => i.severity === 'error').map((i) => `${i.path}: ${i.message}`)
const expectError = (issues: Issue[], pattern: RegExp) => expect(errors(issues).join('\n')).toMatch(pattern)

describe('the example lesson', () => {
  it('is a valid brief', () => {
    const result = validateBrief(structuredClone(exampleBrief), ctx)
    expect(errors(result.issues)).toEqual([])
  })
  it('is a valid content', () => {
    const result = validateContent(structuredClone(exampleContent), { brief: brief(), known, lang: 'fr' })
    expect(errors(result.issues)).toEqual([])
    expect(result.issues).toEqual([])
  })
  it('lasts less than ten minutes, counted from fixed durations', () => {
    expect(contentSeconds(content()).total).toBeLessThanOrEqual(600)
  })
  it('gives the LLM a JSON Schema', () => {
    expect(() => z.toJSONSchema(briefSchema('fr', 'A1'))).not.toThrow()
    expect(() => z.toJSONSchema(contentSchema('fr', 'A1'))).not.toThrow()
  })
})

describe('explanation languages (decision C)', () => {
  it('uses the mother tongues in A1 and A2', () => {
    expect(briefSchema('fr', 'A1').safeParse(exampleBrief).success).toBe(true)
  })
  it('uses the course language from B1', () => {
    const b1 = briefSchema('fr', 'B1').safeParse({ ...exampleBrief, level: 'B1' })
    expect(b1.success).toBe(false)
    expect(b1.error?.issues.some((i) => i.path.join('.') === 'summary.fr')).toBe(true)
  })
})

describe('brief checks', () => {
  it('match the outline entry', () => {
    expectError(checkBrief(brief(), { ...ctx, entry: { ...entry, topic: 'negation' } }), /topic: must equal the outline topic/)
  })
  it('refuse a plan longer than ten minutes', () => {
    const b = brief()
    b.practice = b.practice.map((p) => ({ ...p, count: 6 }))
    expectError(checkBrief(b, ctx), /the plan lasts \d+s.*at most 600s/)
  })
  it('want each point to open with a click exercise', () => {
    const b = brief()
    b.practice[0].type = 'gap_typing'
    expectError(checkBrief(b, ctx), /p-singular must open with a click exercise/)
  })
  it('balance clicking and typing', () => {
    const b = brief()
    b.practice[1].count = 4
    expectError(checkBrief(b, ctx), /of practice is typing; at most 40%/)
  })
  it('want every point practised and quizzed', () => {
    const b = brief()
    b.quiz = b.quiz.filter((q) => !q.pointIds.includes('p-tu-vous'))
    expectError(checkBrief(b, ctx), /the quiz does not cover point p-tu-vous/)
  })
  it('refuse exercise types of another kind', () => {
    const b = brief()
    b.practice[0].type = 'true_false'
    expectError(checkBrief(b, ctx), /true_false is not used in grammar lessons/)
  })
  it('want a gender for nouns', () => {
    const b = brief()
    b.glossary[2].gender = null
    expectError(checkBrief(b, ctx), /"madame" is a noun: give its gender/)
  })
  it('never let a too big lesson through', () => {
    const b = brief()
    b.tooBig = { en: 'Too much.', de: 'Zu viel.' }
    expectError(checkBrief(b, ctx), /a human must decide/)
  })
})

describe('content checks', () => {
  const check = (c: Content, k: KnownWords | undefined = known) => checkContent(c, { brief: brief(), known: k })

  it('want at least one correct and one wrong choice', () => {
    const c = content()
    const ex = c.sections[0].practice[0]
    if (ex.type === 'gap_choice') ex.choices.forEach((x) => (x.correct = false))
    expectError(check(c), /at least one choice is correct/)
  })
  it('accept several correct choices', () => {
    const c = content()
    const ex = c.sections[0].practice[1]
    if (ex.type === 'gap_choice') ex.choices.push({ text: 'On', correct: true })
    expect(errors(check(c))).toEqual([])
  })
  it('list each accepted answer once: case and apostrophes are normalised by code', () => {
    const c = content()
    const ex = c.sections[0].practice[2]
    if (ex.type === 'gap_typing') ex.accepted = ['Il', 'il']
    expectError(check(c), /accepted answer listed twice: "Il" and "il"/)
  })
  it('want a hint in practice and none in the quiz', () => {
    const c = content()
    c.sections[1].practice[0].hint = null
    c.quiz[0].hint = { en: 'man', de: 'Mann' }
    const issues = check(c)
    expectError(issues, /every practice exercise has a hint/)
    expectError(issues, /quiz exercises have no hint/)
  })
  it('refuse unknown words, or warn when earlier briefs are missing', () => {
    const c = content()
    const ex = c.sections[0].practice[2]
    if (ex.type === 'gap_typing') ex.after = 'est avec le soleil.'
    expectError(check(c), /"soleil" is not known/)
    const partial = check(c, { ...known, complete: false, missing: ['fr-greetings-and-goodbyes'] })
    expect(hasErrors(partial)).toBe(false)
    expect(partial.some((i) => i.severity === 'warning' && /soleil/.test(i.message))).toBe(true)
  })
  it('follow the plan of the brief', () => {
    const c = content()
    c.sections[0].practice.pop()
    expectError(check(c), /the brief plans gap_choice, gap_choice, gap_typing/)
  })
  it('refuse a quiz exercise copied from practice', () => {
    const c = content()
    const [quiz, practice] = [c.quiz[0], c.sections[0].practice[2]]
    if (quiz.type === 'gap_typing' && practice.type === 'gap_typing') [quiz.before, quiz.after] = [practice.before, practice.after]
    expectError(check(c), /repeats a practice exercise/)
  })
  it('want a sentence around a gap', () => {
    const c = content()
    const ex = c.sections[0].practice[2]
    if (ex.type === 'gap_typing') [ex.before, ex.after] = ['Marc', 'Léa']
    expectError(check(c), /needs at least 3 words/)
  })
  it('translate examples in A1', () => {
    const c = content()
    const card = c.sections[0].theory
    if (card?.type === 'rule') card.examples[0].translation = null
    expectError(check(c), /examples are translated in A1/)
  })
})

describe('answers', () => {
  it('ignore case, apostrophe style and final punctuation', () => {
    expect(normalizeAnswer(' J’habite  à Paris. ')).toBe("j'habite à paris")
    expect(gradeAnswer('Il', ['il'])).toBe('correct')
  })
  it('accept an accent mistake, with a remark', () => {
    expect(gradeAnswer('etes', ['êtes'])).toBe('accent')
    expect(gradeAnswer('sont', ['êtes'])).toBe('wrong')
  })
  it('know elided and hyphenated words from their parts', () => {
    const forms = new Set(["j'", 'habite', 'est', 'ce'])
    expect(isKnown("j'habite", forms)).toBe(true)
    expect(isKnown('est-ce', forms)).toBe(true)
    expect(isKnown("j'aime", forms)).toBe(false)
  })
})
