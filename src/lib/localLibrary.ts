import type { Bookmark, Progress } from './types'

/**
 * Закладки и прогресс гостя (и демо-главы) — в localStorage этого браузера.
 * После входа в аккаунт всё, что относится к настоящим главам, переносится в облако.
 */

const BOOKMARKS_KEY = 'mindclass-guest-bookmarks'
const PROGRESS_KEY = 'mindclass-guest-progress'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Переполнено или запрещено (приватный режим) — просто не сохраняем.
  }
}

export const localLibrary = {
  bookmarks(): Bookmark[] {
    return read<Bookmark[]>(BOOKMARKS_KEY, []).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  addBookmark(input: Omit<Bookmark, 'id' | 'created_at'>): Bookmark {
    const list = read<Bookmark[]>(BOOKMARKS_KEY, [])
    const existing = list.find((b) => b.chapter_id === input.chapter_id && b.paragraph === input.paragraph)
    if (existing) return existing
    const bookmark: Bookmark = {
      ...input,
      id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    }
    write(BOOKMARKS_KEY, [bookmark, ...list])
    return bookmark
  },

  removeBookmark(id: Bookmark['id']) {
    write(
      BOOKMARKS_KEY,
      read<Bookmark[]>(BOOKMARKS_KEY, []).filter((b) => b.id !== id)
    )
  },

  updateNote(id: Bookmark['id'], note: string) {
    write(
      BOOKMARKS_KEY,
      read<Bookmark[]>(BOOKMARKS_KEY, []).map((b) => (b.id === id ? { ...b, note } : b))
    )
  },

  progress(): Progress[] {
    const map = read<Record<string, Progress>>(PROGRESS_KEY, {})
    return Object.values(map).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  saveProgress(entry: Omit<Progress, 'updated_at' | 'completed'> & { completed?: boolean }): Progress {
    const map = read<Record<string, Progress>>(PROGRESS_KEY, {})
    const prev = map[entry.chapter_id]
    const next: Progress = {
      ...prev,
      ...entry,
      completed: Boolean(prev?.completed || entry.completed || entry.percent >= 90),
      updated_at: new Date().toISOString(),
    }
    map[entry.chapter_id] = next
    write(PROGRESS_KEY, map)
    return next
  },

  /** Убрать перенесённые в облако записи (демо-глава остаётся локальной). */
  clearMigrated() {
    write(
      BOOKMARKS_KEY,
      read<Bookmark[]>(BOOKMARKS_KEY, []).filter((b) => b.chapter_id < 0)
    )
    const map = read<Record<string, Progress>>(PROGRESS_KEY, {})
    write(
      PROGRESS_KEY,
      Object.fromEntries(Object.entries(map).filter(([, p]) => p.chapter_id < 0))
    )
  },
}
