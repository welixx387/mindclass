/**
 * Разметка текста глав.
 *
 * Формат намеренно простой, чтобы его было удобно вставлять из любого
 * источника и править руками:
 *
 *   Обычная строка            → абзац
 *   ***  или  * * *  или ◇◇◇  → разрыв сцены
 *   ## Подзаголовок           → подзаголовок внутри главы
 *   > Сообщение               → врезка (переписка, записка, объявление);
 *                               несколько строк подряд объединяются
 *   -> Текст <-               → текст по центру
 *   ![подпись](https://…)     → иллюстрация
 *   **жирный**, *курсив*      → выделение внутри абзаца
 *
 * Весь пользовательский текст экранируется — HTML в главах не исполняется.
 */

export type Block =
  | { type: 'p'; html: string }
  | { type: 'quote'; html: string }
  | { type: 'heading'; html: string }
  | { type: 'center'; html: string }
  | { type: 'break' }
  | { type: 'image'; src: string; alt: string }

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

/** Жирный и курсив поверх уже экранированной строки. */
export function inlineMarkup(escaped: string): string {
  return escaped
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\p{L}\p{N}])\*(?=[^\s*])([^*]*?[^\s*])\*(?![*\p{L}\p{N}])/gu, '$1<em>$2</em>')
}

const BREAK_RE = /^(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:—\s*){2,}|(?:_\s*){3,}|(?:[◇◆❖♦•·~=#]\s*){3,})$/u
const HEADING_RE = /^#{1,3}\s+(.+)$/
const IMAGE_RE = /^!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)$/
const QUOTE_RE = /^>\s?(.*)$/
const CENTER_RE = /^->\s*(.+?)\s*<-$/

export function isSafeImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || (src.startsWith('/') && !src.startsWith('//'))
}

export function parseChapter(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let quote: string[] | null = null

  const flushQuote = () => {
    if (quote && quote.length) blocks.push({ type: 'quote', html: quote.join('<br>') })
    quote = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushQuote()
      continue
    }

    const q = QUOTE_RE.exec(line)
    if (q) {
      const content = q[1].trim()
      ;(quote ??= []).push(inlineMarkup(escapeHtml(content)))
      continue
    }
    flushQuote()

    if (BREAK_RE.test(line)) {
      // Два разрыва подряд не имеют смысла — схлопываем.
      if (blocks.length && blocks[blocks.length - 1].type !== 'break') blocks.push({ type: 'break' })
      continue
    }

    const h = HEADING_RE.exec(line)
    if (h) {
      blocks.push({ type: 'heading', html: inlineMarkup(escapeHtml(h[1].trim())) })
      continue
    }

    const img = IMAGE_RE.exec(line)
    if (img && isSafeImageSrc(img[2])) {
      blocks.push({ type: 'image', src: img[2], alt: img[1].trim() })
      continue
    }

    const c = CENTER_RE.exec(line)
    if (c) {
      blocks.push({ type: 'center', html: inlineMarkup(escapeHtml(c[1])) })
      continue
    }

    blocks.push({ type: 'p', html: inlineMarkup(escapeHtml(line)) })
  }
  flushQuote()

  // Разрыв в самом конце главы не нужен.
  while (blocks.length && blocks[blocks.length - 1].type === 'break') blocks.pop()
  return blocks
}

/** Текст блока без разметки — для цитат в закладках и подсчёта слов. */
export function blockText(block: Block): string {
  switch (block.type) {
    case 'break':
      return ''
    case 'image':
      return block.alt ? `[Иллюстрация: ${block.alt}]` : '[Иллюстрация]'
    default:
      return decodeEntities(block.html.replace(/<br>/g, ' ').replace(/<[^>]+>/g, ''))
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)
  return matches ? matches.length : 0
}

/** Короткая цитата для закладки: первые ~180 символов по границе слова. */
export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[,.;:—–-]+$/, '')}…`
}
