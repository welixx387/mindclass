import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { localLibrary } from '../lib/localLibrary'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { Bookmark, Progress } from '../lib/types'
import { useAuth, useViewerKey } from '../store/auth'

/*
 * Закладки и прогресс. У гостя — в браузере, у вошедшего — в Supabase.
 * Демо-глава (id < 0) всегда хранится локально.
 */

interface CloudBookmarkRow {
  id: number
  chapter_id: number
  paragraph: number
  excerpt: string
  note: string
  created_at: string
  chapter: { title: string; volume_slug: string; position: number } | null
}

interface CloudProgressRow {
  chapter_id: number
  volume_slug: string
  paragraph: number
  percent: number
  completed: boolean
  updated_at: string
  chapter: { title: string; position: number } | null
}

async function fetchCloudBookmarks(): Promise<Bookmark[]> {
  const { data, error } = await requireSupabase()
    .from('bookmarks')
    .select('id, chapter_id, paragraph, excerpt, note, created_at, chapter:chapters(title, volume_slug, position)')
    .order('created_at', { ascending: false })
  if (error) throw error
  const cloud = (data as unknown as CloudBookmarkRow[]).map<Bookmark>((row) => ({
    id: row.id,
    chapter_id: row.chapter_id,
    paragraph: row.paragraph,
    excerpt: row.excerpt,
    note: row.note,
    created_at: row.created_at,
    chapter_title: row.chapter?.title ?? 'Глава',
    volume_slug: row.chapter?.volume_slug ?? '',
    chapter_position: row.chapter?.position ?? 0,
  }))
  const demo = localLibrary.bookmarks().filter((b) => b.chapter_id < 0)
  return [...cloud, ...demo]
}

async function fetchCloudProgress(): Promise<Progress[]> {
  const { data, error } = await requireSupabase()
    .from('reading_progress')
    .select('chapter_id, volume_slug, paragraph, percent, completed, updated_at, chapter:chapters(title, position)')
    .order('updated_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  const cloud = (data as unknown as CloudProgressRow[]).map<Progress>((row) => ({
    chapter_id: row.chapter_id,
    volume_slug: row.volume_slug,
    paragraph: row.paragraph,
    percent: row.percent,
    completed: row.completed,
    updated_at: row.updated_at,
    chapter_title: row.chapter?.title,
    chapter_position: row.chapter?.position,
  }))
  const demo = localLibrary.progress().filter((p) => p.chapter_id < 0)
  return [...cloud, ...demo].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function useBookmarks() {
  const viewer = useViewerKey()
  return useQuery({
    queryKey: ['bookmarks', viewer],
    queryFn: () => (viewer === 'guest' || !isSupabaseConfigured ? localLibrary.bookmarks() : fetchCloudBookmarks()),
    staleTime: 60_000,
  })
}

export function useProgressList() {
  const viewer = useViewerKey()
  return useQuery({
    queryKey: ['progress', viewer],
    queryFn: () => (viewer === 'guest' || !isSupabaseConfigured ? localLibrary.progress() : fetchCloudProgress()),
    staleTime: 60_000,
  })
}

export type NewBookmark = Omit<Bookmark, 'id' | 'created_at'>

export function useBookmarkActions() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()

  const add = useCallback(
    async (input: NewBookmark): Promise<Bookmark> => {
      let created: Bookmark
      if (viewer === 'guest' || input.chapter_id < 0 || !isSupabaseConfigured) {
        created = localLibrary.addBookmark(input)
      } else {
        const { data, error } = await requireSupabase()
          .from('bookmarks')
          .upsert(
            {
              chapter_id: input.chapter_id,
              paragraph: input.paragraph,
              excerpt: input.excerpt.slice(0, 400),
              note: input.note.slice(0, 1000),
            },
            { onConflict: 'user_id,chapter_id,paragraph' }
          )
          .select('id, created_at')
          .single()
        if (error) throw error
        created = { ...input, id: data.id as number, created_at: data.created_at as string }
      }
      queryClient.setQueryData<Bookmark[]>(['bookmarks', viewer], (old) => [created, ...(old ?? []).filter((b) => b.id !== created.id)])
      return created
    },
    [viewer, queryClient]
  )

  const remove = useCallback(
    async (bookmark: Pick<Bookmark, 'id'>) => {
      if (typeof bookmark.id === 'string') {
        localLibrary.removeBookmark(bookmark.id)
      } else {
        const { error } = await requireSupabase().from('bookmarks').delete().eq('id', bookmark.id)
        if (error) throw error
      }
      queryClient.setQueryData<Bookmark[]>(['bookmarks', viewer], (old) => (old ?? []).filter((b) => b.id !== bookmark.id))
    },
    [viewer, queryClient]
  )

  const updateNote = useCallback(
    async (bookmark: Pick<Bookmark, 'id'>, note: string) => {
      const clean = note.trim().slice(0, 1000)
      if (typeof bookmark.id === 'string') {
        localLibrary.updateNote(bookmark.id, clean)
      } else {
        const { error } = await requireSupabase().from('bookmarks').update({ note: clean }).eq('id', bookmark.id)
        if (error) throw error
      }
      queryClient.setQueryData<Bookmark[]>(['bookmarks', viewer], (old) =>
        (old ?? []).map((b) => (b.id === bookmark.id ? { ...b, note: clean } : b))
      )
    },
    [viewer, queryClient]
  )

  return { add, remove, updateNote }
}

export interface ProgressInput {
  chapter_id: number
  volume_slug: string
  paragraph: number
  percent: number
  chapter_title?: string
  chapter_position?: number
}

/** Сохраняет прогресс и обновляет кэш, чтобы каталог сразу показывал отметки. */
export function useSaveProgress() {
  const queryClient = useQueryClient()
  const viewer = useViewerKey()

  return useCallback(
    async (input: ProgressInput) => {
      const percent = Math.round(Math.min(100, Math.max(0, input.percent)) * 10) / 10
      let saved: Progress
      if (viewer === 'guest' || input.chapter_id < 0 || !isSupabaseConfigured) {
        saved = localLibrary.saveProgress({ ...input, percent })
      } else {
        const userId = useAuth.getState().user?.id
        const { data, error } = await requireSupabase()
          .from('reading_progress')
          .upsert(
            {
              user_id: userId,
              chapter_id: input.chapter_id,
              volume_slug: input.volume_slug,
              paragraph: input.paragraph,
              percent,
            },
            { onConflict: 'user_id,chapter_id' }
          )
          .select('chapter_id, volume_slug, paragraph, percent, completed, updated_at')
          .single()
        if (error) throw error
        saved = { ...(data as Progress), chapter_title: input.chapter_title, chapter_position: input.chapter_position }
      }
      queryClient.setQueryData<Progress[]>(['progress', viewer], (old) => [
        saved,
        ...(old ?? []).filter((p) => p.chapter_id !== saved.chapter_id),
      ])
      return saved
    },
    [viewer, queryClient]
  )
}

/**
 * После входа переносим гостевые закладки и прогресс в аккаунт.
 * Каждая запись отправляется отдельно: если глава за это время была удалена,
 * пропадёт только эта запись, а не весь перенос.
 */
export async function migrateGuestLibrary(userId: string): Promise<number> {
  const bookmarks = localLibrary.bookmarks().filter((b) => b.chapter_id > 0)
  const progress = localLibrary.progress().filter((p) => p.chapter_id > 0)
  if (!bookmarks.length && !progress.length) return 0
  const client = requireSupabase()

  const results = await Promise.allSettled([
    ...bookmarks.map((b) =>
      client
        .from('bookmarks')
        .upsert(
          { chapter_id: b.chapter_id, paragraph: b.paragraph, excerpt: b.excerpt, note: b.note },
          { onConflict: 'user_id,chapter_id,paragraph', ignoreDuplicates: true }
        )
        .then(({ error }) => {
          if (error) throw error
        })
    ),
    ...progress.map((p) =>
      client
        .from('reading_progress')
        .upsert(
          {
            user_id: userId,
            chapter_id: p.chapter_id,
            volume_slug: p.volume_slug,
            paragraph: p.paragraph,
            percent: p.percent,
            completed: p.completed,
          },
          { onConflict: 'user_id,chapter_id' }
        )
        .then(({ error }) => {
          if (error) throw error
        })
    ),
  ])
  localLibrary.clearMigrated()
  return results.filter((r) => r.status === 'fulfilled').length
}
