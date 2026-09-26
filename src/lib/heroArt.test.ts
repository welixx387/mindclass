import { describe, expect, it } from 'vitest'
import { DEFAULT_CAPTION, objectPosition, parseHeroArt } from './heroArt'

describe('parseHeroArt', () => {
  it('accepts a stored setting and keeps its values', () => {
    const art = parseHeroArt({ url: 'https://x.supabase.co/storage/v1/object/public/illustrations/site/hero-1.webp', path: 'site/hero-1.webp', caption: ' Итика ', focusX: 40, focusY: 12 })
    expect(art).toEqual({
      url: 'https://x.supabase.co/storage/v1/object/public/illustrations/site/hero-1.webp',
      path: 'site/hero-1.webp',
      caption: 'Итика',
      focusX: 40,
      focusY: 12,
    })
  })

  it('treats missing or unsafe links as no art', () => {
    expect(parseHeroArt(null)).toBeNull()
    expect(parseHeroArt('https://example.com/a.png')).toBeNull()
    expect(parseHeroArt({ caption: 'Без ссылки' })).toBeNull()
    expect(parseHeroArt({ url: 'javascript:alert(1)' })).toBeNull()
    expect(parseHeroArt({ url: 'data:image/png;base64,AAAA' })).toBeNull()
  })

  it('fills defaults and clamps the crop point', () => {
    const art = parseHeroArt({ url: 'http://127.0.0.1:54321/a.png', caption: '', focusX: 140, focusY: -5.4 })
    expect(art?.caption).toBe(DEFAULT_CAPTION)
    expect(art?.path).toBe('')
    expect(art && objectPosition(art)).toBe('100% 0%')
    expect(parseHeroArt({ url: 'https://a.b/c.png', focusX: 'left' })?.focusX).toBe(50)
    expect(parseHeroArt({ url: 'https://a.b/c.png', caption: 'x'.repeat(80) })?.caption).toHaveLength(40)
  })
})
