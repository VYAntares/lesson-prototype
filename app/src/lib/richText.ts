// Restricted Markdown used in explanations: paragraphs, "- " / "1. " lists,
// **bold** and `learning-language forms`. Everything else is reported as an error.

export type Inline = { kind: 'text' | 'strong' | 'learning'; text: string }
export type RichBlock =
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }

const BULLET = /^- (.*)$/
const NUMBERED = /^\d{1,2}\. (.*)$/
const FORBIDDEN_BLOCKS: [RegExp, string][] = [
  [/^#{1,6}\s/, 'headings'],
  [/^>/, 'block quotes'],
  [/^\|/, 'tables'],
  [/^```/, 'code fences'],
  [/^[*+] /, 'lists other than "- " and "1. "'],
]
const FORBIDDEN_INLINE: [RegExp, string][] = [
  [/<\/?[a-z][^>]*>/i, 'HTML'],
  [/!?\[[^\]]*\]\([^)]*\)/, 'links or images'],
  [/\\n/, 'a literal "\\n"'],
]

function parseInlines(text: string, where: string, errors: string[]): Inline[] {
  const out: Inline[] = []
  const push = (kind: Inline['kind'], t: string) => {
    if (!t) return
    const last = out.at(-1)
    if (kind === 'text' && last?.kind === 'text') last.text += t
    else out.push({ kind, text: t })
  }
  let i = 0
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2)
      const inner = end < 0 ? '' : text.slice(i + 2, end)
      if (end < 0 || !inner.trim()) {
        errors.push(`${where}: unclosed or empty **bold**`)
        return out
      }
      if (/[`*]/.test(inner)) errors.push(`${where}: bold text cannot contain other markup`)
      push('strong', inner)
      i = end + 2
    } else if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      const inner = end < 0 ? '' : text.slice(i + 1, end)
      if (end < 0 || !inner.trim()) {
        errors.push(`${where}: unclosed or empty \`learning-language form\``)
        return out
      }
      if (inner.includes('*')) errors.push(`${where}: a learning-language form cannot contain other markup`)
      push('learning', inner)
      i = end + 1
    } else if (text[i] === '*' || (text[i] === '_' && /(^|\s)_\S/.test(text.slice(Math.max(0, i - 1), i + 2)))) {
      errors.push(`${where}: only **bold** and \`form\` markup is allowed (found "${text[i]}")`)
      push('text', text[i])
      i++
    } else {
      const next = text.slice(i).search(/\*|`/)
      const chunk = next < 0 ? text.slice(i) : text.slice(i, i + Math.max(next, 1))
      push('text', chunk)
      i += chunk.length
    }
  }
  return out
}

export function parseRichText(text: string): { blocks: RichBlock[]; errors: string[] } {
  const errors: string[] = []
  const blocks: RichBlock[] = []
  text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n[ \t]*\n+/)
    .forEach((chunk, index) => {
      const lines = chunk
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const where = `block ${index + 1}`
      for (const line of lines) {
        for (const [re, name] of FORBIDDEN_BLOCKS) if (re.test(line)) errors.push(`${where}: ${name} are not allowed`)
        for (const [re, name] of FORBIDDEN_INLINE) if (re.test(line)) errors.push(`${where}: ${name} not allowed`)
      }
      const bullets = lines.every((l) => BULLET.test(l))
      const numbered = lines.every((l) => NUMBERED.test(l))
      if (lines.length && (bullets || numbered)) {
        const re = bullets ? BULLET : NUMBERED
        blocks.push({
          kind: 'list',
          ordered: !bullets,
          items: lines.map((l, i) => parseInlines(re.exec(l)![1], `${where}, item ${i + 1}`, errors)),
        })
      } else {
        if (lines.some((l) => BULLET.test(l) || NUMBERED.test(l)))
          errors.push(`${where}: separate a list from surrounding text with a blank line`)
        blocks.push({ kind: 'paragraph', inlines: parseInlines(lines.join(' '), where, errors) })
      }
    })
  return { blocks, errors }
}

/** Block structure signature, e.g. "p|ul:3", used to compare translations. */
export function blockSignature(blocks: RichBlock[]) {
  return blocks.map((b) => (b.kind === 'paragraph' ? 'p' : `${b.ordered ? 'ol' : 'ul'}:${b.items.length}`)).join('|')
}

/** All `learning-language` forms in the text. */
export function learningForms(blocks: RichBlock[]) {
  return blocks
    .flatMap((b) => (b.kind === 'paragraph' ? [b.inlines] : b.items))
    .flat()
    .filter((i) => i.kind === 'learning')
    .map((i) => i.text)
}
