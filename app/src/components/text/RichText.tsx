import { parseRichText, type Inline } from '../../lib/richText'

function Inlines({ inlines, lang }: { inlines: Inline[]; lang: string }) {
  return (
    <>
      {inlines.map((inline, i) =>
        inline.kind === 'strong' ? (
          <strong key={i}>{inline.text}</strong>
        ) : inline.kind === 'learning' ? (
          <span key={i} className="learning-form" lang={lang}>
            {inline.text}
          </span>
        ) : (
          <span key={i}>{inline.text}</span>
        ),
      )}
    </>
  )
}

/** Renders restricted Markdown; `learning-language forms` get the course language. */
export function RichText({ text, lang, className = 'rich-text' }: { text: string; lang: string; className?: string }) {
  const { blocks } = parseRichText(text)
  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.kind === 'paragraph' ? (
          <p key={i}>
            <Inlines inlines={block.inlines} lang={lang} />
          </p>
        ) : block.ordered ? (
          <ol key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines inlines={item} lang={lang} />
              </li>
            ))}
          </ol>
        ) : (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines inlines={item} lang={lang} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
