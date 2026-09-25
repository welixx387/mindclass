import { describe, expect, it } from 'vitest'
import { parseEpub } from './epub'
import { parseFb2 } from './fb2'
import { decodeText, titleFromFileName } from './index'
import { isChapterHeading, splitPlainText } from './text'
import { resolvePath } from './zip'

// ---------------------------------------------------------------------------
// Маленький ZIP-писатель для тестов (без CRC — наш читатель его не проверяет).
// ---------------------------------------------------------------------------

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(data as BodyInit).body!.pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function makeZip(files: { name: string; text: string | Uint8Array; deflate?: boolean }[]): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const raw = typeof f.text === 'string' ? enc.encode(f.text) : f.text
    const data = f.deflate ? await deflateRaw(raw) : raw
    const name = enc.encode(f.name)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)
    local.setUint16(8, f.deflate ? 8 : 0, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, name.length, true)
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, f.deflate ? 8 : 0, true)
    cd.setUint32(20, data.length, true)
    cd.setUint32(24, raw.length, true)
    cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    chunks.push(new Uint8Array(local.buffer), name, data)
    central.push(new Uint8Array(cd.buffer), name)
    offset += 30 + name.length + data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(8, files.length, true)
  eocd.setUint16(10, files.length, true)
  eocd.setUint32(12, cdSize, true)
  eocd.setUint32(16, offset, true)
  const all = [...chunks, ...central, new Uint8Array(eocd.buffer)]
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0))
  let pos = 0
  for (const c of all) {
    out.set(c, pos)
    pos += c.length
  }
  return out.buffer
}

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])

const xhtml = (body: string) =>
  `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head><body>${body}</body></html>`

describe('plain text import', () => {
  it('detects chapter headings but not ordinary sentences', () => {
    expect(isChapterHeading('Пролог')).toBe(true)
    expect(isChapterHeading('Глава 12. Новая неделя')).toBe(true)
    expect(isChapterHeading('Глава IV — Возвращение')).toBe(true)
    expect(isChapterHeading('Глава вторая')).toBe(true)
    expect(isChapterHeading('Послесловие автора')).toBe(true)
    expect(isChapterHeading('Глава была интересной, сказал он.')).toBe(false)
    expect(isChapterHeading('Прологом это назвать сложно')).toBe(false)
  })

  it('splits text into chapters and keeps a short preface unchecked', () => {
    const text = [
      'Тестовая книга',
      'Перевод: команда',
      '',
      'Пролог',
      'Первая строка пролога.',
      '',
      'Глава 1. Начало',
      'Текст первой главы.',
      '### Подраздел',
      'Ещё текст.',
      'Глава вторая',
      'Глава была интересной, сказал он.',
      'Эпилог',
      'Конец.',
    ].join('\n')
    const chapters = splitPlainText(text)
    expect(chapters.map((c) => c.title)).toEqual(['Вступление', 'Пролог', 'Глава 1. Начало', 'Глава вторая', 'Эпилог'])
    expect(chapters[0].include).toBe(false)
    expect(chapters[2].content).toBe('Текст первой главы.\n## Подраздел\nЕщё текст.')
    expect(chapters[3].content).toBe('Глава была интересной, сказал он.')
  })

  it('uses markdown headings and falls back to one chapter', () => {
    expect(splitPlainText('# Один\nа\n## Два\nб').map((c) => c.title)).toEqual(['Один', 'Два'])
    const single = splitPlainText('Просто текст без заголовков.', 'Мой файл')
    expect(single).toEqual([{ title: 'Мой файл', content: 'Просто текст без заголовков.', include: true }])
  })

  it('decodes windows-1251 and cleans file names', () => {
    const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2])
    expect(decodeText(cp1251)).toBe('Привет')
    expect(decodeText(new TextEncoder().encode('Привет'))).toBe('Привет')
    expect(titleFromFileName('03_Глава 2. Остров.txt')).toBe('Глава 2. Остров')
    expect(titleFromFileName('2.txt')).toBe('2')
  })
})

describe('fb2 import', () => {
  const fb2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description><title-info><book-title>Тестовый том</book-title></title-info></description>
  <body>
    <section>
      <title><p>Глава 1</p><p>Знакомство</p></title>
      <p>Обычный <emphasis>курсивный</emphasis> и <strong>жирный</strong> текст.</p>
      <subtitle>* * *</subtitle>
      <p>После разрыва.</p>
      <image l:href="#img1"/>
      <cite><p>Цитата из письма</p></cite>
    </section>
    <section>
      <title><p>Часть первая</p></title>
      <section>
        <title><p>Глава 2</p></title>
        <p>Вложенная глава.</p>
      </section>
    </section>
  </body>
  <body name="notes"><section><p>Сноска</p></section></body>
  <binary id="img1" content-type="image/png">${btoa(String.fromCharCode(...PNG))}</binary>
</FictionBook>`

  it('turns sections into chapters with formatting, breaks and images', () => {
    const result = parseFb2(fb2)
    expect(result.bookTitle).toBe('Тестовый том')
    expect(result.chapters.map((c) => c.title)).toEqual(['Глава 1. Знакомство', 'Глава 2'])
    expect(result.chapters[0].content).toBe(
      'Обычный *курсивный* и **жирный** текст.\n***\nПосле разрыва.\n![](mc-image:img1)\n> Цитата из письма'
    )
    expect(result.chapters[1].content).toBe('Вложенная глава.')
    expect([...result.images.get('mc-image:img1')!.data]).toEqual([...PNG])
    expect(result.warnings.some((w) => w.includes('Сноски'))).toBe(true)
  })

  it('rejects broken xml', () => {
    expect(() => parseFb2('<FictionBook><body>')).toThrow()
  })
})

describe('epub import', () => {
  it('resolves relative paths', () => {
    expect(resolvePath('OEBPS/text/ch1.xhtml', '../img/a%20b.png#x')).toBe('OEBPS/img/a b.png')
    expect(resolvePath('content.opf', 'text/ch1.xhtml')).toBe('text/ch1.xhtml')
  })

  it('reads spine order, toc titles, formatting and images', async () => {
    const zip = await makeZip([
      { name: 'mimetype', text: 'application/epub+zip' },
      {
        name: 'META-INF/container.xml',
        text: '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
      },
      {
        name: 'OEBPS/content.opf',
        text: `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Тестовая книга</dc:title></metadata>
          <manifest>
            <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
            <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>
            <item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
            <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
            <item id="pic" href="img/pic.png" media-type="image/png"/>
          </manifest>
          <spine><itemref idref="cover"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
      },
      {
        name: 'OEBPS/nav.xhtml',
        text: xhtml(
          '<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><ol><li><a href="text/ch1.xhtml">Глава 1</a></li><li><a href="text/ch2.xhtml#start">Глава 2</a></li></ol></nav>'
        ),
      },
      { name: 'OEBPS/text/cover.xhtml', text: xhtml('<div><img src="../img/pic.png" alt="Обложка"/></div>') },
      {
        name: 'OEBPS/text/ch1.xhtml',
        text: xhtml(
          '<h1>Глава 1</h1><p>Первый <em>абзац</em>.</p><p>* * *</p><p>Второй абзац<br/>с переносом.</p><blockquote><p>Сообщение</p></blockquote><p><img src="../img/pic.png" alt="Рисунок"/></p>'
        ),
        deflate: true,
      },
      { name: 'OEBPS/text/ch2.xhtml', text: xhtml('<h2 id="start">Глава 2</h2><p>Текст второй главы.</p><h3>Подзаголовок</h3><p>Ещё.</p>'), deflate: true },
      { name: 'OEBPS/img/pic.png', text: PNG },
    ])

    const result = await parseEpub(zip)
    expect(result.bookTitle).toBe('Тестовая книга')
    expect(result.chapters.map((c) => [c.title, c.include])).toEqual([
      ['Вступление', false],
      ['Глава 1', true],
      ['Глава 2', true],
    ])
    expect(result.chapters[1].content).toBe(
      'Первый *абзац*.\n***\nВторой абзац\nс переносом.\n> Сообщение\n![Рисунок](mc-image:OEBPS/img/pic.png)'
    )
    expect(result.chapters[2].content).toBe('Текст второй главы.\n## Подзаголовок\nЕщё.')
    expect([...result.images.get('mc-image:OEBPS/img/pic.png')!.data]).toEqual([...PNG])
  })

  it('splits by headings when the book has no table of contents', async () => {
    const zip = await makeZip([
      {
        name: 'META-INF/container.xml',
        text: '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>',
      },
      {
        name: 'book.opf',
        text: '<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="a" href="all.html" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>',
      },
      { name: 'all.html', text: xhtml('<h1>Пролог</h1><p>Раз.</p><h1>Глава 1</h1><p>Два.</p><h2>Глава 2</h2><p>Три.</p>') },
    ])
    const result = await parseEpub(zip)
    expect(result.chapters.map((c) => [c.title, c.content])).toEqual([
      ['Пролог', 'Раз.'],
      ['Глава 1', 'Два.'],
      ['Глава 2', 'Три.'],
    ])
  })
})
