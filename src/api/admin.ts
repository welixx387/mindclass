import { useQuery } from '@tanstack/react-query'
import { CLASS_POINTS_KEY, type ClassPointsMap } from '../lib/classPoints'
import { HERO_ART_KEY, type HeroArtSetting } from '../lib/heroArt'
import type { ImportedChapter, ImportedImage } from '../lib/importers'
import { ILLUSTRATIONS_BUCKET, isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { ChapterMeta, Profile, Role } from '../lib/types'
import { CHAPTER_META_COLUMNS, fetchVolumeChapters } from './chapters'
import { queryClient } from './queryClient'

export function useAllChaptersMeta() {
  return useQuery({
    queryKey: ['chapters', 'admin-all'],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('chapters').select(CHAPTER_META_COLUMNS).order('volume_slug').order('position').limit(5000)
      if (error) throw error
      return data as ChapterMeta[]
    },
    enabled: isSupabaseConfigured,
  })
}

export function invalidateChapters() {
  void queryClient.invalidateQueries({ queryKey: ['chapters'] })
  void queryClient.invalidateQueries({ queryKey: ['volume-stats'] })
}

export interface ChapterInput {
  volume_slug: string
  title: string
  content: string
  is_published: boolean
  position?: number
}

export async function nextPosition(volumeSlug: string): Promise<number> {
  const { data, error } = await requireSupabase()
    .from('chapters')
    .select('position')
    .eq('volume_slug', volumeSlug)
    .order('position', { ascending: false })
    .limit(1)
  if (error) throw error
  return ((data?.[0]?.position as number | undefined) ?? 0) + 1
}

export async function createChapter(input: ChapterInput): Promise<ChapterMeta> {
  const position = input.position ?? (await nextPosition(input.volume_slug))
  const { data, error } = await requireSupabase()
    .from('chapters')
    .insert({ ...input, title: input.title.trim(), position })
    .select(CHAPTER_META_COLUMNS)
    .single()
  if (error) throw error
  return data as ChapterMeta
}

export async function updateChapter(id: number, patch: Partial<ChapterInput>): Promise<ChapterMeta> {
  const { data, error } = await requireSupabase().from('chapters').update(patch).eq('id', id).select(CHAPTER_META_COLUMNS).single()
  if (error) throw error
  return data as ChapterMeta
}

export async function deleteChapter(id: number): Promise<void> {
  const { error } = await requireSupabase().from('chapters').delete().eq('id', id)
  if (error) throw error
}

export async function reorderChapters(volumeSlug: string, ids: number[]): Promise<void> {
  const { error } = await requireSupabase().rpc('reorder_chapters', { p_volume: volumeSlug, p_ids: ids })
  if (error) throw error
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

async function sha256(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Загружает иллюстрацию в Storage и возвращает публичную ссылку. Одинаковые файлы не дублируются. */
export async function uploadIllustration(volumeSlug: string, image: Pick<ImportedImage, 'type' | 'data'>): Promise<string> {
  const client = requireSupabase()
  const ext = EXT_BY_TYPE[image.type] ?? 'bin'
  const path = `${volumeSlug}/${(await sha256(image.data)).slice(0, 24)}.${ext}`
  const { error } = await client.storage.from(ILLUSTRATIONS_BUCKET).upload(path, image.data, {
    contentType: image.type,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw error
  return client.storage.from(ILLUSTRATIONS_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Картинки для оформления сайта лежат в том же хранилище, в папке site/. */
const SITE_FOLDER = 'site/'

/** Загружает арт для главной страницы и возвращает публичную ссылку и путь файла. */
export async function uploadSiteArt(file: File): Promise<{ url: string; path: string }> {
  const client = requireSupabase()
  const data = new Uint8Array(await file.arrayBuffer())
  const path = `${SITE_FOLDER}hero-${(await sha256(data)).slice(0, 20)}.${EXT_BY_TYPE[file.type] ?? 'bin'}`
  const { error } = await client.storage.from(ILLUSTRATIONS_BUCKET).upload(path, data, {
    contentType: file.type,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw error
  return { url: client.storage.from(ILLUSTRATIONS_BUCKET).getPublicUrl(path).data.publicUrl, path }
}

async function removeSiteFile(path: string | undefined) {
  if (!path?.startsWith(SITE_FOLDER)) return
  // Лишний файл в хранилище никому не мешает, поэтому ошибку удаления не показываем.
  await requireSupabase()
    .storage.from(ILLUSTRATIONS_BUCKET)
    .remove([path])
    .catch(() => undefined)
}

/** Сохраняет арт и его подпись. Прежняя картинка, если её заменили, удаляется. */
export async function saveHeroArt(value: HeroArtSetting, previousPath?: string): Promise<void> {
  const { error } = await requireSupabase().from('site_settings').upsert({ key: HERO_ART_KEY, value })
  if (error) throw error
  if (previousPath !== value.path) await removeSiteFile(previousPath)
}

/** Убирает арт: на главной и на странице входа снова будет талисман. */
export async function removeHeroArt(path?: string): Promise<void> {
  const { error } = await requireSupabase().from('site_settings').delete().eq('key', HERO_ART_KEY)
  if (error) throw error
  await removeSiteFile(path)
}

/** Сохраняет очки классов по всем томам разом. */
export async function saveClassPoints(map: ClassPointsMap): Promise<void> {
  const { error } = await requireSupabase().from('site_settings').upsert({ key: CLASS_POINTS_KEY, value: map })
  if (error) throw error
}

export type ImportMode = 'append' | 'replace'

export interface ImportProgress {
  stage: 'images' | 'chapters' | 'cleanup' | 'done'
  done: number
  total: number
}

const PLACEHOLDER_RE = /\]\((mc-image:[^)]+)\)/g

/**
 * Сохраняет импортированные главы в том.
 *  append  — добавить в конец;
 *  replace — заменить главы по порядку: у совпадающих номеров сохраняются id,
 *            а значит и комментарии с закладками; лишние старые главы удаляются.
 */
export async function importChapters(options: {
  volumeSlug: string
  chapters: ImportedChapter[]
  images: Map<string, ImportedImage>
  mode: ImportMode
  publish: boolean
  onProgress: (p: ImportProgress) => void
}): Promise<{ created: number; updated: number; deleted: number; imageErrors: number }> {
  const { volumeSlug, mode, publish, onProgress } = options
  const chapters = options.chapters.filter((c) => c.include && c.title.trim())

  // 1. Иллюстрации
  const keys = [...new Set(chapters.flatMap((c) => [...c.content.matchAll(PLACEHOLDER_RE)].map((m) => m[1])))]
  const urls = new Map<string, string>()
  let imageErrors = 0
  for (let i = 0; i < keys.length; i++) {
    onProgress({ stage: 'images', done: i, total: keys.length })
    const image = options.images.get(keys[i])
    if (!image) continue
    try {
      urls.set(keys[i], await uploadIllustration(volumeSlug, image))
    } catch {
      imageErrors++
    }
  }
  const withUrls = chapters.map((c) => ({
    title: c.title.trim().slice(0, 200),
    content: c.content
      .replace(PLACEHOLDER_RE, (_m, key: string) => `](${urls.get(key) ?? ''})`)
      .replace(/^!\[[^\]]*\]\(\)$/gm, '')
      .trim(),
  }))

  // 2. Главы
  const client = requireSupabase()
  const existing = mode === 'replace' ? await fetchVolumeChapters(volumeSlug) : []
  let position = mode === 'append' ? await nextPosition(volumeSlug) : 1
  let created = 0
  let updated = 0
  for (let i = 0; i < withUrls.length; i++) {
    onProgress({ stage: 'chapters', done: i, total: withUrls.length })
    const row = { ...withUrls[i], volume_slug: volumeSlug, position: position++, is_published: publish }
    const target = existing[i]
    const { error } = target ? await client.from('chapters').update(row).eq('id', target.id) : await client.from('chapters').insert(row)
    if (error) throw error
    if (target) updated++
    else created++
  }

  // 3. Лишние главы при замене
  let deleted = 0
  if (mode === 'replace' && existing.length > withUrls.length) {
    const extra = existing.slice(withUrls.length).map((c) => c.id)
    onProgress({ stage: 'cleanup', done: 0, total: extra.length })
    const { error } = await client.from('chapters').delete().in('id', extra)
    if (error) throw error
    deleted = extra.length
  }

  onProgress({ stage: 'done', done: withUrls.length, total: withUrls.length })
  invalidateChapters()
  return { created, updated, deleted, imageErrors }
}

export function useProfilesAdmin(search: string) {
  return useQuery({
    queryKey: ['admin-profiles', search],
    queryFn: async () => {
      let query = requireSupabase().from('profiles').select('id, username, class_letter, avatar_color, bio, role, created_at')
      const q = search.trim()
      if (q) query = query.ilike('username', `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`)
      const { data, error } = await query.order('created_at', { ascending: false }).limit(60)
      if (error) throw error
      return data as Profile[]
    },
    enabled: isSupabaseConfigured,
    placeholderData: (prev) => prev,
  })
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await requireSupabase().rpc('set_user_role', { target: userId, new_role: role })
  if (error) throw error
}
