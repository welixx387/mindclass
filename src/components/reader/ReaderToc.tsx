import { motion } from 'framer-motion'
import { Bookmark as BookmarkIcon, Check, StickyNote, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookmarkActions } from '../../api/library'
import { formatDate, readingTimeLabel } from '../../lib/format'
import type { Bookmark, ChapterMeta, Progress } from '../../lib/types'
import { toast } from '../ui/Toaster'

export function ReaderToc({
  chapters,
  currentId,
  progress,
  bookmarks,
  onJump,
  onEditNote,
  onClose,
}: {
  chapters: ChapterMeta[]
  currentId: number
  progress: Map<number, Progress>
  bookmarks: Bookmark[]
  onJump: (paragraph: number) => void
  onEditNote: (bookmark: Bookmark) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'chapters' | 'bookmarks'>(chapters.length ? 'chapters' : 'bookmarks')
  const { remove } = useBookmarkActions()

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 rounded-xl border border-line bg-surface-2/40 p-1">
        {(
          [
            { id: 'chapters', label: 'Оглавление' },
            { id: 'bookmarks', label: `Закладки${bookmarks.length ? ` · ${bookmarks.length}` : ''}` },
          ] as const
        ).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="relative rounded-lg py-2 text-sm font-semibold">
            {tab === t.id && <motion.span layoutId="toc-tab" className="absolute inset-0 rounded-lg bg-elev shadow ring-1 ring-line" />}
            <span className={`relative ${tab === t.id ? 'text-ink' : 'text-muted'}`}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'chapters' ? (
        chapters.length ? (
          <ol className="space-y-1">
            {chapters.map((c, i) => {
              const p = progress.get(c.id)
              const current = c.id === currentId
              return (
                <li key={c.id}>
                  <Link
                    to={`/read/${c.id}`}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      current ? 'bg-accent/12 text-ink ring-1 ring-accent/40' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <span className="w-6 shrink-0 font-display text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.title}</span>
                      <span className="text-xs text-muted">{readingTimeLabel(c.word_count)}</span>
                    </span>
                    {p?.completed ? (
                      <Check size={15} className="shrink-0 text-success" />
                    ) : p ? (
                      <span className="shrink-0 text-xs text-muted">{Math.round(p.percent)}%</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted">Это отдельная глава без тома.</p>
        )
      ) : bookmarks.length ? (
        <ul className="space-y-2">
          {bookmarks
            .slice()
            .sort((a, b) => a.paragraph - b.paragraph)
            .map((b) => (
              <li key={String(b.id)} className="group rounded-xl border border-line/70 p-3 transition-colors hover:border-accent/40">
                <button className="block w-full text-left" onClick={() => onJump(b.paragraph)}>
                  <span className="line-clamp-3 font-serif text-[14px] leading-snug text-ink">{b.excerpt || `Абзац ${b.paragraph + 1}`}</span>
                  {b.note && <span className="mt-2 block rounded-lg bg-gold/10 px-2 py-1.5 text-xs text-ink-2">{b.note}</span>}
                </button>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted">
                  <BookmarkIcon size={12} className="text-accent" /> {formatDate(b.created_at)}
                  <button className="ml-auto rounded-md p-1 hover:bg-surface-2 hover:text-ink" onClick={() => onEditNote(b)} aria-label="Заметка">
                    <StickyNote size={14} />
                  </button>
                  <button
                    className="rounded-md p-1 hover:bg-danger/10 hover:text-danger"
                    onClick={async () => {
                      await remove(b)
                      toast('Закладка удалена')
                    }}
                    aria-label="Удалить закладку"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
          В этой главе пока нет закладок. Наведите на абзац и нажмите на ленточку слева или нажмите <kbd className="rounded border border-line px-1">B</kbd>.
        </div>
      )}
    </div>
  )
}
