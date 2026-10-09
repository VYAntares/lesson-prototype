import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { manifestSchema } from '../../schemas/manifest'
import { outlineSchema } from '../../schemas/outline'
import { validateBrief, validateContent } from './validate'

const PUBLIC = join(__dirname, '../../../public')
const readJson = (url: string) => JSON.parse(readFileSync(join(PUBLIC, url), 'utf8'))

const manifest = manifestSchema.parse(readJson('content/manifest.json'))

describe('shipped content', () => {
  for (const course of manifest.courses) {
    const outline = outlineSchema.parse(readJson(course.outlineUrl))
    for (const entry of outline.entries) {
      const artifacts = manifest.artifacts[entry.id]
      if (!artifacts?.draft) continue
      const ctx = { entry, lang: course.lang, level: course.level, outlineHash: artifacts.outlineHash }

      it(`${entry.id}: brief is ${artifacts.draft.status}`, () => {
        const brief = validateBrief(readJson(artifacts.draft!.url), ctx)
        expect(brief.issues).toEqual([])
        expect(brief.status).toBe(artifacts.draft!.status)
      })

      if (artifacts.content)
        it(`${entry.id}: content is ${artifacts.content.status}`, () => {
          const brief = validateBrief(readJson(artifacts.draft!.url), ctx)
          // Like the app: hashes are not passed, the manifest status says whether a file is stale.
          const content = validateContent(readJson(artifacts.content!.url), { ...ctx, brief: brief.value! })
          expect(content.issues).toEqual([])
          expect(content.status).toBe(artifacts.content!.status)
        })
    }
  }
})
