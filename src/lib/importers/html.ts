/**
 * Перевод HTML/XHTML (главы из EPUB) в разметку сайта.
 * Документ режется на сегменты по заголовкам h1/h2 — это нужно, когда в
 * одном файле EPUB лежат сразу несколько глав.
 */

export interface HtmlSegment {
  title?: string
  lines: string[]
}

const SKIP = new Set(['script', 'style', 'head', 'title', 'meta', 'link', 'noscript', 'template'])
const BLOCK = new Set([
  'p', 'div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'figure', 'figcaption', 'ul', 'ol', 'li',
  'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'address', 'center', 'body', 'svg',
])
const BREAK_TEXT = /^(?:(?:\*\s*){3,}|(?:[◇◆❖♦•·~=#]\s*){3,}|(?:—\s*){2,}|(?:-\s*){3,})$/u

function tagOf(node: Node): string {
  return node.nodeType === 1 ? ((node as Element).localName || (node as Element).nodeName).toLowerCase() : ''
}

function hrefOf(el: Element): string | null {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.localName.toLowerCase()
    if (name === 'src' || name === 'href') return attr.value
  }
  return null
}

export function imageLine(alt: string, key: string): string {
  return `![${alt.replace(/[[\]]/g, '')}](${key})`
}

function wrap(marker: string, inner: string): string {
  const trimmed = inner.trim()
  if (!trimmed) return inner
  const lead = inner.match(/^\s*/)![0]
  const tail = inner.match(/\s*$/)![0]
  return `${lead}${marker}${trimmed}${marker}${tail}`
}

export function htmlToSegments(root: Element, resolveImage: (src: string) => string | null): HtmlSegment[] {
  const segments: HtmlSegment[] = [{ lines: [] }]
  let buffer = ''

  const current = () => segments[segments.length - 1]
  const push = (line: string) => current().lines.push(line)

  const flush = () => {
    for (const raw of buffer.split('\n')) {
      const line = raw.replace(/\s+/g, ' ').trim()
      if (!line) continue
      push(BREAK_TEXT.test(line) ? '***' : line)
    }
    buffer = ''
  }

  const textOf = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

  const image = (el: Element) => {
    const src = hrefOf(el)
    const key = src ? resolveImage(src) : null
    return key ? imageLine(el.getAttribute('alt') ?? '', key) : null
  }

  const inline = (node: Node): string => {
    if (node.nodeType === 3) return (node.nodeValue ?? '').replace(/\s+/g, ' ')
    if (node.nodeType !== 1) return ''
    const el = node as Element
    const tag = tagOf(el)
    if (SKIP.has(tag)) return ''
    if (tag === 'br') return '\n'
    if (tag === 'img' || tag === 'image') {
      const line = image(el)
      return line ? `\n${line}\n` : ''
    }
    const inner = Array.from(el.childNodes).map(inline).join('')
    if (tag === 'em' || tag === 'i' || tag === 'cite') return wrap('*', inner)
    if (tag === 'strong' || tag === 'b') return wrap('**', inner)
    return inner
  }

  const hasBlockChild = (el: Element) =>
    Array.from(el.children).some((c) => {
      const t = tagOf(c)
      return BLOCK.has(t) || /^h[1-6]$/.test(t) || t === 'blockquote' || t === 'hr' || t === 'img' || t === 'image'
    })

  const walk = (el: Element) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) {
        buffer += (child.nodeValue ?? '').replace(/\s+/g, ' ')
        continue
      }
      if (child.nodeType !== 1) continue
      const node = child as Element
      const tag = tagOf(node)
      if (SKIP.has(tag)) continue

      if (tag === 'br') {
        buffer += '\n'
      } else if (tag === 'hr') {
        flush()
        push('***')
      } else if (tag === 'img' || tag === 'image') {
        flush()
        const line = image(node)
        if (line) push(line)
      } else if (/^h[1-6]$/.test(tag)) {
        flush()
        const text = textOf(node)
        if (!text) {
          walk(node)
          flush()
          continue
        }
        const level = Number(tag[1])
        const seg = current()
        const empty = seg.lines.length === 0
        if (level <= 2 && empty && !seg.title) seg.title = text
        else if (level <= 2) segments.push({ title: text, lines: [] })
        else if (empty && !seg.title) seg.title = text
        else push(BREAK_TEXT.test(text) ? '***' : `## ${text}`)
      } else if (tag === 'blockquote') {
        flush()
        const before = current().lines.length
        walk(node)
        flush()
        const lines = current().lines
        for (let i = before; i < lines.length; i++) {
          if (!lines[i].startsWith('![') && lines[i] !== '***') lines[i] = `> ${lines[i]}`
        }
        push('')
      } else if (BLOCK.has(tag) || hasBlockChild(node)) {
        flush()
        walk(node)
        flush()
      } else {
        buffer += inline(node)
      }
    }
  }

  walk(root)
  flush()

  // Пустые строки нужны только между соседними врезками — остальное убираем.
  for (const seg of segments) {
    seg.lines = seg.lines.filter((l, i, arr) => l !== '' || (arr[i - 1]?.startsWith('>') && arr[i + 1]?.startsWith('>')))
    while (seg.lines[0] === '***') seg.lines.shift()
    if (seg.title && seg.lines[0] && seg.lines[0].toLowerCase() === seg.title.toLowerCase()) seg.lines.shift()
  }
  return segments.filter((s, i) => i === 0 || s.title || s.lines.length)
}
