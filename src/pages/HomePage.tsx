import { motion } from 'framer-motion'
import { ArrowRight, BookOpenText, Bookmark, MessagesSquare, Play, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLatestChapters, useVolumeStats } from '../api/chapters'
import { useRecentComments } from '../api/comments'
import { useProgressList } from '../api/library'
import { ChessPiece } from '../components/brand/ChessPiece'
import { TiltCard } from '../components/catalog/VolumeCard'
import { VolumeCover } from '../components/catalog/VolumeCover'
import { HeroBoard } from '../components/home/HeroBoard'
import { QuoteRotator } from '../components/home/QuoteRotator'
import { Avatar, ClassBadge, CLASS_INFO } from '../components/ui/Avatar'
import { CountUp, ProgressRing, Reveal, SectionTitle } from '../components/ui/misc'
import { ALL_VOLUMES, getVolume, SERIES, volumeFullTitle, YEARS, type Year } from '../data/catalog'
import { DEMO_CHAPTER } from '../data/demoChapter'
import { commentPreview } from '../lib/commentFormat'
import { countLabel, plural, timeAgo } from '../lib/format'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ClassLetter } from '../lib/types'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'

const EASE = [0.22, 1, 0.36, 1] as const

function Hero() {
  const { data: stats } = useVolumeStats()
  const totalChapters = useMemo(() => [...(stats?.values() ?? [])].reduce((sum, s) => sum + s.chapters, 0), [stats])
  const words = ['Читай.', 'Анализируй.', 'Побеждай.']

  return (
    <section className="container-page relative grid items-center gap-10 pb-12 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-20 lg:pt-16">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="chip mb-6 border-accent/30 bg-accent/10 text-accent"
        >
          <Sparkles size={13} /> Ранобэ онлайн · 1 и 2 год обучения
        </motion.div>

        <h1 className="font-display text-[clamp(32px,10.5vw,44px)] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[68px]">
          {words.map((word, i) => (
            <span key={word} className="block overflow-hidden pb-1">
              <motion.span
                className={`block ${i === words.length - 1 ? 'text-gradient' : ''}`}
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2"
        >
          MindClass — читалка ранобэ «{SERIES.title}». Все тома первого и второго года обучения, настройки текста под себя,
          закладки и обсуждение каждой главы.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.62, ease: EASE }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link to="/volume/y1-v1" className="btn-primary px-6 py-3 text-[15px]">
            <Play size={17} className="fill-current" /> Начать с первого тома
          </Link>
          <Link to="/year/1" className="btn-ghost px-6 py-3 text-[15px]">
            Каталог томов <ArrowRight size={17} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line/60 pt-6"
        >
          <div>
            <CountUp value={ALL_VOLUMES.length} className="font-display text-2xl font-semibold" />
            <p className="mt-1 text-xs text-muted">томов в каталоге</p>
          </div>
          <div>
            <CountUp value={YEARS.length} className="font-display text-2xl font-semibold" />
            <p className="mt-1 text-xs text-muted">года обучения</p>
          </div>
          <div>
            {totalChapters > 0 ? (
              <CountUp value={totalChapters} className="font-display text-2xl font-semibold" />
            ) : (
              <span className="font-display text-2xl font-semibold">∞</span>
            )}
            <p className="mt-1 text-xs text-muted">{totalChapters > 0 ? `${plural(totalChapters, ['глава', 'главы', 'глав'])} уже здесь` : 'интриг и ходов'}</p>
          </div>
        </motion.div>
      </div>

      <HeroBoard />
    </section>
  )
}

function ContinueReading() {
  const { data: progress } = useProgressList()
  const last = progress?.find((p) => !p.completed || p.percent < 99)
  if (!last) return null
  const volume = getVolume(last.volume_slug)
  const isDemo = last.chapter_id < 0
  const title = isDemo ? DEMO_CHAPTER.title : last.chapter_title ?? 'Глава'

  return (
    <section className="container-page -mt-2 mb-16">
      <Reveal>
        <Link
          to={isDemo ? '/demo?continue=1' : `/read/${last.chapter_id}?continue=1`}
          className="card group flex items-center gap-5 overflow-hidden p-4 pr-6 transition-colors hover:border-accent/40 sm:p-5"
        >
          <div className="w-16 shrink-0 overflow-hidden rounded-xl sm:w-20">
            {volume ? (
              <VolumeCover volume={volume} showMeta={false} />
            ) : (
              <div className="flex aspect-[5/7] items-center justify-center bg-surface-2 text-accent">
                <ChessPiece piece="knight" size={28} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Продолжить чтение</p>
            <p className="mt-1.5 truncate font-display text-lg font-semibold">{title}</p>
            <p className="mt-0.5 truncate text-sm text-ink-2">{volume ? volumeFullTitle(volume) : 'Демо-глава'}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-line/80">
                <div className="h-full rounded-full bg-accent" style={{ width: `${last.percent}%` }} />
              </div>
              <span className="text-xs text-muted">{Math.round(last.percent)}%</span>
            </div>
          </div>
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform duration-300 group-hover:scale-110 sm:flex">
            <Play size={18} className="ml-0.5 fill-current" />
          </span>
        </Link>
      </Reveal>
    </section>
  )
}

function YearCard({ year, index }: { year: Year; index: number }) {
  const { data: stats } = useVolumeStats()
  const chapters = year.volumes.reduce((sum, v) => sum + (stats?.get(v.slug)?.chapters ?? 0), 0)
  const main = year.volumes.filter((v) => v.kind === 'main')
  const fan = [main[0], main[Math.floor(main.length / 2)], main[main.length - 1]]
  const colorVar = year.number === 1 ? '--year-1' : '--year-2'

  return (
    <Reveal delay={index * 0.1}>
      <Link
        to={`/year/${year.number}`}
        className="card group relative flex h-full flex-col overflow-hidden p-6 transition-colors duration-300 hover:border-[rgb(var(--c)/0.5)] sm:p-8"
        style={{ '--c': `var(${colorVar})` } as React.CSSProperties}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
          style={{ background: `rgb(var(${colorVar}) / 0.35)` }}
        />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow" style={{ color: `rgb(var(${colorVar}))` }}>
              {countLabel(year.volumes.length, ['том', 'тома', 'томов'])}
              {chapters > 0 && ` · ${countLabel(chapters, ['глава', 'главы', 'глав'])}`}
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">{year.title}</h3>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">{year.tagline}</p>
          </div>
        </div>

        <div className="relative mt-8 flex h-56 items-end justify-center sm:h-64">
          {fan.map((v, i) => (
            <div
              key={v.slug}
              className="absolute bottom-0 w-32 transition-transform duration-500 ease-out sm:w-40"
              style={{
                transform: `translateX(${(i - 1) * 62}%) rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -14 : 0}px)`,
                zIndex: i === 1 ? 2 : 1,
              }}
            >
              <div
                className="overflow-hidden rounded-xl shadow-card ring-1 ring-line/60 transition-transform duration-500 ease-out group-hover:[transform:var(--hover)]"
                style={{ '--hover': `translateX(${(i - 1) * 16}px) rotate(${(i - 1) * 4}deg) translateY(-8px)` } as React.CSSProperties}
              >
                <VolumeCover volume={v} />
              </div>
            </div>
          ))}
        </div>

        <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: `rgb(var(${colorVar}))` }}>
          Открыть тома <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>
    </Reveal>
  )
}

function LatestChapters() {
  const { data } = useLatestChapters(6)
  if (!data?.length) return null
  return (
    <section className="container-page mt-24">
      <SectionTitle eyebrow="Обновления" title="Новые главы" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((chapter, i) => {
          const volume = getVolume(chapter.volume_slug)
          return (
            <Reveal key={chapter.id} delay={i * 0.05}>
              <Link to={`/read/${chapter.id}`} className="card group flex items-center gap-4 p-3 pr-4 transition-colors hover:border-accent/40">
                <div className="w-12 shrink-0 overflow-hidden rounded-lg">{volume && <VolumeCover volume={volume} showMeta={false} />}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold transition-colors group-hover:text-accent">{chapter.title}</p>
                  <p className="truncate text-xs text-muted">
                    {volume ? volumeFullTitle(volume) : ''} · {timeAgo(chapter.created_at)}
                  </p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: SlidersHorizontal,
    title: 'Читалка под вас',
    text: 'Шрифт, размер, интервалы, ширина колонки и пять тем — от «Белой комнаты» до чистого чёрного.',
  },
  {
    icon: Bookmark,
    title: 'Закладки и прогресс',
    text: 'Отмечайте абзацы, добавляйте заметки и продолжайте ровно с того места, где остановились.',
  },
  {
    icon: MessagesSquare,
    title: 'Обсуждения без спойлеров',
    text: 'Комментарии под каждой главой и томом, ответы, лайки и скрытые спойлеры.',
  },
  {
    icon: Search,
    title: 'Поиск по тексту',
    text: 'Вспомнили фразу, но не главу? Поиск найдёт её во всех загруженных томах.',
  },
]

function Features() {
  return (
    <section className="container-page mt-24">
      <SectionTitle eyebrow="Возможности" title="Всё для спокойного чтения" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08}>
            <div className="card group h-full p-6 transition-colors duration-300 hover:border-accent/35">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-6deg]">
                <f.icon size={20} />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <Link to="/demo" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
          <BookOpenText size={16} /> Попробовать читалку на демо-главе
        </Link>
      </Reveal>
    </section>
  )
}

function RecentComments() {
  const { data } = useRecentComments(6)
  if (!data?.length) return null
  return (
    <section className="container-page mt-24">
      <SectionTitle eyebrow="Сообщество" title="Обсуждают сейчас" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.05}>
            <Link to={c.href} className="card group flex h-full flex-col p-5 transition-colors hover:border-accent/35">
              <div className="flex items-center gap-3">
                <Avatar piece={c.author?.avatar_piece ?? 'pawn'} color={c.author?.avatar_color ?? 'graphite'} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.author?.username ?? 'Читатель'}</p>
                  <p className="text-xs text-muted">{timeAgo(c.created_at)}</p>
                </div>
                {c.author && <ClassBadge letter={c.author.class_letter} className="ml-auto" />}
              </div>
              <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-2">{commentPreview(c.body, 220)}</p>
              <p className="mt-4 truncate border-t border-line/60 pt-3 text-xs text-muted">
                <span className="text-ink-2 group-hover:text-accent">{c.placeTitle}</span> · {c.placeSubtitle}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function JoinCta() {
  const status = useAuth((s) => s.status)
  if (status !== 'signed-out') return null
  const letters: ClassLetter[] = ['A', 'B', 'C', 'D']
  return (
    <section className="container-page mt-24">
      <Reveal>
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">Регистрация</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">В каком вы классе?</h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-2">
                Создайте аккаунт, выберите класс и фигуру для аватара — и оставляйте комментарии под главами, а закладки будут с вами на
                любом устройстве.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary px-6 py-3">
                  Зачислиться <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="btn-ghost px-6 py-3">
                  У меня есть аккаунт
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {letters.map((letter, i) => (
                <motion.div
                  key={letter}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                >
                  <TiltCard intensity={8} className="rounded-2xl">
                    <div
                      className="rounded-2xl border p-5"
                      style={{ borderColor: `rgb(${CLASS_INFO[letter].color} / 0.35)`, background: `rgb(${CLASS_INFO[letter].color} / 0.08)` }}
                    >
                      <p className="font-display text-4xl font-bold" style={{ color: `rgb(${CLASS_INFO[letter].color})` }}>
                        {letter}
                      </p>
                      <p className="mt-2 text-xs text-ink-2">{CLASS_INFO[letter].motto}</p>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function DemoTeaser() {
  const setSearchOpen = useUi((s) => s.setSearchOpen)
  if (isSupabaseConfigured) return null
  return (
    <section className="container-page mt-16">
      <Reveal>
        <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <ProgressRing percent={60} size={26} />
          </div>
          <p className="flex-1 text-sm text-ink-2">
            Главы пока не загружены. Откройте демо-главу, чтобы попробовать настройки, закладки и прогресс чтения, или загляните в поиск (
            <button className="link" onClick={() => setSearchOpen(true)}>
              Ctrl K
            </button>
            ).
          </p>
          <Link to="/demo" className="btn-ghost">
            Открыть демо
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export function HomePage() {
  return (
    <>
      <Hero />
      <ContinueReading />
      <DemoTeaser />

      <section className="container-page mt-12">
        <SectionTitle eyebrow="Каталог" title="Выберите год обучения" />
        <div className="grid gap-5 lg:grid-cols-2">
          {YEARS.map((year, i) => (
            <YearCard key={year.number} year={year} index={i} />
          ))}
        </div>
      </section>

      <section className="mt-28">
        <Reveal>
          <QuoteRotator />
        </Reveal>
      </section>

      <LatestChapters />
      <Features />
      <RecentComments />
      <JoinCta />
    </>
  )
}
