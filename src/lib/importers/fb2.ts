import { imageLine } from './html'
import { IMAGE_PLACEHOLDER, normalizeContent, type ImportedChapter, type ImportedImage, type ImportResult } from './text'

/**
 * FB2 — XML-формат, в котором часто распространяются переводы ранобэ.
 * Главы — это <section> с абзацами; вложенные секции разворачиваются.
 */

const BREAK_TEXT = /^(?:(?:\*\s*){3,}|(?:[◇◆❖♦•·~=#]\s*){3,}|(?:—\s*){2,})$/u
const SERVICE_TITLE = /^(обложка|cover|оглавление|содержание|contents|аннотация|annotation)$/i

function children(el: Element, name?: string): Element[] {
  return Array.from(el.children).filter((c) => !name || c.localName === name)
}

function hrefOf(el: Element): string {
  for (const attr of Array.from(el.attributes)) if (attr.localName === 'href') return attr.value
  return ''
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function inline(node: Node): string {
  if (node.nodeType === 3) return (node.nodeValue ?? '').replace(/\s+/g, ' ')
  if (node.nodeType !== 1) return ''
  const el = node as Element
  const inner = Array.from(el.childNodes).map(inline).join('')
  const wrap = (m: string) => (inner.trim() ? inner.replace(/^(\s*)([\s\S]*?)(\s*)$/, `$1${m}$2${m}$3`) : inner)
  switch (el.localName) {
    case 'emphasis':
      return wrap('*')
    case 'strong':
      return wrap('**')
    case 'image':
      return ''
    default:
      return inner
  }
}

function textLine(el: Element): string {
  return inline(el).replace(/\s+/g, ' ').trim()
}

export function parseFb2(xmlText: string): ImportResult {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Не удалось прочитать FB2: файл повреждён или это не XML')

  const warnings: string[] = []
  const all = (name: string) => Array.from(doc.getElementsByTagName('*')).filter((e) => e.localName === name)
  const bookTitle = all('book-title')[0]?.textContent?.trim()

  const binaries = new Map<string, { type: string; data: string }>()
  for (const bin of all('binary')) {
    const id = bin.getAttribute('id')
    if (id) binaries.set(id, { type: bin.getAttribute('content-type') ?? 'image/jpeg', data: bin.textContent ?? '' })
  }

  const bodies = all('body')
  const body = bodies.find((b) => !b.getAttribute('name')) ?? bodies[0]
  if (!body) throw new Error('В FB2 нет текста (<body>)')
  if (bodies.some((b) => b.getAttribute('name') === 'notes')) {
    warnings.push('Сноски из раздела примечаний не импортируются — при необходимости добавьте их в текст вручную.')
  }

  const images = new Map<string, ImportedImage>()
  const useImage = (el: Element): string | null => {
    const id = hrefOf(el).replace(/^#/, '')
    const bin = binaries.get(id)
    if (!bin) return null
    const key = `${IMAGE_PLACEHOLDER}${id}`
    if (!images.has(key)) images.set(key, { key, type: bin.type, data: decodeBase64(bin.data) })
    return imageLine('', key)
  }

  const convert = (nodes: Element[], out: string[], prefix = '') => {
    for (const el of nodes) {
      switch (el.localName) {
        case 'p': {
          const line = textLine(el)
          if (line) out.push(prefix + (BREAK_TEXT.test(line) ? '***' : line))
          for (const img of children(el, 'image')) {
            const l = useImage(img)
            if (l) out.push(l)
          }
          break
        }
        case 'subtitle': {
          const line = textLine(el)
          if (line) out.push(BREAK_TEXT.test(line) ? '***' : `${prefix}## ${line}`)
          break
        }
        case 'empty-line':
          break
        case 'image': {
          const l = useImage(el)
          if (l) out.push(l)
          break
        }
        case 'cite':
        case 'epigraph':
        case 'poem':
        case 'stanza':
          convert(children(el), out, '> ')
          if (!prefix) out.push('')
          break
        case 'v':
        case 'text-author': {
          const line = textLine(el)
          if (line) out.push(`> ${line}`)
          break
        }
        case 'title':
        case 'section':
          break
        default:
          convert(children(el), out, prefix)
      }
    }
  }

  const chapters: ImportedChapter[] = []
  let counter = 0
  const titleOf = (section: Element) => {
    const t = children(section, 'title')[0]
    if (!t) return ''
    const parts = children(t, 'p').map(textLine).filter(Boolean)
    return (parts.length ? parts.join('. ') : (t.textContent ?? '').trim()).replace(/\*+/g, '').replace(/\.\./g, '.')
  }

  const visit = (section: Element, parentTitle: string) => {
    const title = titleOf(section)
    const content = children(section).filter((c) => c.localName !== 'title' && c.localName !== 'section')
    const hasContent = content.some((c) => ['p', 'subtitle', 'image', 'poem', 'cite', 'table', 'epigraph'].includes(c.localName))
    if (hasContent) {
      counter++
      const lines: string[] = []
      convert(content, lines)
      const text = normalizeContent(lines.join('\n'))
      const finalTitle = (title || parentTitle || `Глава ${counter}`).slice(0, 200)
      chapters.push({ title: finalTitle, content: text, include: Boolean(text) && !SERVICE_TITLE.test(finalTitle) })
    }
    for (const sub of children(section, 'section')) visit(sub, title && !hasContent ? '' : title)
  }

  const topSections = children(body, 'section')
  if (topSections.length) {
    for (const s of topSections) visit(s, '')
  } else {
    visit(body, bookTitle ?? 'Глава')
  }

  if (!chapters.length) warnings.push('Не удалось найти главы в файле.')
  return { bookTitle, chapters, images, warnings }
}
