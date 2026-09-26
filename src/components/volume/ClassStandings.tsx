import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, BarChart3, Eye, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClassPoints } from '../../api/site'
import { volumeFullTitle } from '../../data/catalog'
import { formatDelta, volumeStandings, type StandingRow } from '../../lib/classPoints'
import { plural } from '../../lib/format'
import { useAuth } from '../../store/auth'

const EASE = [0.22, 1, 0.36, 1] as const
const POINT_FORMS: [string, string, string] = ['очко', 'очка', 'очков']

function describe(row: StandingRow, place: number): string {
  const parts = [`${place} место: ${row.group.name}, класс ${row.letter}, ${row.points.toLocaleString('ru-RU')} ${plural(row.points, POINT_FORMS)}`]
  if (row.delta !== null) parts.push(`за том ${formatDelta(row.delta)}`)
  if (row.previousLetter) parts.push(`раньше был класс ${row.previousLetter}`)
  return parts.join(', ')
}

function Delta({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : null
  const tone = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {Icon && <Icon size={13} strokeWidth={2.5} aria-hidden="true" />}
      {formatDelta(delta)}
    </span>
  )
}

function Row({ row, place, animate }: { row: StandingRow; place: number; animate: boolean }) {
  const width = row.points > 0 ? `max(${(row.share * 100).toFixed(2)}%, 3px)` : '0px'
  return (
    <li
      title={describe(row, place)}
      className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-2 py-3 transition-colors hover:bg-surface-2/60 sm:gap-x-4 sm:px-3"
    >
      <span className="sr-only">{describe(row, place)}</span>
      <span aria-hidden="true" className="text-center font-display text-sm tabular-nums text-muted">
        {place}
      </span>
      <div aria-hidden="true" className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2/70 font-display text-xs font-bold text-ink">
            {row.letter}
          </span>
          <span className="truncate text-sm font-semibold text-ink">{row.group.name}</span>
          {row.group.tag && <span className="hidden shrink-0 rounded-full border border-line px-2 text-[10px] leading-5 text-ink-2 sm:inline">{row.group.tag}</span>}
          {row.previousLetter && <span className="shrink-0 text-[11px] text-muted">было {row.previousLetter}</span>}
        </div>
        <div className="mt-2 h-2.5">
          <motion.div
            className="h-full rounded-r-[4px] bg-accent"
            initial={animate ? { width: 0 } : false}
            whileInView={{ width }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 + place * 0.08, ease: EASE }}
            style={animate ? undefined : { width }}
          />
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col items-end">
        <span className="font-display text-base font-semibold tabular-nums text-ink">{row.points.toLocaleString('ru-RU')}</span>
        {row.delta !== null && <Delta delta={row.delta} />}
      </div>
    </li>
  )
}

/**
 * Итоги тома: очки четырёх классов на конец тома, по убыванию, с изменением
 * относительно прошлого тома. На странице тома цифры скрыты, пока читатель
 * сам их не откроет: они могут раскрыть сюжет.
 */
export function ClassStandings({ slug, guard = false, className = '' }: { slug: string; guard?: boolean; className?: string }) {
  const { data: map } = useClassPoints()
  const isAdmin = useAuth((s) => s.profile?.role === 'admin')
  const reduceMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const standings = map ? volumeStandings(slug, map) : null
  const editHref = `/admin/class-points?volume=${encodeURIComponent(slug)}`

  if (!standings) {
    if (!isAdmin || !map) return null
    return (
      <div className={`card flex flex-wrap items-center justify-between gap-4 border-dashed p-5 ${className}`}>
        <div>
          <p className="font-semibold">Очки классов не внесены</p>
          <p className="mt-1 text-sm text-muted">Когда вы их добавите, читатели увидят здесь итоги тома.</p>
        </div>
        <Link to={editHref} className="btn-ghost">
          <BarChart3 size={15} /> Внести очки
        </Link>
      </div>
    )
  }

  const hidden = guard && !revealed

  return (
    <section className={`card p-5 sm:p-7 ${className}`} aria-labelledby={`standings-${slug}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Итоги тома</p>
          <h2 id={`standings-${slug}`} className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Очки классов
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            На конец тома.
            {standings.previous && ` Изменения — по сравнению с концом тома «${volumeFullTitle(standings.previous)}».`}
          </p>
        </div>
        {isAdmin && (
          <Link to={editHref} className="icon-btn h-9 w-9 shrink-0" title="Изменить очки" aria-label="Изменить очки">
            <Pencil size={15} />
          </Link>
        )}
      </div>

      <div className="relative mt-5">
        <ol key={hidden ? 'hidden' : 'shown'} aria-hidden={hidden} className={`-mx-2 space-y-1 transition-[filter] duration-500 sm:-mx-3 ${hidden ? 'pointer-events-none select-none blur-md' : ''}`}>
          {standings.rows.map((row, i) => (
            <Row key={row.group.id} row={row} place={i + 1} animate={!reduceMotion && !hidden} />
          ))}
        </ol>
        {hidden && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-xs text-sm text-ink-2">Итоги могут раскрыть сюжет тома.</p>
            <button type="button" className="btn-ghost" onClick={() => setRevealed(true)}>
              <Eye size={15} /> Показать очки
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
