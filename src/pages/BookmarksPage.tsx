import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark as BookmarkIcon, BookOpenText, Cloud, Search, StickyNote, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookmarkActions, useBookmarks } from '../api/library'
import { VolumeCover } from '../components/catalog/VolumeCover'
import { EmptyState } from '../components/ui/misc'
import { confirmDialog } from '../components/ui/Overlay'
import { toast } from '../components/ui/Toaster'
import { ALL_VOLUMES, getVolume, volumeFullTitle } from '../data/catalog'
import { DEMO_CHAPTER } from '../data/demoChapter'
import { countLabel, formatDate } from '../lib/format'
import type { Bookmark } from '../lib/types'
import { translateError, useAuth } from '../store/auth'

function hrefFor(b: Bookmark) {
  return b.chapter_id < 0 ? `/demo#p${b.paragraph}` : `/read/${b.chapter_id}#p${b.paragraph}`
}

function BookmarkCard({ bookmark, index }: { bookmark: Bookmark; index: number }) {
  const { remove, updateNote } = useBookmarkActions()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(bookmark.note)

  const save = async () => {
    try {
      await updateNote(bookmark, note)
      setEditing(false)
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
    }
  }

  const del = async () => {
    const ok = await confirmDialog({ title: 'Удалить закладку?', confirmLabel: 'Удалить', danger: true })
    if (!ok) return
    try {
      await remove(bookmark)
      toast('Закладка удалена')
    } catch (e) {
      toast.error('Не удалось удалить', { description: translateError(e) })
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.03 }}
      className="card group relative p-5 transition-colors hover:border-accent/35"
    >
      <span className="absolute -top-px left-6 h-7 w-4 rounded-b-sm bg-accent" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)' }} />
      <Link to={hrefFor(bookmark)} className="block pt-3">
        <p className="text-xs font-semibold text-accent">
          {bookmark.chapter_title} · абзац {bookmark.paragraph + 1}
        </p>
        <p className="mt-2 line-clamp-4 font-serif text-[15px] leading-relaxed text-ink">{bookmark.excerpt || 'Иллюстрация или пустой абзац'}</p>
      </Link>

      {editing ? (
        <div className="mt-3">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="input resize-none text-sm" autoFocus placeholder="Заметка к закладке" />
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-quiet px-3 py-1.5" onClick={() => setEditing(false)}>
              Отмена
            </button>
            <button className="btn-primary px-3 py-1.5" onClick={() => void save()}>
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        bookmark.note && <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-sm text-ink-2">{bookmark.note}</p>
      )}

      <div className="mt-4 flex items-center gap-1 border-t border-line/60 pt-3 text-xs text-muted">
        <span>{formatDate(bookmark.created_at)}</span>
        <button className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface-2 hover:text-ink" onClick={() => setEditing(true)}>
          <StickyNote size={13} /> {bookmark.note ? 'Изменить' : 'Заметка'}
        </button>
        <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-danger/10 hover:text-danger" onClick={() => void del()}>
          <Trash2 size={13} /> Удалить
        </button>
      </div>
    </motion.li>
  )
}

export default function BookmarksPage() {
  const status = useAuth((s) => s.status)
  const { data: bookmarks, isLoading } = useBookmarks()
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (bookmarks ?? []).filter(
      (b) => !q || `${b.excerpt} ${b.note} ${b.chapter_title}`.toLowerCase().includes(q)
    )
    const order = new Map(ALL_VOLUMES.map((v, i) => [v.slug, i]))
    const map = new Map<string, Bookmark[]>()
    for (const b of filtered) {
      const key = b.chapter_id < 0 ? 'demo' : b.volume_slug
      map.set(key, [...(map.get(key) ?? []), b])
    }
    return [...map.entries()]
      .sort(([a], [b]) => (order.get(a) ?? -1) - (order.get(b) ?? -1))
      .map(([slug, items]) => ({
        slug,
        items: items.sort((a, b) => a.chapter_position - b.chapter_position || a.paragraph - b.paragraph),
      }))
  }, [bookmarks, query])

  const total = bookmarks?.length ?? 0

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Библиотека</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Закладки</h1>
          <p className="mt-2 text-sm text-ink-2">{total ? countLabel(total, ['закладка', 'закладки', 'закладок']) : 'Отмечайте важные места в главах'}</p>
        </div>
        {total > 3 && (
          <label className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-10" placeholder="Поиск по закладкам" />
          </label>
        )}
      </header>

      {status !== 'signed-in' && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line/80 bg-surface/60 p-4 text-sm text-ink-2 sm:flex-row sm:items-center">
          <Cloud size={18} className="shrink-0 text-accent" />
          <p className="flex-1">Сейчас закладки хранятся только в этом браузере. Войдите — и они переедут в аккаунт и будут доступны на любом устройстве.</p>
          {status === 'signed-out' && (
            <Link to="/login?next=/bookmarks" className="btn-ghost shrink-0 px-3 py-1.5">
              Войти
            </Link>
          )}
        </div>
      )}

      <div className="mt-10">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<BookmarkIcon size={24} />}
            title="Закладок пока нет"
            action={
              <Link to="/demo" className="btn-primary">
                <BookOpenText size={16} /> Попробовать на демо-главе
              </Link>
            }
          >
            В читалке наведите курсор на абзац и нажмите на ленточку слева — или нажмите клавишу B. На телефоне — кнопка с ленточкой внизу экрана.
          </EmptyState>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">По запросу «{query}» ничего не найдено.</p>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => {
              const volume = getVolume(group.slug)
              return (
                <section key={group.slug}>
                  <div className="mb-5 flex items-center gap-4">
                    <div className="w-10 shrink-0 overflow-hidden rounded-lg">{volume && <VolumeCover volume={volume} showMeta={false} />}</div>
                    <div>
                      <h2 className="font-display text-lg font-semibold">{volume ? volumeFullTitle(volume) : DEMO_CHAPTER.title}</h2>
                      <p className="text-xs text-muted">{countLabel(group.items.length, ['закладка', 'закладки', 'закладок'])}</p>
                    </div>
                  </div>
                  <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence initial={false}>
                      {group.items.map((b, i) => (
                        <BookmarkCard key={String(b.id)} bookmark={b} index={i} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
