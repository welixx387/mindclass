import { useQuery } from '@tanstack/react-query'
import { HERO_ART } from '../lib/art'
import { CLASS_POINTS_KEY, parseClassPoints, type ClassPointsMap } from '../lib/classPoints'
import { DEFAULT_CAPTION, HERO_ART_KEY, parseHeroArt, type HeroArtSetting, type HeroPicture } from '../lib/heroArt'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

export const heroArtQueryKey = ['site-settings', HERO_ART_KEY] as const

// Последний известный арт хранится в браузере, чтобы при повторном визите
// карточка сразу показывала картинку, а не мигала талисманом.
const CACHE_KEY = 'mindclass:hero-art'

function readCache(): HeroArtSetting | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw === null ? undefined : parseHeroArt(JSON.parse(raw))
  } catch {
    return undefined
  }
}

function writeCache(art: HeroArtSetting | null) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(art))
  } catch {
    // Хранилище недоступно (приватный режим) — просто без кэша.
  }
}

export async function fetchHeroArt(): Promise<HeroArtSetting | null> {
  const { data, error } = await requireSupabase().from('site_settings').select('value').eq('key', HERO_ART_KEY).maybeSingle()
  if (error) throw error
  const art = parseHeroArt(data?.value)
  writeCache(art)
  return art
}

/** Настройка арта из базы (для админки и для карточек). */
export function useHeroArtSetting() {
  return useQuery({
    queryKey: heroArtQueryKey,
    queryFn: fetchHeroArt,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
    initialData: readCache,
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
