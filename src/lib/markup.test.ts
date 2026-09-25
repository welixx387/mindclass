import { describe, expect, it } from 'vitest'
import { blockText, countWords, excerpt, parseChapter } from './markup'
import { commentPreview, formatCommentBody, hasSpoiler } from './commentFormat'
import { plural, readingTimeLabel } from './format'

describe('parseChapter', () => {
  it('turns every non-empty line into a paragraph', () => {
    const blocks = parseChapter('Первый абзац.\n\n  Второй абзац.  \r\nТретий.')
    expect(blocks).toEqual([
      { type: 'p', html: 'Первый абзац.' },
      { type: 'p', html: 'Второй абзац.' },
      { type: 'p', html: 'Третий.' },
    ])
  })

  it('escapes HTML so chapter text can never inject markup', () => {
    const [block] = parseChapter('<img src=x onerror=alert(1)> & "кавычки"')
    expect(block).toEqual({ type: 'p', html: '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;кавычки&quot;' })
  })

  it('recognises scene breaks in their common spellings and collapses repeats', () => {
    const blocks = parseChapter('А\n***\nБ\n* * *\n◇◇◇\nВ\n———\n')
    expect(blocks.map((b) => b.type)).toEqual(['p', 'break', 'p', 'break', 'p'])
  })

  it('parses headings, centred lines, quotes and images', () => {
    const blocks = parseChapter(
      '## Часть первая\n-> Конец <-\n> Привет!\n> Ты где?\n\n> Отдельная врезка\n![Схема](https://example.com/a.png)\n![x](javascript:alert(1))'
    )
    expect(blocks).toEqual([
      { type: 'heading', html: 'Часть первая' },
      { type: 'center', html: 'Конец' },
      { type: 'quote', html: 'Привет!<br>Ты где?' },
      { type: 'quote', html: 'Отдельная врезка' },
      { type: 'image', src: 'https://example.com/a.png', alt: 'Схема' },
      { type: 'p', html: '![x](javascript:alert(1))' },
    ])
  })

  it('supports bold and italic without touching lone asterisks', () => {
    const [a, b] = parseChapter('Это **важно**, а это *тихо*.\nСноска* и 2*3*4')
    expect(a).toEqual({ type: 'p', html: 'Это <strong>важно</strong>, а это <em>тихо</em>.' })
    expect(b).toEqual({ type: 'p', html: 'Сноска* и 2*3*4' })
  })

  it('extracts plain text and counts words', () => {
    const [block] = parseChapter('— Ну **что**, пойдём? — спросил он &amp; ушёл.')
    expect(blockText(block)).toBe('— Ну что, пойдём? — спросил он &amp; ушёл.')
    expect(countWords('Раз, два — три-четыре. Пять!')).toBe(4)
  })

  it('builds short excerpts on word boundaries', () => {
    expect(excerpt('коротко')).toBe('коротко')
    const long = 'слово '.repeat(60)
    const cut = excerpt(long, 50)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.length).toBeLessThanOrEqual(51)
  })
})

describe('formatCommentBody', () => {
  it('escapes html and renders spoilers, emphasis and links', () => {
    const html = formatCommentBody('<b>hi</b> ||он победит|| **да** *нет*\nhttps://example.com/x.')
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;')
    expect(html).toContain('<span class="spoiler"')
    expect(html).toContain('>он победит</span>')
    expect(html).toContain('<strong>да</strong>')
    expect(html).toContain('<em>нет</em>')
    expect(html).toContain('<a href="https://example.com/x" target="_blank"')
    expect(html).toContain('<br>')
  })

  it('does not linkify javascript: or quote-breaking urls', () => {
    const html = formatCommentBody('javascript:alert(1) https://a.b/"onmouseover="x')
    expect(html).not.toContain('href="javascript')
    expect(html).not.toMatch(/href="[^"]*"onmouseover/)
  })

  it('detects spoilers and hides them in previews', () => {
    expect(hasSpoiler('обычный текст')).toBe(false)
    expect(hasSpoiler('а тут ||секрет||')).toBe(true)
    expect(commentPreview('Итог: ||все выжили|| **ура**')).toBe('Итог: [спойлер] ура')
  })
})

describe('format helpers', () => {
  it('declines Russian nouns by number', () => {
    const forms: [string, string, string] = ['глава', 'главы', 'глав']
    expect([1, 2, 5, 11, 21, 22, 25, 111].map((n) => plural(n, forms))).toEqual([
      'глава',
      'главы',
      'глав',
      'глав',
      'глава',
      'главы',
      'глав',
      'глав',
    ])
  })

  it('formats reading time', () => {
    expect(readingTimeLabel(10)).toBe('1 мин')
    expect(readingTimeLabel(180 * 75)).toBe('1 ч 15 мин')
  })
})
