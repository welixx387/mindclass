import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { saveClassPoints } from '../../api/admin'
import { queryClient } from '../../api/queryClient'
import { classPointsQueryKey, useClassPoints } from '../../api/site'
import { VolumeCover } from '../../components/catalog/VolumeCover'
import { confirmDialog } from '../../components/ui/Overlay'
import { PageLoader } from '../../components/ui/misc'
import { toast } from '../../components/ui/Toaster'
import { getVolume, volumeFullTitle, YEARS, type Volume } from '../../data/catalog'
import {
  CLASS_GROUPS,
  LETTERS,
  MAX_POINTS,
  previousWithPoints,
  type ClassGroup,
  type ClassPointsMap,
  type VolumePoints,
} from '../../lib/classPoints'
import type { ClassLetter } from '../../lib/types'
import { translateError } from '../../store/auth'

type Draft = Record<ClassGroup, { letter: ClassLetter; points: string }>

function toDraft(source: VolumePoints | null, withPoints: boolean): Draft {
  const draft = {} as Draft
  for (const g of CLASS_GROUPS) {
    draft[g.id] = {
      letter: source?.[g.id].letter ?? g.start,
      points: withPoints && source ? String(source[g.id].points) : '',
    }
  }
  return draft
}

/** Проверяет черновик: очки — целые числа от 0 до MAX_POINTS. */
function fromDraft(draft: Draft): VolumePoints | string {
  const result = {} as VolumePoints
  for (const g of CLASS_GROUPS) {
    const raw = draft[g.id].points.trim()
    if (!/^\d+$/.test(raw)) return `Укажите очки для «${g.name}» целым числом`
    const points = Number(raw)
    if (points > MAX_POINTS) return `Слишком большое число у «${g.name}»`
    result[g.id] = { letter: draft[g.id].letter, points }
  }
  return result
}

function summary(points: VolumePoints): string {
  return CLASS_GROUPS.map((g) => points[g.id])
    .sort((a, b) => a.letter.localeCompare(b.letter))
    .map((s) => `${s.letter} ${s.points.toLocaleString('ru-RU')}`)
    .join(' · ')
}

function Editor({ volume, map, onClose }: { volume: Volume; map: ClassPointsMap; onClose: () => void }) {
  const current = map[volume.slug] ?? null
  const previous = previousWithPoints(volume.slug, map)
  const [draft, setDraft] = useState<Draft>(() => toDraft(current ?? (previous ? map[previous.slug] : null), Boolean(current)))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)

  // Выбрали букву, которая уже у другого класса, — классы меняются буквами.
  const setLetter = (group: ClassGroup, letter: ClassLetter) =>
    setDraft((d) => {
      const other = CLASS_GROUPS.find((g) => g.id !== group && d[g.id].letter === letter)
      const next = { ...d, [group]: { ...d[group], letter } }
      if (other) next[other.id] = { ...d[other.id], letter: d[group].letter }
      return next
    })

  const persist = async (nextMap: ClassPointsMap, kind: 'save' | 'remove') => {
    setBusy(kind)
    try {
      await saveClassPoints(nextMap)
      queryClient.setQueryData(classPointsQueryKey, nextMap)
      toast.success(kind === 'save' ? 'Очки сохранены' : 'Очки тома удалены', { description: volumeFullTitle(volume) })
      onClose()
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
    } finally {
      setBusy(null)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = fromDraft(draft)
    if (typeof parsed === 'string') return setError(parsed)
    setError(null)
    void persist({ ...map, [volume.slug]: parsed }, 'save')
  }

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Удалить очки тома?',
      description: 'Итоги пропадут со страницы тома и из конца последней главы.',
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    const nextMap = { ...map }
    delete nextMap[volume.slug]
    void persist(nextMap, 'remove')
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="space-y-3 border-t border-line/60 px-4 pb-5 pt-4 sm:px-5">
        <p className="text-xs text-muted">Очки на конец тома. Буква — какой класс у них был в этот момент.</p>
        {CLASS_GROUPS.map((g) => (
          <div key={g.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_9rem] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{g.name}</p>
              {g.tag && <p className="text-xs text-muted">{g.tag}</p>}
            </div>
            <div className="flex gap-1" role="radiogroup" aria-label={`Буква: ${g.name}`}>
              {LETTERS.map((letter) => {
                const active = draft[g.id].letter === letter
                return (
                  <button
                    key={letter}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLetter(g.id, letter)}
                    className={`h-9 w-9 rounded-xl border font-display text-sm font-bold transition-colors ${
                      active ? 'border-accent bg-accent/12 text-accent' : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
            <input
              inputMode="numeric"
              value={draft[g.id].points}
              onChange={(e) => setDraft((d) => ({ ...d, [g.id]: { ...d[g.id], points: e.target.value.replace(/[^\d]/g, '') } }))}
              placeholder="Очки"
              aria-label={`Очки: ${g.name}`}
              className="input tabular-nums"
              maxLength={5}
            />
          </div>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={busy !== null}>
            {busy === 'save' && <Loader2 size={15} className="animate-spin" />} Сохранить
          </button>
          {previous && (
            <button type="button" className="btn-ghost" onClick={() => setDraft(toDraft(map[previous.slug], true))} disabled={busy !== null}>
              <Copy size={15} /> Как в томе «{volumeFullTitle(previous)}»
            </button>
          )}
          {current && (
            <button type="button" className="btn-ghost hover:text-danger" onClick={() => void remove()} disabled={busy !== null}>
              {busy === 'remove' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Удалить
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy !== null}>
            Отмена
          </button>
        </div>
      </div>
    </motion.form>
  )
}

/** «Очки классов»: итоги каждого тома для блока в конце тома. */
export default function ClassPointsAdmin() {
  const { data: map, isPending, isError, error } = useClassPoints()
  const [params, setParams] = useSearchParams()
  const openSlug = params.get('volume')
  const [year, setYear] = useState(() => getVolume(openSlug ?? undefined)?.year ?? 1)

  useEffect(() => {
    const volume = getVolume(openSlug ?? undefined)
    if (volume) setYear(volume.year)
  }, [openSlug])

  const open = (slug: string | null) => setParams(slug ? { volume: slug } : {}, { replace: true })

  if (isPending) return <PageLoader />
  if (isError || !map) {
    return (
      <div className="card p-6">
        <p className="font-semibold">Не удалось загрузить очки классов</p>
        <p className="mt-1 text-sm text-muted">{translateError(error)}. Если база создавалась по старой версии schema.sql, запустите файл ещё раз.</p>
      </div>
    )
  }

  const volumes = YEARS.find((y) => y.number === year)?.volumes ?? []
  const filled = volumes.filter((v) => map[v.slug]).length

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Очки классов</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        Очки четырёх классов на конец каждого тома. Читатели видят их в конце тома и после последней главы. Изменение считается по
        сравнению с прошлым заполненным томом.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {YEARS.map((y) => (
          <button
            key={y.number}
            type="button"
            onClick={() => setYear(y.number)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              year === y.number ? 'bg-accent text-white' : 'border border-line text-ink-2 hover:text-ink'
            }`}
          >
            {y.title}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">
          Заполнено {filled} из {volumes.length}
        </span>
      </div>

      <ul className="mt-4 overflow-hidden rounded-3xl border border-line/70 bg-surface/60">
        {volumes.map((volume) => {
          const points = map[volume.slug]
          const isOpen = openSlug === volume.slug
          return (
            <li key={volume.slug} className="border-b border-line/60 last:border-b-0">
              <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <div className="w-9 shrink-0 overflow-hidden rounded-md">
                  <VolumeCover volume={volume} showMeta={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {volumeFullTitle(volume)} · {volume.theme}
                  </p>
                  <p className={`truncate text-xs tabular-nums ${points ? 'text-ink-2' : 'text-muted'}`}>{points ? summary(points) : 'не заполнено'}</p>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-3 py-2 text-sm"
                  onClick={() => open(isOpen ? null : volume.slug)}
                  aria-expanded={isOpen}
                >
                  <Pencil size={14} /> {points ? 'Изменить' : 'Заполнить'}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && <Editor key={volume.slug} volume={volume} map={map} onClose={() => open(null)} />}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
