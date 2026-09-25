/**
 * Минимальное чтение ZIP-архивов (для EPUB) без сторонних библиотек:
 * центральный каталог + распаковка deflate через DecompressionStream,
 * который есть во всех современных браузерах.
 */

export interface ZipEntry {
  name: string
  read: () => Promise<Uint8Array>
}

const EOCD = 0x06054b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(data as BodyInit).body!.pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export function readZip(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const utf8 = new TextDecoder('utf-8')

  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Файл не похож на ZIP/EPUB-архив')

  const count = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const entries = new Map<string, ZipEntry>()

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== CENTRAL) throw new Error('Повреждённый архив: неверная запись каталога')
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = utf8.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength

    if (name.endsWith('/')) continue
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('Архивы ZIP64 не поддерживаются')

    entries.set(name, {
      name,
      read: async () => {
        if (view.getUint32(localOffset, true) !== LOCAL) throw new Error(`Повреждённый архив: ${name}`)
        const localName = view.getUint16(localOffset + 26, true)
        const localExtra = view.getUint16(localOffset + 28, true)
        const start = localOffset + 30 + localName + localExtra
        const data = bytes.subarray(start, start + compressedSize)
        if (method === 0) return data.slice()
        if (method === 8) return inflateRaw(data)
        throw new Error(`Неподдерживаемое сжатие (${method}) у файла ${name}`)
      },
    })
  }
  return entries
}

/** Путь относительно файла-источника: resolvePath('OEBPS/text/ch1.xhtml', '../img/a.jpg') → 'OEBPS/img/a.jpg'. */
export function resolvePath(from: string, relative: string): string {
  const clean = decodeURIComponent(relative.split('#')[0].split('?')[0])
  if (clean.startsWith('/')) return clean.slice(1)
  const parts = from.split('/').slice(0, -1)
  for (const segment of clean.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment && segment !== '.') parts.push(segment)
  }
  return parts.join('/')
}
