import { describe, expect, it } from 'vitest'
import { ALL_VOLUMES } from '../data/catalog'
import { CLASS_POINTS } from '../data/classPoints'
import {
  formatDelta,
  mergeClassPoints,
  parseClassPoints,
  parseVolumePoints,
  previousWithPoints,
  volumeStandings,
  type VolumePoints,
} from './classPoints'

const points = (a: number, b: number, c: number, d: number): VolumePoints => ({
  sakayanagi: { letter: 'A', points: a },
  ichinose: { letter: 'B', points: b },
  ryuen: { letter: 'C', points: c },
  horikita: { letter: 'D', points: d },
})

describe('parseClassPoints', () => {
  it('keeps complete entries for known volumes', () => {
    const map = parseClassPoints({ 'y1-v1': points(940, 650, 490, 0) })
    expect(map['y1-v1']?.horikita).toEqual({ letter: 'D', points: 0 })
  })

  it('drops unknown volumes, missing classes, bad numbers and repeated letters', () => {
    const repeated = { ...points(1, 2, 3, 4), ryuen: { letter: 'A', points: 3 } }
    const map = parseClassPoints({
      'y9-v1': points(1, 2, 3, 4),
      'y1-v2': { sakayanagi: { letter: 'A', points: 5 } },
      'y1-v3': { ...points(1, 2, 3, 4), ichinose: { letter: 'B', points: -5 } },
      'y1-v4': repeated,
      'y1-v5': { ...points(1, 2, 3, 4), ryuen: { letter: 'E', points: 3 } },
    })
    expect(map).toEqual({})
    expect(parseClassPoints(null)).toEqual({})
    expect(parseClassPoints([points(1, 2, 3, 4)])).toEqual({})
  })

  it('rounds fractional points', () => {
    expect(parseVolumePoints(points(10.6, 2, 3, 4))?.sakayanagi.points).toBe(11)
  })
})

describe('volumeStandings', () => {
  const map = {
    'y1-v1': points(940, 650, 490, 0),
    // Том 2 не заполнен — сравнение идёт с первым.
    'y1-v3': {
      ...points(1004, 663, 492, 87),
      ryuen: { letter: 'D' as const, points: 492 },
      horikita: { letter: 'C' as const, points: 87 },
    },
  }

  it('sorts classes by points and measures the bar against the leader', () => {
    const standings = volumeStandings('y1-v1', map)!
    expect(standings.rows.map((r) => r.group.id)).toEqual(['sakayanagi', 'ichinose', 'ryuen', 'horikita'])
    expect(standings.rows[0].share).toBe(1)
    expect(standings.rows[3].share).toBe(0)
    expect(standings.previous).toBeNull()
    expect(standings.rows.every((r) => r.delta === null)).toBe(true)
  })

  it('compares with the nearest earlier volume that has points', () => {
    const standings = volumeStandings('y1-v3', map)!
    expect(standings.previous?.slug).toBe('y1-v1')
    const horikita = standings.rows.find((r) => r.group.id === 'horikita')!
    expect(horikita.delta).toBe(87)
    expect(horikita.previousLetter).toBe('D')
    expect(standings.rows.find((r) => r.group.id === 'sakayanagi')!.previousLetter).toBeNull()
    expect(previousWithPoints('y1-v1', map)).toBeNull()
  })

  it('returns nothing for a volume without points', () => {
    expect(volumeStandings('y1-v2', map)).toBeNull()
  })

  it('formats signed changes', () => {
    expect(formatDelta(64)).toBe('+64')
    expect(formatDelta(-120)).toBe('−120')
    expect(formatDelta(0)).toBe('±0')
    expect(formatDelta(1500)).toBe('+1 500')
  })
})

describe('merging wiki values with admin edits', () => {
  const wiki = { 'y1-v1': points(940, 650, 490, 0), 'y1-v2': points(1, 2, 3, 4) }

  it('keeps null in stored edits and lets it hide a volume', () => {
    const stored = parseClassPoints({ 'y1-v2': null, 'y1-v3': points(5, 6, 7, 8) })
    expect(stored).toEqual({ 'y1-v2': null, 'y1-v3': points(5, 6, 7, 8) })
    const merged = mergeClassPoints(wiki, stored)
    expect(Object.keys(merged).sort()).toEqual(['y1-v1', 'y1-v3'])
  })

  it('prefers the admin value over the wiki', () => {
    expect(mergeClassPoints(wiki, { 'y1-v1': points(1, 1, 1, 88) })['y1-v1'].horikita.points).toBe(88)
  })
})

describe('class points from the wiki', () => {
  it('covers every volume except 1-7.5 and every entry is valid', () => {
    const missing = ALL_VOLUMES.filter((v) => !CLASS_POINTS[v.slug]).map((v) => v.slug)
    expect(missing).toEqual(['y1-v7.5'])
    for (const [slug, entry] of Object.entries(CLASS_POINTS)) {
      expect(parseVolumePoints(entry), slug).toEqual(entry)
    }
  })

  it('matches key figures from the wiki tables', () => {
    const v1 = volumeStandings('y1-v1', CLASS_POINTS)!
    expect(v1.rows.map((r) => `${r.letter}${r.points}`)).toEqual(['A1004', 'B663', 'C492', 'D87'])
    const v8 = volumeStandings('y1-v8', CLASS_POINTS)!
    expect(v8.previous?.slug).toBe('y1-v7')
    expect(v8.rows.find((r) => r.group.id === 'horikita')).toMatchObject({ letter: 'C', points: 377, delta: 15, previousLetter: 'D' })
    const end = volumeStandings('y2-v12', CLASS_POINTS)!
    expect(end.rows[0]).toMatchObject({ letter: 'A', points: 1233, delta: 250 })
  })
})
