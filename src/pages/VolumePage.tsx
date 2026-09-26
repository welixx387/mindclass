import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, FileUp, MessageCircle, Play, Settings2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVolumeChapters } from '../api/chapters'
import { chapterTarget, useCommentCounts, volumeTarget } from '../api/comments'
import { useProgressList } from '../api/library'
import { TiltCard } from '../components/catalog/VolumeCard'
import { VolumeCover } from '../components/catalog/VolumeCover'
import { CommentSection } from '../components/comments/CommentSection'
import { EmptyState, ProgressRing } from '../components/ui/misc'
import { adjacentVolumes, getVolume, getYear, volumeFullTitle, volumeTitle } from '../data/catalog'
import { countLabel, readingTimeLabel } from '../lib/format'
import { isSupabaseConfigured } from '../lib/supabase'
import { useIsAdmin } from '../store/auth'
import NotFoundPage from './NotFoundPage'

const WEEK = 7 * 24 * 3600 * 1000

export default function VolumePage() {
  const { slug } = useParams()
  const volume = getVolume(slug)
  const isAdmin = useIsAdmin()
  const { data: chapters, isLoading } = useVolumeChapters(volume?.slug)
  const { data: progress } = useProgressList()
  const targets = useMemo(() => (chapters ?? []).map((c) => chapterTarget(c.id)), [chapters])
  const { data: counts } = useCommentCounts(targets)

  const progressById = useMemo(() => new Map((progress ?? []).map((p) => [p.chapter_id, p])), [progress])

  if (!volume) return <NotFoundPage />

  const year = getYear(volume.year)!
  const { prev, next } = adjacentVolumes(volume.slug)
  const list = chapters ?? []
  const words = list.reduce((sum, c) => sum + c.word_count, 0)
  const completed = list.filter((c) => progressById.get(c.id)?.completed).length
  const lastRead = (progress ?? []).find((p) => p.volume_slug === volume.slug && list.some((c) => c.id === p.chapter_id))
  const resumeChapter = lastRead
    ? lastRead.completed
      ? list[list.findIndex((c) => c.id === lastRead.chapter_id) + 1] ?? list.find((c) => c.id === lastRead.chapter_id)
      : list.find((c) => c.id === lastRead.chapter_id)
    : undefined
  const accentVar = volume.year === 1 ? '--year-1' : '--year-2'

  return (
    <div className="container-page pb-10 pt-6 sm:pt-10">
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted" aria-label="Навигация">
        <Link to="/" className="hover:text-ink">
          Главная
        </Link>
        <ChevronRight size={14} />
        <Link to={`/year/${volume.year}`} className="hover:text-ink">
          {year.title}
        </Link>
        <ChevronRight size={14} />
        <span className="text-ink-2">{volumeTitle(volume)}</span>
      </nav>

      <section className="grid gap-10 md:grid-cols-[minmax(0,300px)_1fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[300px]"
        >
          <TiltCard intensity={12} className="overflow-hidden rounded-3xl shadow-card ring-1 ring-line/60">
            <VolumeCover volume={volume} />
          </TiltCard>
        </motion.div>

        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <p className="eyebrow" style={{ color: `rgb(var(${accentVar}))` }}>
              {year.title}
              {volume.kind === 'side' && ' · сборник историй'}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{volumeTitle(volume)}</h1>
            <p className="mt-2 font-display text-lg text-ink-2">{volume.theme}</p>
            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-2">{volume.description}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-6 flex flex-wrap gap-2">
            {list.length > 0 && (
              <>
                <span className="chip">
                  <BookOpen size={13} /> {countLabel(list.length, ['глава', 'главы', 'глав'])}
                </span>
                <span className="chip">
                  <Clock3 size={13} /> ≈ {readingTimeLabel(words)}
                </span>
                {completed > 0 && (
                  <span className="chip border-success/30 text-success">
                    <Check size={13} /> прочитано {completed} из {list.length}
                  </span>
                )}
              </>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
            {resumeChapter ? (
              <Link to={`/read/${resumeChapter.id}?continue=1`} className="btn-primary px-6 py-3">
                <Play size={16} className="fill-current" /> Продолжить: {resumeChapter.title}
              </Link>
            ) : list.length > 0 ? (
              <Link to={`/read/${list[0].id}`} className="btn-primary px-6 py-3">
                <Play size={16} className="fill-current" /> Читать с начала
              </Link>
            ) : null}
            <a href="#comments" className="btn-ghost px-5 py-3">
              <MessageCircle size={16} /> Обсуждение тома
            </a>
            {isAdmin && (
              <Link to={`/admin/volume/${volume.slug}`} className="btn-quiet px-4 py-3">
                <Settings2 size={16} /> Управлять главами
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Оглавление</h2>
          {list.length > 0 && <span className="text-sm text-muted">{countLabel(words, ['слово', 'слова', 'слов'])}</span>}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="Главы этого тома ещё не загружены"
            action={
              <>
                {isAdmin && (
                  <Link to={`/admin/volume/${volume.slug}`} className="btn-primary">
                    <FileUp size={16} /> Загрузить главы
                  </Link>
                )}
                <Link to="/demo" className="btn-ghost">
                  Посмотреть демо читалки
                </Link>
              </>
            }
          >
            {isSupabaseConfigured
              ? 'Как только администратор добавит текст, главы появятся здесь. А пока можно заглянуть в обсуждение тома.'
              : 'Подключите Supabase и загрузите главы через админ-панель — они появятся здесь.'}
          </EmptyState>
        ) : (
          <ol className="overflow-hidden rounded-3xl border border-line/70 bg-surface/60">
            {list.map((chapter, i) => {
              const p = progressById.get(chapter.id)
              const comments = counts?.get(chapterTarget(chapter.id)) ?? 0
              const isNew = Date.now() - new Date(chapter.created_at).getTime() < WEEK
              return (
                <motion.li
                  key={chapter.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: Math.min(i, 10) * 0.035 }}
                  className="border-b border-line/60 last:border-b-0"
                >
                  <Link to={`/read/${chapter.id}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2/70 sm:px-6">
                    <span className="w-8 shrink-0 text-center font-display text-sm text-muted transition-colors group-hover:text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[15px] font-semibold">
                        <span className="truncate">{chapter.title}</span>
                        {!chapter.is_published && <span className="chip border-gold/40 py-0 text-[10px] text-gold">черновик</span>}
                        {isNew && chapter.is_published && <span className="chip border-accent/40 py-0 text-[10px] text-accent">новое</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {readingTimeLabel(chapter.word_count)}
                        {comments > 0 && (
                          <span className="ml-3 inline-flex items-center gap-1">
                            <MessageCircle size={11} /> {comments}
                          </span>
                        )}
                      </p>
                    </div>
                    {p?.completed ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success" title="Прочитано">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    ) : p ? (
                      <span title={`Прочитано ${Math.round(p.percent)}%`}>
                        <ProgressRing percent={p.percent} />
                      </span>
                    ) : null}
                    <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </motion.li>
              )
            })}
          </ol>
        )}
      </section>

      <nav className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Соседние тома">
        {prev ? (
          <Link to={`/volume/${prev.slug}`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
            <ArrowLeft size={18} className="text-muted transition-transform group-hover:-translate-x-1 group-hover:text-accent" />
            <div className="min-w-0">
              <p className="text-xs text-muted">Предыдущий том</p>
              <p className="truncate font-semibold">
                {volumeFullTitle(prev)} · {prev.theme}
              </p>
            </div>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/volume/${next.slug}`} className="card group flex items-center justify-end gap-4 p-4 text-right transition-colors hover:border-accent/40">
            <div className="min-w-0">
              <p className="text-xs text-muted">Следующий том</p>
              <p className="truncate font-semibold">
                {volumeFullTitle(next)} · {next.theme}
              </p>
            </div>
            <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        )}
      </nav>

      <div className="mt-20">
        <CommentSection target={volumeTarget(volume.slug)} heading="Обсуждение тома" />
      </div>
    </div>
  )
}
