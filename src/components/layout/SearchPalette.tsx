import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CornerDownLeft, FileText, Loader2, Search, TextSearch } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { searchChapters, searchChapterTitles } from '../../api/profiles'
import { ALL_VOLUMES, getVolume, volumeFullTitle } from '../../data/catalog'
import { escapeHtml } from '../../lib/markup'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { SearchHit } from '../../lib/types'
import { useUi } from '../../store/ui'

interface Result {
  key: string
  group: 'Тома' | 'Главы' | 'В тексте'
  title: string
  subtitle: string
  href: string
  snippetHtml?: string
}

function snippetToHtml(snippet: string): string {
  const clean = snippet.replace(/\*\*|(^|\s)[>#]+\s/g, '$1').replace(/\s+/g, ' ')
  return escapeHtml(clean).replace(/⟦/g, '<mark>').replace(/⟧/g, '</mark>')
}

function matchVolumes(q: string): Result[] {
  const query = q.toLowerCase().replace(/^том\s*/, '').trim()
  if (!query) return []
  return ALL_VOLUMES.filter((v) => {
    const hay = `${v.number} ${v.theme} ${v.description} ${v.year} год`.toLowerCase()
    return v.number === query || hay.includes(query)
  })
    .slice(0, 5)
    .map((v) => ({
      key: `v-${v.slug}`,
      group: 'Тома',
      title: volumeFullTitle(v),
      subtitle: v.theme,
      href: `/volume/${v.slug}`,
    }))
}

function chapterSubtitle(hit: Pick<SearchHit, 'volume_slug'>) {
  const v = getVolume(hit.volume_slug)
  return v ? volumeFullTitle(v) : ''
}

export function SearchPalette() {
  const open = useUi((s) => s.searchOpen)
  const setOpen = useUi((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [loose, setLoose] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  // Горячие клавиши: Ctrl/⌘ + K и «/».
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = /input|textarea|select/i.test(target.tagName) || target.isContentEditable
      // e.code не зависит от раскладки: в русской Ctrl+K приходит как «л».
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setOpen(!useUi.getState().searchOpen)
      } else if ((e.key === '/' || e.code === 'Slash') && !e.shiftKey && !typing && !useUi.getState().searchOpen) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => {
    if (open) {
      setTimeout(() => input.current?.focus(), 40)
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    setQuery('')
    setRemote([])
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!isSupabaseConfigured || q.length < 2) {
      setRemote([])
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const [titles, text] = await Promise.all([
          searchChapterTitles(q),
          q.length >= 3 ? searchChapters(q) : Promise.resolve({ hits: [] as SearchHit[], loose: false }),
        ])
        if (cancelled) return
        const titleIds = new Set(titles.map((t) => t.id))
        setLoose(text.loose)
        setRemote([
          ...titles.map<Result>((t) => ({
            key: `c-${t.id}`,
            group: 'Главы',
            title: t.title,
            subtitle: chapterSubtitle(t),
            href: `/read/${t.id}`,
          })),
          ...text.hits
            .filter((h) => !titleIds.has(h.id) || h.snippet.includes('⟦'))
            .map<Result>((h) => ({
              key: `t-${h.id}`,
              group: 'В тексте',
              title: h.title,
              subtitle: chapterSubtitle(h),
              href: `/read/${h.id}?q=${encodeURIComponent(q)}`,
              snippetHtml: snippetToHtml(h.snippet),
            })),
        ])
      } catch {
        if (!cancelled) setRemote([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const results = useMemo(() => [...matchVolumes(query), ...remote], [query, remote])
  useEffect(() => setActive(0), [results.length, query])

  const go = (r: Result | undefined) => {
    if (!r) return
    setOpen(false)
    navigate(r.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const groups: Result['group'][] = ['Тома', 'Главы', 'В тексте']
  const icons = { Тома: BookOpen, Главы: FileText, 'В тексте': TextSearch }
  let flatIndex = -1

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Поиск"
            initial={{ y: -16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-elev shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-5">
              {loading ? <Loader2 size={18} className="animate-spin text-muted" /> : <Search size={18} className="text-muted" />}
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Том, название главы или слова из текста…"
                className="h-16 flex-1 bg-transparent text-base text-ink placeholder:text-muted/80 focus:outline-none"
                aria-label="Поисковый запрос"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>

            <div ref={list} className="max-h-[60vh] overflow-y-auto p-2">
              {!query.trim() && (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  Например: <span className="text-ink-2">«том 4.5»</span>, <span className="text-ink-2">«остров»</span> или фраза, которую вы запомнили.
                  {!isSupabaseConfigured && <p className="mt-2 text-xs">Поиск по тексту глав заработает после подключения базы.</p>}
                </div>
              )}
              {query.trim() && !loading && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted">Ничего не нашлось. Попробуйте другие слова.</div>
              )}
              {groups.map((group) => {
                const items = results.filter((r) => r.group === group)
                if (!items.length) return null
                const Icon = icons[group]
                return (
                  <div key={group} className="mb-2">
                    <p className="eyebrow px-3 pb-1 pt-2">
                      {group}
                      {group === 'В тексте' && loose && <span className="ml-2 normal-case tracking-normal">(любое из слов)</span>}
                    </p>
                    {items.map((r) => {
                      flatIndex++
                      const i = flatIndex
                      const isActive = i === active
                      return (
                        <button
                          key={r.key}
                          data-index={i}
                          onMouseMove={() => setActive(i)}
                          onClick={() => go(r)}
                          className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-surface-2' : ''}`}
                        >
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'}`}>
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                            <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                            {r.snippetHtml && (
                              <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-2" dangerouslySetInnerHTML={{ __html: r.snippetHtml }} />
                            )}
                          </span>
                          {isActive && <CornerDownLeft size={14} className="mt-2 shrink-0 text-muted" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
