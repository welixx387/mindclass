import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useSpring } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark as BookmarkIcon,
  BookmarkPlus,
  BookX,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Expand,
  List,
  MessageSquareText,
  Minimize,
  CaseSensitive,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CHAPTER_META_COLUMNS, useChapter, useChapterNeighbors } from '../api/chapters'
import { chapterTarget } from '../api/comments'
import { useBookmarkActions, useBookmarks, useProgressList, useSaveProgress } from '../api/library'
import { CommentSection } from '../components/comments/CommentSection'
import { ChapterText } from '../components/reader/ChapterText'
import { ReaderSettingsPanel } from '../components/reader/ReaderSettingsPanel'
import { ReaderToc } from '../components/reader/ReaderToc'
import { useReadingTracker } from '../components/reader/useReadingTracker'
import { Spinner } from '../components/ui/misc'
import { Drawer, Modal } from '../components/ui/Overlay'
import { toast } from '../components/ui/Toaster'
import { getVolume, volumeFullTitle } from '../data/catalog'
import { DEMO_CHAPTER_ID } from '../data/demoChapter'
import { blockText, excerpt, parseChapter } from '../lib/markup'
import { readingTimeLabel } from '../lib/format'
import { requireSupabase } from '../lib/supabase'
import type { Bookmark, Chapter } from '../lib/types'
import { translateError } from '../store/auth'
import { READER_FONTS, useReaderSettings } from '../store/readerSettings'
import { useUi } from '../store/ui'

const THEME_BG: Record<string, string> = { night: '#100b14', day: '#fafaf7', sepia: '#f4ecd8', oled: '#000000' }

function useReaderTheme() {
  const theme = useReaderSettings((s) => s.theme)
  const site = useUi((s) => s.theme)
  return theme === 'auto' ? (site === 'dark' ? 'night' : 'day') : theme
}

function scrollToParagraph(index: number, behavior: ScrollBehavior = 'smooth', flash = true) {
  const el = document.getElementById(`p${index}`)
  if (!el) return false
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior })
  if (flash) {
    el.classList.remove('flash')
    void el.offsetWidth
    el.classList.add('flash')
  }
  return true
}

export default function ReaderPage({ demo = false }: { demo?: boolean }) {
  const params = useParams()
  const id = demo ? DEMO_CHAPTER_ID : Number(params.id)
  const valid = Number.isInteger(id) && (id > 0 || id === DEMO_CHAPTER_ID)
  const { data: chapter, isLoading, error } = useChapter(valid ? id : undefined)
  const readerTheme = useReaderTheme()

  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = THEME_BG[readerTheme] ?? ''
    return () => {
      document.body.style.backgroundColor = prev
    }
  }, [readerTheme])

  return (
    <div className="reader-root min-h-[100dvh]" data-reader-theme={readerTheme}>
      {isLoading ? (
        <div className="flex min-h-[100dvh] items-center justify-center" style={{ color: 'rgb(var(--r-muted))' }}>
          <Spinner size={26} />
        </div>
      ) : !chapter || !valid ? (
        <ReaderMessage
          title={error ? 'Не удалось открыть главу' : 'Глава не найдена'}
          text={error ? translateError(error) : 'Возможно, её удалили или ссылка устарела.'}
        />
      ) : (
        <ChapterReader key={chapter.id} chapter={chapter} />
      )}
    </div>
  )
}

function ReaderMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <BookX size={56} strokeWidth={1.2} className="opacity-40" />
      <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-sm opacity-70">{text}</p>
      <Link to="/" className="btn-primary mt-8">
        На главную
      </Link>
    </div>
  )
}

function ChapterReader({ chapter }: { chapter: Chapter }) {
  const isDemo = chapter.id === DEMO_CHAPTER_ID
  const volume = getVolume(chapter.volume_slug)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const settings = useReaderSettings()
  const blocks = useMemo(() => parseChapter(chapter.content), [chapter.content])
  const { prev, next, siblings } = useChapterNeighbors(isDemo ? null : chapter)
  const { data: allBookmarks } = useBookmarks()
  const { data: progressList, isFetched: progressFetched } = useProgressList()
  const { add, remove, updateNote } = useBookmarkActions()
  const saveProgress = useSaveProgress()

  const bookmarks = useMemo(() => (allBookmarks ?? []).filter((b) => b.chapter_id === chapter.id), [allBookmarks, chapter.id])
  const bookmarkedSet = useMemo(() => new Set(bookmarks.map((b) => b.paragraph)), [bookmarks])
  const progressMap = useMemo(() => new Map((progressList ?? []).map((p) => [p.chapter_id, p])), [progressList])
  const saved = progressMap.get(chapter.id)

  const container = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [noteFor, setNoteFor] = useState<Bookmark | null>(null)
  const [noteText, setNoteText] = useState('')
  const [resumeOffer, setResumeOffer] = useState<number | null>(null)
  const [hovered, setHovered] = useState<{ index: number; top: number } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const font = READER_FONTS.find((f) => f.id === settings.font) ?? READER_FONTS[0]
  const layoutKey = `${settings.font}|${settings.size}|${settings.leading}|${settings.width}|${settings.gap}|${settings.indent}|${blocks.length}`

  const tracker = useReadingTracker({
    container,
    layoutKey,
    autoHide: settings.autoHide,
    onSave: (paragraph, percent) => {
      saveProgress({
        chapter_id: chapter.id,
        volume_slug: chapter.volume_slug,
        paragraph,
        percent,
        chapter_title: chapter.title,
        chapter_position: chapter.position,
      }).catch(() => undefined)
    },
  })
  const progressSpring = useSpring(tracker.progress, { stiffness: 260, damping: 40 })

  useEffect(() => {
    document.title = `${chapter.title}${volume ? ` — ${volumeFullTitle(volume)}` : ''} — MindClass`
    return () => {
      document.title = 'MindClass — читалка ранобэ «Класс превосходства»'
    }
  }, [chapter.title, volume])

  // Куда встать при открытии: якорь абзаца, «продолжить», найденная фраза или начало.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current) return
    const hash = /^#p(\d+)$/.exec(location.hash)
    if (hash) {
      restored.current = true
      requestAnimationFrame(() => scrollToParagraph(Number(hash[1]), 'auto'))
      return
    }
    if (location.hash === '#comments') {
      restored.current = true
      return
    }
    const q = searchParams.get('q')
    if (q) {
      restored.current = true
      const words = q
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .map((w) => w.slice(0, Math.max(3, w.length - 2)))
      const index = blocks.findIndex((b) => {
        const text = blockText(b).toLowerCase()
        return words.some((w) => text.includes(w))
      })
      window.scrollTo(0, 0)
      if (index >= 0) setTimeout(() => scrollToParagraph(index), 250)
      return
    }
    if (!progressFetched) return
    restored.current = true
    if (searchParams.get('continue') && saved && saved.paragraph > 0) {
      requestAnimationFrame(() => scrollToParagraph(saved.paragraph, 'auto', false))
      return
    }
    window.scrollTo(0, 0)
    if (saved && saved.paragraph > 2 && saved.percent < 97) setResumeOffer(saved.paragraph)
  }, [blocks, location.hash, progressFetched, saved, searchParams])

  useEffect(() => {
    if (resumeOffer === null) return
    const t = setTimeout(() => setResumeOffer(null), 9000)
    return () => clearTimeout(t)
  }, [resumeOffer])

  // Следующая глава подгружается заранее, когда до конца недалеко.
  useEffect(() => {
    if (!next || tracker.percent < 70) return
    void queryClient.prefetchQuery({
      queryKey: ['chapters', 'one', next.id],
      queryFn: async () => {
        const { data } = await requireSupabase().from('chapters').select(`${CHAPTER_META_COLUMNS}, content`).eq('id', next.id).maybeSingle()
        return data
      },
      staleTime: 5 * 60_000,
    })
  }, [next, tracker.percent, queryClient])

  const toggleBookmark = useCallback(
    async (index: number) => {
      const block = blocks[index]
      if (!block || block.type === 'break') return
      const existing = bookmarks.find((b) => b.paragraph === index)
      try {
        if (existing) {
          await remove(existing)
          toast('Закладка удалена', {
            action: {
              label: 'Вернуть',
              onClick: () => void add({ ...existing }),
            },
          })
        } else {
          const created = await add({
            chapter_id: chapter.id,
            paragraph: index,
            excerpt: excerpt(blockText(block), 180),
            note: '',
            chapter_title: chapter.title,
            volume_slug: chapter.volume_slug,
            chapter_position: chapter.position,
          })
          toast.success('Закладка добавлена', {
            action: {
              label: 'Заметка',
              onClick: () => {
                setNoteFor(created)
                setNoteText('')
              },
            },
          })
        }
      } catch (e) {
        toast.error('Не удалось сохранить закладку', { description: translateError(e) })
      }
    },
    [add, blocks, bookmarks, chapter, remove]
  )

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (/input|textarea|select/i.test(target.tagName) || target.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey || settingsOpen || tocOpen || noteFor || lightbox) return
      // Физические клавиши — работают и в русской раскладке.
      if (e.key === 'ArrowLeft' && prev) navigate(`/read/${prev.id}`)
      else if (e.key === 'ArrowRight' && next) navigate(`/read/${next.id}`)
      else if (e.code === 'KeyB') void toggleBookmark(tracker.currentParagraph())
      else if (e.code === 'KeyS') setSettingsOpen(true)
      else if (e.code === 'KeyT') setTocOpen(true)
      else if (e.code === 'KeyF') toggleFullscreen()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, navigate, next, noteFor, prev, settingsOpen, toggleBookmark, toggleFullscreen, tocOpen, tracker])

  const onMouseMove = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-i]')
    if (!el || !container.current?.contains(el) || el.classList.contains('rp-break')) return
    const index = Number(el.dataset.i)
    if (hovered?.index !== index) setHovered({ index, top: el.offsetTop })
  }

  const saveNote = async () => {
    if (!noteFor) return
    try {
      await updateNote(noteFor, noteText)
      toast.success(noteText.trim() ? 'Заметка сохранена' : 'Заметка удалена')
      setNoteFor(null)
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
    }
  }

  const remaining = Math.max(0, chapter.word_count * (1 - tracker.percent / 100))
  const chrome = tracker.chromeVisible || settingsOpen || tocOpen
  const backHref = volume ? `/volume/${volume.slug}` : '/'
  const chromeStyle = { background: 'rgb(var(--r-bg) / 0.86)', borderColor: 'rgb(var(--r-line) / 0.8)' }

  return (
    <div
      style={
        {
          '--reader-font': font.css,
          '--reader-size': `${settings.size}px`,
          '--reader-leading': settings.leading,
          '--reader-align': settings.align,
          '--reader-gap': `${settings.gap}em`,
          '--reader-indent': settings.indent ? '1.5em' : '0',
        } as React.CSSProperties
      }
    >
      {/* Прогресс главы */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left"
        style={{ scaleX: progressSpring, background: 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--gold)))' }}
      />

      {/* Верхняя панель */}
      <motion.header
        initial={false}
        animate={{ y: chrome ? 0 : -72 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl"
        style={chromeStyle}
      >
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-3 sm:px-5">
          <Link to={backHref} className="icon-btn shrink-0" aria-label="Назад к тому" style={{ color: 'rgb(var(--r-ink))' }}>
            <ArrowLeft size={19} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--r-muted))' }}>
              {volume ? volumeFullTitle(volume) : 'MindClass · демо'}
            </p>
            <p className="truncate text-sm font-semibold">{chapter.title}</p>
          </div>
          <span className="hidden text-xs tabular-nums md:block" style={{ color: 'rgb(var(--r-muted))' }}>
            {tracker.percent >= 99.5 ? 'глава прочитана' : `${Math.round(tracker.percent)}% · ещё ${readingTimeLabel(remaining)}`}
          </span>
          <div className="ml-1 flex items-center" style={{ color: 'rgb(var(--r-ink))' }}>
            <button className="icon-btn hidden sm:inline-flex" onClick={() => void toggleBookmark(tracker.currentParagraph())} title="Закладка на текущий абзац (B)">
              <BookmarkPlus size={19} />
            </button>
            <button className="icon-btn" onClick={() => setTocOpen(true)} title="Оглавление и закладки (T)">
              <List size={19} />
            </button>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Настройки текста (S)">
              <CaseSensitive size={20} />
            </button>
            <button className="icon-btn hidden sm:inline-flex" onClick={toggleFullscreen} title="Полный экран (F)">
              {fullscreen ? <Minimize size={18} /> : <Expand size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Текст */}
      <article className="mx-auto px-5 pb-10 pt-28 sm:px-8" style={{ maxWidth: settings.width + 64 }}>
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mb-14 text-center">
          <p className="font-display text-[11px] uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--accent))' }}>
            {volume ? volumeFullTitle(volume) : 'Демонстрация'}
          </p>
          <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{chapter.title}</h1>
          <div className="mx-auto mt-6 flex items-center justify-center gap-3 text-xs" style={{ color: 'rgb(var(--r-muted))' }}>
            <span className="h-px w-10" style={{ background: 'rgb(var(--r-line))' }} />
            <span>{readingTimeLabel(chapter.word_count)} чтения</span>
            <span className="h-px w-10" style={{ background: 'rgb(var(--r-line))' }} />
          </div>
        </motion.header>

        <div className="relative" onMouseMove={onMouseMove} onMouseLeave={() => setHovered(null)}>
          {hovered && (
            <button
              key={hovered.index}
              onClick={() => void toggleBookmark(hovered.index)}
              className="absolute -left-11 z-10 hidden h-8 w-8 items-center justify-center rounded-lg transition-colors [@media(hover:hover)]:flex"
              style={{
                top: hovered.top,
                color: bookmarkedSet.has(hovered.index) ? 'rgb(var(--accent))' : 'rgb(var(--r-muted))',
              }}
              title={bookmarkedSet.has(hovered.index) ? 'Убрать закладку' : 'Добавить закладку'}
              aria-label={bookmarkedSet.has(hovered.index) ? 'Убрать закладку' : 'Добавить закладку'}
            >
              <BookmarkIcon size={17} className={bookmarkedSet.has(hovered.index) ? 'fill-current' : ''} />
            </button>
          )}
          <div ref={container} className="reader-text">
            {blocks.length ? (
              <ChapterText blocks={blocks} bookmarked={bookmarkedSet} onImageClick={(src, alt) => setLightbox({ src, alt })} />
            ) : (
              <p className="rp text-center opacity-70">Текст этой главы ещё не добавлен.</p>
            )}
          </div>
        </div>

        {/* Конец главы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
          className="mt-20 text-center"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
            whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'rgb(var(--accent) / 0.14)', color: 'rgb(var(--accent))' }}
          >
            <CheckCircle2 size={28} />
          </motion.div>
          <p className="mt-4 font-display text-lg font-semibold">Глава завершена</p>
          <p className="mt-1 text-sm" style={{ color: 'rgb(var(--r-muted))' }}>
            {next ? 'Следующая глава уже ждёт.' : isDemo ? 'Теперь можно выбрать том в каталоге.' : 'Это последняя загруженная глава.'}
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {prev ? (
              <Link to={`/read/${prev.id}`} className="group flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors" style={{ borderColor: 'rgb(var(--r-line))' }}>
                <ChevronLeft size={18} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-xs" style={{ color: 'rgb(var(--r-muted))' }}>
                    Предыдущая
                  </span>
                  <span className="block truncate text-sm font-semibold">{prev.title}</span>
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next ? (
              <Link to={`/read/${next.id}`} className="group flex items-center justify-end gap-3 rounded-2xl p-4 text-right text-white transition-transform hover:-translate-y-0.5" style={{ background: 'rgb(var(--accent))' }}>
                <span className="min-w-0">
                  <span className="block text-xs text-white/75">Следующая глава</span>
                  <span className="block truncate text-sm font-semibold">{next.title}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <Link to={isDemo ? '/year/1' : backHref} className="flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-semibold" style={{ borderColor: 'rgb(var(--r-line))' }}>
                {isDemo ? 'Открыть каталог' : 'К оглавлению тома'} <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </motion.div>
      </article>

      {/* Обсуждение главы */}
      <div className="mx-auto max-w-[860px] px-5 pb-32 pt-10 sm:px-8">
        <div className="rounded-3xl border p-5 sm:p-8" style={{ borderColor: 'rgb(var(--r-line))', background: 'rgb(var(--r-surface) / 0.6)' }}>
          {isDemo ? (
            <div className="flex items-center gap-4 text-sm" style={{ color: 'rgb(var(--r-muted))' }}>
              <MessageSquareText size={22} className="shrink-0 text-accent" />
              Под настоящими главами здесь находится обсуждение: комментарии, ответы, лайки и спойлеры.
            </div>
          ) : (
            <CommentSection target={chapterTarget(chapter.id)} heading="Обсуждение главы" />
          )}
        </div>
      </div>

      {/* Нижняя панель (телефон) */}
      <motion.nav
        initial={false}
        animate={{ y: chrome ? 0 : 90 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        style={chromeStyle}
        aria-label="Навигация по главам"
      >
        <div className="grid h-14 grid-cols-5 items-center" style={{ color: 'rgb(var(--r-ink))' }}>
          <button className="flex justify-center disabled:opacity-30" disabled={!prev} onClick={() => prev && navigate(`/read/${prev.id}`)} aria-label="Предыдущая глава">
            <ChevronLeft size={22} />
          </button>
          <button className="flex justify-center" onClick={() => setTocOpen(true)} aria-label="Оглавление">
            <List size={21} />
          </button>
          <button className="flex justify-center" onClick={() => void toggleBookmark(tracker.currentParagraph())} aria-label="Закладка">
            <BookmarkPlus size={21} />
          </button>
          <button className="flex justify-center" onClick={() => setSettingsOpen(true)} aria-label="Настройки">
            <CaseSensitive size={22} />
          </button>
          <button className="flex justify-center disabled:opacity-30" disabled={!next} onClick={() => next && navigate(`/read/${next.id}`)} aria-label="Следующая глава">
            <ChevronRight size={22} />
          </button>
        </div>
      </motion.nav>

      {/* Предложение вернуться к месту чтения */}
      <AnimatePresence>
        {resumeOffer !== null && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4 sm:bottom-8"
          >
            <div className="glass flex items-center gap-3 rounded-full border border-line py-2 pl-4 pr-2 text-sm text-ink shadow-pop">
              <Undo2 size={16} className="text-accent" />
              <span>Вы остановились на {Math.round(saved?.percent ?? 0)}%</span>
              <button
                className="btn-primary rounded-full px-3.5 py-1.5"
                onClick={() => {
                  scrollToParagraph(resumeOffer)
                  setResumeOffer(null)
                }}
              >
                Продолжить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Настройки текста">
        <ReaderSettingsPanel />
      </Drawer>

      <Drawer
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        title={volume ? volumeFullTitle(volume) : 'Демо-глава'}
        side="left"
      >
        <ReaderToc
          chapters={siblings}
          currentId={chapter.id}
          progress={progressMap}
          bookmarks={bookmarks}
          onClose={() => setTocOpen(false)}
          onJump={(p) => {
            setTocOpen(false)
            setTimeout(() => scrollToParagraph(p), 320)
          }}
          onEditNote={(b) => {
            setNoteFor(b)
            setNoteText(b.note)
          }}
        />
        {volume && (
          <Link to={`/volume/${volume.slug}`} className="btn-ghost mt-6 w-full" onClick={() => setTocOpen(false)}>
            Страница тома
          </Link>
        )}
      </Drawer>

      <Modal open={Boolean(noteFor)} onClose={() => setNoteFor(null)} title="Заметка к закладке">
        {noteFor?.excerpt && <p className="mb-4 border-l-2 border-accent/60 pl-3 font-serif text-sm italic text-ink-2">{noteFor.excerpt}</p>}
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          maxLength={1000}
          rows={4}
          className="input resize-none"
          placeholder="Например: «перечитать перед следующим томом»"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void saveNote()
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setNoteFor(null)}>
            Отмена
          </button>
          <button className="btn-primary" onClick={() => void saveNote()}>
            Сохранить
          </button>
        </div>
      </Modal>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[95] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.img
              src={lightbox.src}
              alt={lightbox.alt}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
