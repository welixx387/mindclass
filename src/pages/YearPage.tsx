import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVolumeStats } from '../api/chapters'
import { useProgressList } from '../api/library'
import { VolumeCard } from '../components/catalog/VolumeCard'
import { CountUp } from '../components/ui/misc'
import { getYear, YEARS } from '../data/catalog'
import { readingMinutes } from '../lib/format'
import { isSupabaseConfigured } from '../lib/supabase'
import NotFoundPage from './NotFoundPage'

type Filter = 'all' | 'main' | 'side'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все тома' },
  { id: 'main', label: 'Основные' },
  { id: 'side', label: 'Истории (.5)' },
]

export default function YearPage() {
  const { year: yearParam } = useParams()
  const year = getYear(yearParam)
  const [filter, setFilter] = useState<Filter>('all')
  const { data: stats } = useVolumeStats()
  const { data: progress } = useProgressList()

  const completedByVolume = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of progress ?? []) if (p.completed) map.set(p.volume_slug, (map.get(p.volume_slug) ?? 0) + 1)
    return map
  }, [progress])

  if (!year) return <NotFoundPage />

  const totals = year.volumes.reduce(
    (acc, v) => {
      const s = stats?.get(v.slug)
      return { chapters: acc.chapters + (s?.chapters ?? 0), words: acc.words + (s?.words ?? 0) }
    },
    { chapters: 0, words: 0 }
  )
  const hours = Math.round(readingMinutes(totals.words) / 60)
  const volumes = year.volumes.filter((v) => filter === 'all' || v.kind === filter)
  const accentVar = year.number === 1 ? '--year-1' : '--year-2'

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <div className="mb-10 flex gap-2">
        {YEARS.map((y) => (
          <Link key={y.number} to={`/year/${y.number}`} className="relative rounded-full px-4 py-2 text-sm font-semibold">
            {y.number === year.number && (
              <motion.span layoutId="year-pill" className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className={`relative ${y.number === year.number ? 'text-ink' : 'text-muted hover:text-ink'}`}>{y.title}</span>
          </Link>
        ))}
      </div>

      <header className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <motion.p
            key={`e${year.number}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow"
            style={{ color: `rgb(var(${accentVar}))` }}
          >
            Добро пожаловать в класс превосходства
          </motion.p>
          <motion.h1
            key={`t${year.number}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-6xl"
          >
            {year.title}
          </motion.h1>
          <motion.p
            key={`d${year.number}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2"
          >
            {year.description}
          </motion.p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: year.volumes.length, label: 'томов' },
            { value: totals.chapters, label: 'глав загружено' },
            { value: hours, label: 'часов чтения' },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-4">
              <CountUp value={s.value} className="font-display text-2xl font-semibold" />
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="mb-8 mt-12 flex flex-wrap items-center gap-2 border-b border-line/60 pb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${filter === f.id ? 'text-white' : 'text-ink-2 hover:text-ink'}`}
          >
            {filter === f.id && (
              <motion.span
                layoutId="filter-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: `rgb(var(${accentVar}))` }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {volumes.map((v, i) => (
          <motion.div key={v.slug} layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <VolumeCard volume={v} index={i} chapters={!isSupabaseConfigured ? 0 : stats ? (stats.get(v.slug)?.chapters ?? 0) : undefined} completed={completedByVolume.get(v.slug) ?? 0} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
