import { htmlToSegments } from './html'
import { IMAGE_PLACEHOLDER, normalizeContent, type ImportedChapter, type ImportedImage, type ImportResult } from './text'
import { readZip, resolvePath, type ZipEntry } from './zip'

/**
 * EPUB: читаем порядок чтения (spine) и оглавление (nav.xhtml или toc.ncx),
 * главы определяем по оглавлению, а если его нет — по заголовкам h1/h2.
 */

const SERVICE_TITLE = /^(обложка|cover|оглавление|содержание|contents|table of contents|титул|title page|copyright|информация|аннотация)/i
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
}

async function readText(zip: Map<string, ZipEntry>, path: string): Promise<string> {
  const entry = zip.get(path) ?? [...zip.values()].find((e) => e.name.toLowerCase() === path.toLowerCase())
  if (!entry) throw new Error(`В архиве нет файла ${path}`)
  return new TextDecoder('utf-8').decode(await entry.read())
}

function parseXml(text: string, type: DOMParserSupportedType = 'application/xml'): Document {
  const doc = new DOMParser().parseFromString(text, type)
  if (type !== 'text/html' && doc.getElementsByTagName('parsererror').length) {
    // Многие EPUB содержат не вполне корректный XHTML — пробуем как HTML.
    return new DOMParser().parseFromString(text, 'text/html')
  }
  return doc
}

function byName(root: Document | Element, name: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter((e) => e.localName === name)
}

export async function parseEpub(buffer: ArrayBuffer): Promise<ImportResult> {
  const zip = readZip(buffer)
  const warnings: string[] = []

  const container = parseXml(await readText(zip, 'META-INF/container.xml'))
  const opfPath = byName(container, 'rootfile')[0]?.getAttribute('full-path')
  if (!opfPath) throw new Error('В EPUB не найден файл описания книги (OPF)')
  const opf = parseXml(await readText(zip, opfPath))

  const bookTitle = byName(opf, 'title')[0]?.textContent?.trim() || undefined
  const manifest = new Map<string, { path: string; type: string; props: string }>()
  for (const item of byName(opf, 'item')) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (id && href) {
      manifest.set(id, {
        path: resolvePath(opfPath, href),
        type: item.getAttribute('media-type') ?? '',
        props: item.getAttribute('properties') ?? '',
      })
    }
  }
  const typeByPath = new Map([...manifest.values()].map((m) => [m.path, m.type]))

  const spineEl = byName(opf, 'spine')[0]
  const spine = byName(opf, 'itemref')
    .map((ref) => manifest.get(ref.getAttribute('idref') ?? ''))
    .filter((m): m is { path: string; type: string; props: string } => Boolean(m && /html|xml/.test(m.type)))

  // Оглавление: путь файла → первое название.
  const toc = new Map<string, string>()
  const tocCount = new Map<string, number>()
  const addToc = (href: string | null, label: string, base: string) => {
    if (!href || !label) return
    const path = resolvePath(base, href)
    tocCount.set(path, (tocCount.get(path) ?? 0) + 1)
    if (!toc.has(path)) toc.set(path, label.replace(/\s+/g, ' ').trim())
  }
  const navItem = [...manifest.values()].find((m) => m.props.split(/\s+/).includes('nav'))
  if (navItem && zip.has(navItem.path)) {
    const nav = parseXml(await readText(zip, navItem.path))
    const navEl = byName(nav, 'nav').find((n) => (n.getAttribute('epub:type') ?? n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') ?? '').includes('toc')) ?? byName(nav, 'nav')[0]
    for (const a of navEl ? byName(navEl, 'a') : []) addToc(a.getAttribute('href'), a.textContent ?? '', navItem.path)
  }
  if (!toc.size) {
    const ncxId = spineEl?.getAttribute('toc')
    const ncx = (ncxId && manifest.get(ncxId)) || [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml')
    if (ncx && zip.has(ncx.path)) {
      const doc = parseXml(await readText(zip, ncx.path))
      for (const point of byName(doc, 'navPoint')) {
        const label = byName(point, 'text')[0]?.textContent ?? ''
        const src = byName(point, 'content')[0]?.getAttribute('src') ?? null
        addToc(src, label, ncx.path)
      }
    }
  }

  const images = new Map<string, ImportedImage>()
  const pendingImages = new Map<string, string>()
  const chapters: ImportedChapter[] = []
  let current: { title: string; lines: string[] } | null = null
  const startChapter = (title: string) => {
    current = { title, lines: [] }
    chapters.push(current as unknown as ImportedChapter)
  }

  for (const item of spine) {
    if (!zip.has(item.path)) continue
    const doc = parseXml(await readText(zip, item.path), item.type.includes('html') && !item.type.includes('xhtml') ? 'text/html' : 'application/xhtml+xml')
    const body = byName(doc, 'body')[0] ?? doc.documentElement
    const segments = htmlToSegments(body, (src) => {
      const path = resolvePath(item.path, src)
      if (!zip.has(path)) return null
      const key = `${IMAGE_PLACEHOLDER}${path}`
      pendingImages.set(key, path)
      return key
    })

    const label = toc.get(item.path)
    const splitByHeadings = !toc.size || (tocCount.get(item.path) ?? 0) > 1

    segments.forEach((seg, i) => {
      if (i === 0 && label && !splitByHeadings) {
        startChapter(label)
      } else if (seg.title && (splitByHeadings || (i === 0 && label))) {
        startChapter(seg.title)
      } else if (i === 0 && label) {
        startChapter(label)
      } else if (seg.title) {
        if (!current) startChapter(seg.title)
        else current.lines.push(`## ${seg.title}`)
      } else if (!current && seg.lines.length) {
        startChapter('Вступление')
      }
      current?.lines.push(...seg.lines)
    })
  }

  for (const [key, path] of pendingImages) {
    const entry = zip.get(path)!
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    images.set(key, { key, type: typeByPath.get(path) || MIME_BY_EXT[ext] || 'application/octet-stream', data: await entry.read() })
  }

  const result: ImportedChapter[] = (chapters as unknown as { title: string; lines: string[] }[]).map((ch) => {
    const content = normalizeContent(ch.lines.join('\n'))
    const textOnly = content.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    const words = (textOnly.match(/[\p{L}\p{N}]+/gu) ?? []).length
    const onlyImages = words < 5 && content.includes('](mc-image:')
    return {
      title: ch.title.slice(0, 200) || 'Без названия',
      content,
      include: Boolean(content) && !SERVICE_TITLE.test(ch.title) && !(onlyImages && (ch.title === 'Вступление' || /обложк|cover/i.test(ch.title))),
    }
  })

  if (!result.length) warnings.push('В EPUB не нашлось текста глав.')
  return { bookTitle, chapters: result, images, warnings }
}
