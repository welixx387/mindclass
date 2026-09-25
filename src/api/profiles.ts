import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { Profile, SearchHit } from '../lib/types'

const PROFILE_COLUMNS = 'id, username, class_letter, avatar_piece, avatar_color, bio, role, created_at'

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'by-name', username?.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .ilike('username', username!.replace(/[%_\\]/g, (ch) => `\\${ch}`))
        .maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
    enabled: isSupabaseConfigured && Boolean(username),
  })
}

export interface ProfileStats {
  comments: number
  likes: number
  chapters_read: number
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('profile_stats', { p_user: userId })
      if (error) throw error
      return ((data as ProfileStats[])[0] ?? { comments: 0, likes: 0, chapters_read: 0 }) as ProfileStats
    },
    enabled: isSupabaseConfigured && Boolean(userId),
  })
}

export async function isUsernameAvailable(name: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('username_available', { name })
  if (error) throw error
  return data === true
}

/**
 * Поиск по тексту глав: сначала все слова сразу, а если ничего не нашлось —
 * любое из слов.
 */
export async function searchChapters(q: string): Promise<{ hits: SearchHit[]; loose: boolean }> {
  const client = requireSupabase()
  const strict = await client.rpc('search_chapters', { q, max_results: 20 })
  if (strict.error) throw strict.error
  if ((strict.data as SearchHit[]).length) return { hits: strict.data as SearchHit[], loose: false }
  const loose = await client.rpc('search_chapters', { q, max_results: 20, match_any: true })
  if (loose.error) throw loose.error
  return { hits: loose.data as SearchHit[], loose: true }
}

export async function searchChapterTitles(q: string) {
  const escaped = q.replace(/[%_\\]/g, (ch) => `\\${ch}`)
  const { data, error } = await requireSupabase()
    .from('chapters')
    .select('id, title, volume_slug, position')
    .ilike('title', `%${escaped}%`)
    .order('volume_slug')
    .order('position')
    .limit(8)
  if (error) throw error
  return data as Pick<SearchHit, 'id' | 'title' | 'volume_slug' | 'position'>[]
}
