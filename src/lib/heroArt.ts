/**
 * Арт для главной страницы и страницы входа, загруженный через
 * «Админку → Оформление». Хранится в таблице site_settings под ключом hero_art.
 */

export const HERO_ART_KEY = 'hero_art'
export const DEFAULT_CAPTION = 'Амасава Итика'
export const CAPTION_MAX = 40

export interface HeroArtSetting {
  url: string
  /** Путь файла в Storage — чтобы удалить старую картинку при замене. */
  path: string
  /** Подпись на стикере карточки. */
  caption: string
  /** Точка кадрирования в процентах: какая часть картинки остаётся в карточке. */
  focusX: number
  focusY: number
}

/** То, что показывает карточка: загруженный арт или картинка из src/assets/art. */
export interface HeroPicture {
  src: string
  caption: string
  focusX: number
  focusY: number
}

function percent(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : fallback
}

/** Проверяет значение из базы; всё подозрительное превращается в «арта нет». */
export function parseHeroArt(value: unknown): HeroArtSetting | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.url !== 'string' || !/^https?:\/\/\S+$/i.test(v.url)) return null
  const caption = typeof v.caption === 'string' ? v.caption.trim().slice(0, CAPTION_MAX) : ''
  return {
    url: v.url,
    path: typeof v.path === 'string' ? v.path : '',
    caption: caption || DEFAULT_CAPTION,
    focusX: percent(v.focusX, 50),
    focusY: percent(v.focusY, 30),
  }
}

export function objectPosition(picture: Pick<HeroPicture, 'focusX' | 'focusY'>): string {
  return `${picture.focusX}% ${picture.focusY}%`
}
