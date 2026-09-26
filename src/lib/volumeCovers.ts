/**
 * Обложки томов, загруженные через «Админку → Обложки». Хранятся в таблице
 * site_settings под ключом volume_covers: том → ссылка на картинку и путь
 * файла в Storage (чтобы удалить старый файл при замене).
 */

import { getVolume } from '../data/catalog'

export const VOLUME_COVERS_KEY = 'volume_covers'

export interface VolumeCoverImage {
  url: string
  path: string
}

export type VolumeCoversMap = Record<string, VolumeCoverImage>

/** Проверяет значение из базы: неизвестные тома и подозрительные ссылки отбрасываются. */
export function parseVolumeCovers(value: unknown): VolumeCoversMap {
  const out: VolumeCoversMap = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [slug, entry] of Object.entries(value)) {
    if (!getVolume(slug) || !entry || typeof entry !== 'object') continue
    const { url, path } = entry as Record<string, unknown>
    if (typeof url !== 'string' || !/^https?:\/\/\S+$/i.test(url)) continue
    out[slug] = { url, path: typeof path === 'string' ? path : '' }
  }
  return out
}
