import type { Brief } from '../../schemas/brief'
import { grammarLessonSchema } from '../../schemas/lesson'
import { ContentPreview } from './ContentPreview'

/** Content section of a grammar lesson (shown once brief and content are valid). */
export function GrammarContentView({ data, brief }: { data: unknown; brief?: Brief }) {
  if (!brief || brief.kind !== 'grammar') return null
  return <ContentPreview content={grammarLessonSchema(brief.lang).parse(data)} brief={brief} />
}
