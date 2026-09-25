import { parseEpub } from './epub'
import { parseFb2 } from './fb2'
import { htmlToSegments } from './html'
import { normalizeContent, parsePlainText, type ImportedChapter, type ImportResult } from './text'
import { readZip } from './zip'

export type { ImportedChapter, ImportedImage, ImportResult } from './text'
export { IMAGE_PLACEHOLDER } from './text'

export const ACCEPTED_FILES = '.epub,.fb2,.zip,.txt,.md,.markdown,.html,.htm'

/** Текст в UTF-8 или (для старых русских файлов) в Windows-1251. */
export function decodeText(bytes: Uint8Array): string {
  const head = new TextDecoder('ascii').decode(bytes.subarray(0, 200))
  const declared = /encoding=["']([\w-]+)["']/i.exec(head)?.[1]
  if (declared && !/utf-?8/i.test(declared)) {
    try {
      return new TextDecoder(declared.toLowerCase()).decode(bytes)
    } catch {
      // неизвестная кодировка — попробуем ниже
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1251').decode(bytes)
  }
}

/** «03_Глава 2. Остров.txt» → «Глава 2. Остров». */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
  const stripped = base.replace(/^\d+[\s.)-]*/, '').trim()
  return stripped || base || 'Глава'
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' })
}

async function importOne(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase()
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (name.endsWith('.epub')) return parseEpub(bytes.buffer)

  if (name.endsWith('.zip')) {
    const zip = readZip(bytes.buffer)
    const fb2 = [...zip.values()].find((e) => e.name.toLowerCase().endsWith('.fb2'))
    if (fb2) return parseFb2(decodeText(await fb2.read()))
    if (zip.has('META-INF/container.xml')) return parseEpub(bytes.buffer)
    throw new Error('В архиве нет FB2 или EPUB')
  }

  if (name.endsWith('.fb2')) return parseFb2(decodeText(bytes))

  if (name.endsWith('.html') || name.endsWith('.htm')) {
    const doc = new DOMParser().parseFromString(decodeText(bytes), 'text/html')
    const segments = htmlToSegments(doc.body, () => null)
    const chapters: ImportedChapter[] = segments
      .map((s, i) => ({
        title: s.title ?? (i === 0 ? titleFromFileName(file.name) : `Часть ${i + 1}`),
        content: normalizeContent(s.lines.join('\n')),
        include: true,
      }))
      .filter((c) => c.content)
    return { chapters, images: new Map(), warnings: [] }
  }

  if (/\.(txt|md|markdown)$/.test(name)) {
    const result = parsePlainText(decodeText(bytes), titleFromFileName(file.name))
    return result
  }

  throw new Error(`Формат файла «${file.name}» не поддерживается. Подойдут EPUB, FB2, TXT, MD или HTML.`)
}

/** Несколько файлов склеиваются по порядку имён (01, 02, … 10). */
export async function importFiles(files: File[]): Promise<ImportResult> {
  const sorted = [...files].sort((a, b) => naturalCompare(a.name, b.name))
  const merged: ImportResult = { chapters: [], images: new Map(), warnings: [] }
  for (const file of sorted) {
    const result = await importOne(file)
    merged.bookTitle ??= result.bookTitle
    merged.chapters.push(...result.chapters)
    for (const [k, v] of result.images) merged.images.set(k, v)
    merged.warnings.push(...result.warnings.map((w) => (files.length > 1 ? `${file.name}: ${w}` : w)))
  }
  return merged
}
