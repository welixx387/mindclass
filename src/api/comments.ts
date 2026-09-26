import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getVolume, volumeFullTitle } from '../data/catalog'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { CommentRow } from '../lib/types'
import { useViewerKey } from '../store/auth'
import { fetchChaptersByIds } from './chapters'

export const COMMENT_COLUMNS =
  'id, target, user_id, parent_id, body, like_count, created_at, edited_at, author:profiles!comments_user_id_fkey(id, username, class_letter, avatar_color, role)'

export type CommentSort = 'new' | 'top' | 'old'
export const COMMENTS_PAGE = 20

export interface CommentThread {
  root: CommentRow
  replies: CommentRow[]
}

interface ThreadsPage {
  threads: CommentThread[]
  nextPage?: number
}

export function volumeTarget(slug: string) {
  return `volume:${slug}`
}

export function chapterTarget(id: number) {
  return `chapter:${id}`
}

async function fetchThreads(target: string, sort: CommentSort, page: number): Promise<ThreadsPage> {
  const client = requireSupabase()
  let query = client.from('comments').select(COMMENT_COLUMNS).eq('target', target).is('parent_id', null)
  if (sort === 'top') query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false })
  else query = query.order('created_at', { ascending: sort === 'old' }).order('id', { ascending: sort === 'old' })
  const from = page * COMMENTS_PAGE
  const { data: roots, error } = await query.range(from, from + COMMENTS_PAGE - 1)
  if (error) throw error

  const rootRows = roots as unknown as CommentRow[]
  const ids = rootRows.map((r) => r.id)
  let replies: CommentRow[] = []
  if (ids.length) {
    const { data, error: repliesError } = await client
      .from('comments')
      .select(COMMENT_COLUMNS)
      .in('parent_id', ids)
      .order('created_at', { ascending: true })
    if (repliesError) throw repliesError
    replies = data as unknown as CommentRow[]
  }

  return {
    threads: rootRows.map((root) => ({ root, replies: replies.filter((r) => r.parent_id === root.id) })),
    nextPage: rootRows.length === COMMENTS_PAGE ? page + 1 : undefined,
  }
}

export function useCommentThreads(target: string, sort: CommentSort) {
  return useInfiniteQuery({
    queryKey: ['comments', target, sort],
    queryFn: ({ pageParam }) => fetchThreads(target, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    enabled: isSupabaseConfigured,
  })
}

export function useCommentCount(target: string) {
  return useQuery({
    queryKey: ['comment-count', target],
    queryFn: async () => {
      const { count, error } = await requireSupabase()
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('target', target)
      if (error) throw error
      return count ?? 0
    },
    enabled: isSupabaseConfigured,
  })
}

export function useCommentCounts(targets: string[]) {
  return useQuery({
    queryKey: ['comment-counts', targets.join('|')],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('comment_counts').select('target, count').in('target', targets)
      if (error) throw error
      return new Map((data as { target: string; count: number }[]).map((r) => [r.target, r.count]))
    },
    enabled: isSupabaseConfigured && targets.length > 0,
    staleTime: 60_000,
  })
}

export function useMyLikes(commentIds: number[]) {
  const viewer = useViewerKey()
  const sorted = [...commentIds].sort((a, b) => a - b)
  return useQuery({
    queryKey: ['my-likes', viewer, sorted.join(',')],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('comment_likes').select('comment_id').in('comment_id', sorted)
      if (error) throw error
      return new Set((data as { comment_id: number }[]).map((r) => r.comment_id))
    },
    enabled: isSupabaseConfigured && viewer !== 'guest' && sorted.length > 0,
    placeholderData: (prev) => prev,
  })
}

export async function postComment(input: { target: string; body: string; parentId?: number | null }): Promise<CommentRow> {
  const { data, error } = await requireSupabase()
    .from('comments')
    .insert({ target: input.target, body: input.body.trim(), parent_id: input.parentId ?? null })
    .select(COMMENT_COLUMNS)
    .single()
  if (error) throw error
  return data as unknown as CommentRow
}

export async function editComment(id: number, body: string): Promise<CommentRow> {
  const { data, error } = await requireSupabase()
    .from('comments')
    .update({ body: body.trim() })
    .eq('id', id)
    .select(COMMENT_COLUMNS)
    .single()
  if (error) throw error
  return data as unknown as CommentRow
}

export async function deleteComment(id: number): Promise<void> {
  const { data, error } = await requireSupabase().from('comments').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Не удалось удалить комментарий — нет прав или он уже удалён')
}

export async function setLike(commentId: number, liked: boolean): Promise<void> {
  const client = requireSupabase()
  const { error } = liked
    ? await client.from('comment_likes').insert({ comment_id: commentId })
    : await client.from('comment_likes').delete().eq('comment_id', commentId)
  // Повторный лайк (например, с другой вкладки) — не ошибка.
  if (error && error.code !== '23505') throw error
}

export interface CommentWithPlace extends CommentRow {
  placeTitle: string
  placeSubtitle: string
  href: string
}

/** Где оставлен комментарий: название и ссылка. */
async function withPlaces(rows: CommentRow[]): Promise<CommentWithPlace[]> {
  const chapterIds = [
    ...new Set(rows.filter((r) => r.target.startsWith('chapter:')).map((r) => Number(r.target.slice(8)))),
  ]
  const chapters = new Map((await fetchChaptersByIds(chapterIds)).map((c) => [c.id, c]))
  return rows.map((row) => {
    if (row.target.startsWith('volume:')) {
      const volume = getVolume(row.target.slice(7))
      return {
        ...row,
        placeTitle: volume ? volumeFullTitle(volume) : 'Том',
        placeSubtitle: 'Обсуждение тома',
        href: volume ? `/volume/${volume.slug}#comments` : '/',
      }
    }
    const id = Number(row.target.slice(8))
    const chapter = chapters.get(id)
    const volume = chapter ? getVolume(chapter.volume_slug) : undefined
    return {
      ...row,
      placeTitle: chapter?.title ?? 'Глава',
      placeSubtitle: volume ? volumeFullTitle(volume) : '',
      href: `/read/${id}#comments`,
    }
  })
}

export function useRecentComments(limit = 6) {
  return useQuery({
    queryKey: ['comments', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('comments')
        .select(COMMENT_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return withPlaces(data as unknown as CommentRow[])
    },
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  })
}

export function useUserComments(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['comments', 'user', userId, limit],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('comments')
        .select(COMMENT_COLUMNS)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return withPlaces(data as unknown as CommentRow[])
    },
    enabled: isSupabaseConfigured && Boolean(userId),
  })
}
