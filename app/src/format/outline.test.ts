import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { outlineSchema } from '../schemas/outline'

/** ft_transcendence: LESSONS_PER_LEVEL and KIND_COUNTS (French and German share one mix). */
const KIND_COUNTS = { A1: { grammar: 48, vocabulary: 48, functions: 14, reading: 10 } } as const

const outline = outlineSchema.parse(
  JSON.parse(readFileSync(join(__dirname, '../../public/content/outlines/fr-a1.json'), 'utf8')),
)

describe('the fr-a1 outline (a copy of ft_transcendence content/outlines/fr-a1.json)', () => {
  it('has 120 entries with the kind quotas the project CI wants', () => {
    const counts = { grammar: 0, vocabulary: 0, functions: 0, reading: 0 }
    for (const e of outline.entries) counts[e.kind]++
    expect(outline.entries).toHaveLength(120)
    expect(counts).toEqual(KIND_COUNTS.A1)
  })
})
