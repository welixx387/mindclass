/**
 * Очки классов на конец каждого тома.
 *
 * Классы параллели Аянокодзи называются по лидерам: буква класса (A–D)
 * меняется вместе с расстановкой по очкам, а лидер — нет. Поэтому для
 * каждого тома хранится буква и очки каждого из четырёх классов.
 * Основа — данные с You-Zitsu Wiki (src/data/classPoints.ts). Администратор
 * может поправить или скрыть любой том («Админка → Очки классов»): правки
 * лежат в таблице site_settings под ключом class_points и важнее основы.
 */

import { ALL_VOLUMES, getVolume, type Volume } from '../data/catalog'
import type { ClassLetter } from './types'

export const CLASS_POINTS_KEY = 'class_points'

export type ClassGroup = 'sakayanagi' | 'ichinose' | 'ryuen' | 'horikita'

export interface ClassGroupInfo {
  id: ClassGroup
  name: string
  /** Буква, с которой класс начал первый год. */
  start: ClassLetter
  tag?: string
}

export const CLASS_GROUPS: ClassGroupInfo[] = [
  { id: 'sakayanagi', name: 'Класс Сакаянаги', start: 'A' },
  { id: 'ichinose', name: 'Класс Итиносэ', start: 'B' },
  { id: 'ryuen', name: 'Класс Рюэна', start: 'C' },
  { id: 'horikita', name: 'Класс Хорикиты', start: 'D', tag: 'класс Аянокодзи' },
]

export const LETTERS: ClassLetter[] = ['A', 'B', 'C', 'D']
export const MAX_POINTS = 99_999

export interface Standing {
  letter: ClassLetter
  points: number
}

export type VolumePoints = Record<ClassGroup, Standing>
/** Очки по томам. */
export type ClassPointsMap = Record<string, VolumePoints>
/** Правки администратора: том → свои очки или null («не показывать этот том»). */
export type StoredClassPoints = Record<string, VolumePoints | null>

function parseStanding(value: unknown): Standing | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.letter !== 'string' || !LETTERS.includes(v.letter as ClassLetter)) return null
  if (typeof v.points !== 'number' || !Number.isFinite(v.points)) return null
  const points = Math.round(v.points)
  if (points < 0 || points > MAX_POINTS) return null
  return { letter: v.letter as ClassLetter, points }
}

/** Очки одного тома: все четыре класса, у каждого своя буква. */
export function parseVolumePoints(value: unknown): VolumePoints | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const result = {} as VolumePoints
  for (const group of CLASS_GROUPS) {
    const standing = parseStanding(v[group.id])
    if (!standing) return null
    result[group.id] = standing
  }
  if (new Set(CLASS_GROUPS.map((g) => result[g.id].letter)).size !== CLASS_GROUPS.length) return null
  return result
}

/** Проверяет значение из базы: неизвестные тома и неполные записи отбрасываются. */
export function parseClassPoints(value: unknown): StoredClassPoints {
  const out: StoredClassPoints = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [slug, entry] of Object.entries(value)) {
    if (!getVolume(slug)) continue
    if (entry === null) {
      out[slug] = null
      continue
    }
    const parsed = parseVolumePoints(entry)
    if (parsed) out[slug] = parsed
  }
  return out
}

/** Итоговые очки: основа, поверх неё правки администратора; null убирает том. */
export function mergeClassPoints(defaults: ClassPointsMap, stored: StoredClassPoints): ClassPointsMap {
  const merged: ClassPointsMap = { ...defaults }
  for (const [slug, entry] of Object.entries(stored)) {
    if (entry) merged[slug] = entry
    else delete merged[slug]
  }
  return merged
}

export interface StandingRow {
  group: ClassGroupInfo
  letter: ClassLetter
  points: number
  /** Изменение с прошлого тома, где очки известны; null — сравнивать не с чем. */
  delta: number | null
  /** Буква в прошлом томе, если она сменилась. */
  previousLetter: ClassLetter | null
  /** Доля от лучшего результата тома — длина полосы. */
  share: number
}

export interface VolumeStandings {
  rows: StandingRow[]
  /** Том, с которым сравниваются изменения. */
  previous: Volume | null
}

/** Ближайший предыдущий том (по порядку чтения), для которого внесены очки. */
export function previousWithPoints(slug: string, map: ClassPointsMap): Volume | null {
  const index = ALL_VOLUMES.findIndex((v) => v.slug === slug)
  for (let i = index - 1; i >= 0; i--) {
    if (map[ALL_VOLUMES[i].slug]) return ALL_VOLUMES[i]
  }
  return null
}

/** Таблица тома: классы по убыванию очков, с изменениями относительно прошлого тома. */
export function volumeStandings(slug: string, map: ClassPointsMap): VolumeStandings | null {
  const current = map[slug]
  if (!current) return null
  const previous = previousWithPoints(slug, map)
  const before = previous ? map[previous.slug] : null
  const best = Math.max(...CLASS_GROUPS.map((g) => current[g.id].points))
  const rows = CLASS_GROUPS.map((group): StandingRow => {
    const { letter, points } = current[group.id]
    const old = before?.[group.id]
    return {
      group,
      letter,
      points,
      delta: old ? points - old.points : null,
      previousLetter: old && old.letter !== letter ? old.letter : null,
      share: best > 0 ? points / best : 0,
    }
  })
  rows.sort((a, b) => b.points - a.points || a.letter.localeCompare(b.letter))
  return { rows, previous }
}

/** Изменение со знаком: «+64», «−120», «±0». */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta.toLocaleString('ru-RU')}`
  if (delta < 0) return `−${Math.abs(delta).toLocaleString('ru-RU')}`
  return '±0'
}
