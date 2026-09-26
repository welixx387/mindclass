import { useQuery } from '@tanstack/react-query'
import { HERO_ART } from '../lib/art'
import { CLASS_POINTS_KEY, parseClassPoints, type ClassPointsMap } from '../lib/classPoints'
import { DEFAULT_CAPTION, HERO_ART_KEY, parseHeroArt, type HeroArtSetting, type HeroPicture } from '../lib/heroArt'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import { parseVolumeCovers, VOLUME_COVERS_KEY, type VolumeCoversMap } from '../lib/volumeCovers'

export const heroArtQueryKey = ['site-settings', HERO_ART_KEY] as const

// Последние известные настройки оформления хранятся в браузере, чтобы при
// повторном визите картинки появлялись сразу, а не после запроса к базе.
const HERO_CACHE = 'mindclass:hero-art'
const COVERS_CACHE = 'mindclass:volume-covers'

function readCache<T>(key: string, parse: (value: unknown) => T): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : parse(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Хранилище недоступно (приватный режим) — просто без кэша.
  }
}

export async function fetchHeroArt(): Promise<HeroArtSetting | null> {
  const { data, error } = await requireSupabase().from('site_settings').select('value').eq('key', HERO_ART_KEY).maybeSingle()
  if (error) throw error
  const art = parseHeroArt(data?.value)
  writeCache(HERO_CACHE, art)
  return art
}

/** Настройка арта из базы (для админки и для карточек). */
export function useHeroArtSetting() {
  return useQuery({
    queryKey: heroArtQueryKey,
    queryFn: fetchHeroArt,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
    initialData: () => readCache(HERO_CACHE, parseHeroArt),
    // Кэш из браузера показываем сразу, но всё равно сверяем с базой.
    initialDataUpdatedAt: 0,
  })
}

const BUNDLED: HeroPicture | null = HERO_ART ? { src: HERO_ART, caption: DEFAULT_CAPTION, focusX: 50, focusY: 30 } : null

/**
 * Какую картинку показать в карточке героя: загруженную через админку,
 * иначе файл из src/assets/art, иначе null — тогда рисуется талисман.
 * undefined — настройки ещё загружаются.
 */
export function useHeroArt(): HeroPicture | null | undefined {
  const { data, isPending, isError } = useHeroArtSetting()
  if (!isSupabaseConfigured) return BUNDLED
  if (data) return { src: data.url, caption: data.caption, focusX: data.focusX, focusY: data.focusY }
  if (isPending && !isError) return undefined
  return BUNDLED
}

export const classPointsQueryKey = ['site-settings', CLASS_POINTS_KEY] as const

export async function fetchClassPoints(): Promise<ClassPointsMap> {
  const { data, error } = await requireSupabase().from('site_settings').select('value').eq('key', CLASS_POINTS_KEY).maybeSingle()
  if (error) throw error
  return parseClassPoints(data?.value)
}

/** Очки классов по томам; пустой объект, пока администратор их не внёс. */
export function useClassPoints() {
  return useQuery({
    queryKey: classPointsQueryKey,
    queryFn: fetchClassPoints,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  })
}

export const volumeCoversQueryKey = ['site-settings', VOLUME_COVERS_KEY] as const

export async function fetchVolumeCovers(): Promise<VolumeCoversMap> {
  const { data, error } = await requireSupabase().from('site_settings').select('value').eq('key', VOLUME_COVERS_KEY).maybeSingle()
  if (error) throw error
  const covers = parseVolumeCovers(data?.value)
  writeCache(COVERS_CACHE, covers)
  return covers
}

/**
 * Загруженные обложки томов. ready — известно ли уже, у каких томов есть
 * картинка: до этого обложка не рисует узор, чтобы он не мелькнул перед ней.
 */
export function useVolumeCovers() {
  const query = useQuery({
    queryKey: volumeCoversQueryKey,
    queryFn: fetchVolumeCovers,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
    initialData: () => readCache(COVERS_CACHE, parseVolumeCovers),
    initialDataUpdatedAt: 0,
  })
  return { covers: query.data, ready: !isSupabaseConfigured || query.data !== undefined || query.isError }
}
