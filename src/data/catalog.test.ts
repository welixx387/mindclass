import { describe, expect, it } from 'vitest'
import { ALL_VOLUMES, adjacentVolumes, getVolume, YEARS } from './catalog'
import { AVATAR_MOTIFS, MOTIF_LABELS } from './motifs'

describe('catalog', () => {
  it('lists every volume of the first and second year', () => {
    expect(YEARS.map((y) => y.volumes.map((v) => v.number))).toEqual([
      ['1', '2', '3', '4', '4.5', '5', '6', '7', '7.5', '8', '9', '10', '11', '11.5'],
      ['1', '2', '3', '4', '4.5', '5', '6', '7', '8', '9', '9.5', '10', '11', '12', '12.5'],
    ])
  })

  it('uses unique slugs that match the database format', () => {
    const slugs = ALL_VOLUMES.map((v) => v.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^y[0-9]+-v[0-9]+(\.[0-9]+)?$/)
    expect(getVolume('y2-v12.5')?.kind).toBe('side')
    expect(getVolume('y1-v11')?.kind).toBe('main')
  })

  it('gives every volume a known motif and a description', () => {
    for (const v of ALL_VOLUMES) {
      expect(MOTIF_LABELS[v.motif]).toBeTruthy()
      expect(v.description.length).toBeGreaterThan(20)
    }
    for (const m of AVATAR_MOTIFS) expect(MOTIF_LABELS[m]).toBeTruthy()
  })

  it('links volumes across the year boundary', () => {
    expect(adjacentVolumes('y1-v11.5').next?.slug).toBe('y2-v1')
    expect(adjacentVolumes('y2-v1').prev?.slug).toBe('y1-v11.5')
    expect(adjacentVolumes('y1-v1').prev).toBeUndefined()
  })
})
