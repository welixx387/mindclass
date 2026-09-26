import { describe, expect, it } from 'vitest'
import { parseVolumeCovers } from './volumeCovers'

describe('parseVolumeCovers', () => {
  it('keeps covers of known volumes', () => {
    const covers = parseVolumeCovers({
      'y1-v1': { url: 'https://x.supabase.co/storage/v1/object/public/illustrations/site/covers/y1-v1-abc.webp', path: 'site/covers/y1-v1-abc.webp' },
      'y2-v12.5': { url: 'http://127.0.0.1:54321/c.png' },
    })
    expect(Object.keys(covers)).toEqual(['y1-v1', 'y2-v12.5'])
    expect(covers['y2-v12.5'].path).toBe('')
  })

  it('drops unknown volumes and unsafe or missing links', () => {
    expect(
      parseVolumeCovers({
        'y9-v1': { url: 'https://a.b/c.png' },
        'y1-v2': { url: 'javascript:alert(1)' },
        'y1-v3': { path: 'site/covers/x.png' },
        'y1-v4': 'https://a.b/c.png',
      }),
    ).toEqual({})
    expect(parseVolumeCovers(null)).toEqual({})
    expect(parseVolumeCovers([{ url: 'https://a.b/c.png' }])).toEqual({})
  })
})

describe('wiki covers', () => {
  it('has a cover for every volume, served scaled from the wiki', async () => {
    const { WIKI_COVERS } = await import('../data/wikiCovers')
    const { ALL_VOLUMES } = await import('../data/catalog')
    expect(ALL_VOLUMES.filter((v) => !WIKI_COVERS[v.slug])).toEqual([])
    for (const url of Object.values(WIKI_COVERS)) {
      expect(url).toMatch(/^https:\/\/static\.wikia\.nocookie\.net\/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e\/images\/.+_cover\.jpg\/revision\/latest\/scale-to-width-down\/\d+\?cb=\d+$/)
    }
  })
})
