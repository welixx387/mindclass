import { memo } from 'react'
import type { Block } from '../../lib/markup'

/**
 * Текст главы. Вынесен в отдельный мемоизированный компонент, чтобы прокрутка
 * и обновление прогресса не перерисовывали сотни абзацев.
 * У каждого блока есть data-i (номер) и id="p<номер>" для ссылок из закладок.
 */
export const ChapterText = memo(function ChapterText({
  blocks,
  bookmarked,
  onImageClick,
}: {
  blocks: Block[]
  bookmarked: ReadonlySet<number>
  onImageClick: (src: string, alt: string) => void
}) {
  return (
    <>
      {blocks.map((block, i) => {
        const mark = bookmarked.has(i) ? ' bookmarked' : ''
        const common = { 'data-i': i, id: `p${i}` }
        switch (block.type) {
          case 'p':
            return <p key={i} {...common} className={`rp${mark}`} dangerouslySetInnerHTML={{ __html: block.html }} />
          case 'center':
            return <p key={i} {...common} className={`rp rp-center${mark}`} dangerouslySetInnerHTML={{ __html: block.html }} />
          case 'heading':
            return <h3 key={i} {...common} className={`rp rp-heading${mark}`} dangerouslySetInnerHTML={{ __html: block.html }} />
          case 'quote':
            return <div key={i} {...common} className={`rp rp-quote${mark}`} dangerouslySetInnerHTML={{ __html: block.html }} />
          case 'break':
            return (
              <div key={i} {...common} className="rp rp-break" aria-hidden="true">
                <span className="rp-break-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )
          case 'image':
            return (
              <figure key={i} {...common} className={`rp rp-image${mark}`}>
                <img src={block.src} alt={block.alt} loading="lazy" decoding="async" onClick={() => onImageClick(block.src, block.alt)} />
                {block.alt && <figcaption className="mt-2 text-center text-[0.8em] opacity-60">{block.alt}</figcaption>}
              </figure>
            )
        }
      })}
    </>
  )
})
