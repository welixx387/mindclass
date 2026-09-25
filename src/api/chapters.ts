import { useQuery } from '@tanstack/react-query'
import { ALL_VOLUMES } from '../data/catalog'
import { DEMO_CHAPTER, DEMO_CHAPTER_ID } from '../data/demoChapter'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { Chapter, ChapterMeta, VolumeStats } from '../lib/types'
import { useViewerKey } from '../store/auth'

export const CHAPTER_META_COLUMNS = 'id, volume_slug, position, title, word_count, is_published, created_at, updated_at'

export async function fetchVolumeChapters(slug: string): Promise<ChapterMeta[]> {
  const { data, error } = await requireSupabase()
    .from('chapters')
    .select(CHAPTER_META_COLUMNS)
    .eq('volume_slug', slug)
    .order('position')
    .order('id')
  if (error) throw error
  return data as ChapterMeta[]
}

export function useVolumeChapters(slug: string | undefined) {
  // Админ видит черновики, поэтому кэш зависит от того, кто смотрит.
  const viewer = useViewerKey()
  return useQuery({
    queryKey: ['chapters', 'volume', slug, viewer],
    queryFn: () => fetchVolumeChapters(slug!),
    enabled: Boolean(slug) && isSupabaseConfigured,
  })
}

export function useChapter(id: number | undefined) {
  const viewer = useViewerKey()
  return useQuery({
    queryKey: ['chapters', 'one', id, viewer],
    queryFn: async (): Promise<Chapter | null> => {
      if (id === DEMO_CHAPTER_ID) return DEMO_CHAPTER
      const { data, error } = await requireSupabase()
        .from('chapters')
        .select(`${CHAPTER_META_COLUMNS}, content`)
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as Chapter | null
    },
    enabled: id !== undefined && Number.isFinite(id) && (id === DEMO_CHAPTER_ID || isSupabaseConfigured),
    staleTime: 5 * 60_000,
  })
}

export function useVolumeStats() {
  return useQuery({
    queryKey: ['volume-stats'],
    queryFn: async (): Promise<Map<string, VolumeStats>> => {
      const { data, error } = await requireSupabase().from('volume_stats').select('*')
      if (error) throw error
      return new Map((data as VolumeStats[]).map((s) => [s.volume_slug, s]))
    },
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  })
}

export function useLatestChapters(limit = 6) {
  return useQuery({
    queryKey: ['chapters', 'latest', limit],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('chapters')
        .select(CHAPTER_META_COLUMNS)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .order('position', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as ChapterMeta[]
    },
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  })
}

export async function fetchChaptersByIds(ids: number[]): Promise<ChapterMeta[]> {
  if (!ids.length) return []
  const { data, error } = await requireSupabase().from('chapters').select(CHAPTER_META_COLUMNS).in('id', ids)
  if (error) throw error
  return data as ChapterMeta[]
}

/**
 * Предыдущая и следующая глава. На границе тома ищется ближайший соседний
 * том, в котором уже есть главы.
 */
export function useChapterNeighbors(chapter: ChapterMeta | null | undefined) {
  const { data: siblings } = useVolumeChapters(chapter && chapter.id > 0 ? chapter.volume_slug : undefined)
  const { data: stats } = useVolumeStats()
  const viewer = useViewerKey()

  const index = siblings && chapter ? siblings.findIndex((c) => c.id === chapter.id) : -1
  const prevInVolume = index > 0 ? siblings![index - 1] : undefined
  const nextInVolume = index >= 0 && siblings && index < siblings.length - 1 ? siblings[index + 1] : undefined

  const volumeIndex = chapter ? ALL_VOLUMES.findIndex((v) => v.slug === chapter.volume_slug) : -1
  const findVolume = (direction: 1 | -1) => {
    if (volumeIndex < 0 || !stats) return undefined
    for (let i = volumeIndex + direction; i >= 0 && i < ALL_VOLUMES.length; i += direction) {
      if ((stats.get(ALL_VOLUMES[i].slug)?.chapters ?? 0) > 0) return ALL_VOLUMES[i].slug
    }
    return undefined
  }
  const needPrevVolume = Boolean(siblings && index === 0)
  const needNextVolume = Boolean(siblings && index === siblings.length - 1)
  const prevVolumeSlug = needPrevVolume ? findVolume(-1) : undefined
  const nextVolumeSlug = needNextVolume ? findVolume(1) : undefined

  const { data: prevVolumeChapters } = useQuery({
    queryKey: ['chapters', 'volume', prevVolumeSlug, viewer],
    queryFn: () => fetchVolumeChapters(prevVolumeSlug!),
    enabled: Boolean(prevVolumeSlug),
  })
  const { data: nextVolumeChapters } = useQuery({
    queryKey: ['chapters', 'volume', nextVolumeSlug, viewer],
    queryFn: () => fetchVolumeChapters(nextVolumeSlug!),
    enabled: Boolean(nextVolumeSlug),
  })

  return {
    prev: prevInVolume ?? prevVolumeChapters?.[prevVolumeChapters.length - 1],
    next: nextInVolume ?? nextVolumeChapters?.[0],
    siblings: siblings ?? [],
  }
}
