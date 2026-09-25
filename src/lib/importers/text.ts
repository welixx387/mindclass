/**
 * Разбиение простого текста (TXT / Markdown) на главы по заголовкам.
 */

export interface ImportedImage {
  /** Ключ, который стоит в тексте как `![подпись](mc-image:<ключ>)`. */
  key: string
  type: string
  data: Uint8Array
}

export interface ImportedChapter {
  title: string
  content: string
  /** Выбрана ли глава для импорта (короткие служебные куски — нет). */
  include: boolean
}

export interface ImportResult {
  bookTitle?: string
  chapters: ImportedChapter[]
  images: Map<string, ImportedImage>
  warnings: string[]
}

export const IMAGE_PLACEHOLDER = 'mc-image:'

const ORDINALS =
  'первая|вторая|третья|четв[её]ртая|пятая|шестая|седьмая|восьмая|девятая|десятая|одиннадцатая|двенадцатая|тринадцатая|четырнадцатая|пятнадцатая|шестнадцатая|семнадцатая|восемнадцатая|девятнадцатая|двадцатая'

const SPECIAL = 'пролог|эпилог|интерлюдия|послесловие|предисловие|вступление|от автора|бонус(?:ная история)?|дополнительная история|побочная история|экстра|спецглава|специальная глава'

const HEADING_RES = [
  new RegExp(`^(?:${SPECIAL})(?:$|[\\s.:,—–-])`, 'i'),
  new RegExp(`^(?:глава|часть)\\s+(?:\\d+(?:[.,]\\d+)?|[ivxlcdm]+|${ORDINALS})(?:$|[\\s.:,—–-])`, 'i'),
  /^(?:chapter|prologue|epilogue|afterword|interlude|side story)\b/i,
]

/** Похожа ли строка на заголовок главы. */
export function isChapterHeading(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 110) return false
  return HEADING_RES.some((re) => re.test(text))
}

export function countWordsQuick(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length
}

/** Выбрасывает лишние пустые строки, подрезает пробелы. */
export function normalizeContent(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitPlainText(raw: string, fallbackTitle = 'Глава'): ImportedChapter[] {
  const lines = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  const chapters: { title: string; lines: string[] }[] = []
  let preface: string[] = []
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    const md = /^#{1,2}\s+(.+)$/.exec(line.trim())
    const title = md ? md[1].trim() : isChapterHeading(line) ? line.trim() : null
    if (title) {
      current = { title: title.replace(/\s+/g, ' ').slice(0, 200), lines: [] }
      chapters.push(current)
      continue
    }
    // ### внутри главы становится подзаголовком разметки сайта.
    const sub = /^#{3,6}\s+(.+)$/.exec(line.trim())
    const out = sub ? `## ${sub[1]}` : line
    if (current) current.lines.push(out)
    else preface.push(out)
  }

  const result: ImportedChapter[] = []
  const prefaceText = normalizeContent(preface.join('\n'))
  if (prefaceText) {
    const words = countWordsQuick(prefaceText)
    if (!chapters.length) {
      return [{ title: fallbackTitle, content: prefaceText, include: true }]
    }
    result.push({ title: 'Вступление', content: prefaceText, include: words >= 150 })
  }
  preface = []

  for (const ch of chapters) {
    const content = normalizeContent(ch.lines.join('\n'))
    result.push({ title: ch.title, content, include: content.length > 0 })
  }
  return result
}

export function parsePlainText(raw: string, fileName = ''): ImportResult {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  const chapters = splitPlainText(raw, base || 'Глава')
  const warnings: string[] = []
  if (chapters.length === 1 && countWordsQuick(chapters[0].content) > 15000) {
    warnings.push('В файле не нашлось заголовков глав — весь текст станет одной главой. Добавьте строки вида «Глава 1» или «# Название».')
  }
  return { chapters, images: new Map(), warnings }
}
