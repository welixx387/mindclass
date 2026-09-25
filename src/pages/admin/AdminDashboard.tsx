import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, EyeOff, FileText, FileUp, Type } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAllChaptersMeta } from '../../api/admin'
import { VolumeCover } from '../../components/catalog/VolumeCover'
import { CountUp } from '../../components/ui/misc'
import { volumeTitle, YEARS } from '../../data/catalog'
import { countLabel } from '../../lib/format'

export default function AdminDashboard({ volumesOnly = false }: { volumesOnly?: boolean }) {
  const { data: chapters, isLoading } = useAllChaptersMeta()

  const byVolume = useMemo(() => {
    const map = new Map<string, { total: number; drafts: number; words: number }>()
    for (const c of chapters ?? []) {
      const s = map.get(c.volume_slug) ?? { total: 0, drafts: 0, words: 0 }
      s.total++
      if (!c.is_published) s.drafts++
      s.words += c.word_count
      map.set(c.volume_slug, s)
    }
    return map
  }, [chapters])

  const totals = useMemo(() => {
    const list = chapters ?? []
    return {
      chapters: list.length,
      drafts: list.filter((c) => !c.is_published).length,
      words: list.reduce((s, c) => s + c.word_count, 0),
      volumes: byVolume.size,
    }
  }, [chapters, byVolume])

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{volumesOnly ? 'Тома и главы' : 'Обзор'}</h1>
      <p className="mt-2 text-sm text-ink-2">Выберите том, чтобы загрузить файл с главами, отредактировать текст или поменять порядок.</p>

      {!volumesOnly && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'глав всего', value: totals.chapters, icon: FileText },
              { label: 'черновиков', value: totals.drafts, icon: EyeOff },
              { label: 'томов с текстом', value: totals.volumes, icon: BookOpen },
              { label: 'слов', value: totals.words, icon: Type },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <s.icon size={17} className="text-accent" />
                <CountUp value={s.value} className="mt-3 block font-display text-2xl font-semibold" />
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <FileUp size={20} />
            </div>
            <div className="flex-1 text-sm leading-relaxed text-ink-2">
              <p className="font-semibold text-ink">Как загрузить главы</p>
              Откройте том и перетащите файл: <b>EPUB</b>, <b>FB2</b> или <b>TXT/MD</b>. Сайт найдёт главы по заголовкам («Пролог», «Глава 1», «# Название») и
              покажет их перед сохранением. Иллюстрации из EPUB и FB2 загрузятся автоматически.
            </div>
          </div>
        </>
      )}

      <div className="mt-10 space-y-10">
        {YEARS.map((year) => (
          <section key={year.number}>
            <h2 className="mb-4 font-display text-lg font-semibold">{year.title}</h2>
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface/60">
              {year.volumes.map((v, i) => {
                const s = byVolume.get(v.slug)
                return (
                  <motion.div key={v.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <Link to={`/admin/volume/${v.slug}`} className="group flex items-center gap-4 border-b border-line/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2/70">
                      <div className="w-9 shrink-0 overflow-hidden rounded-md">
                        <VolumeCover volume={v} showMeta={false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {volumeTitle(v)} <span className="font-normal text-muted">· {v.theme}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {isLoading ? '…' : s ? countLabel(s.total, ['глава', 'главы', 'глав']) : 'глав нет'}
                          {s?.drafts ? ` · ${countLabel(s.drafts, ['черновик', 'черновика', 'черновиков'])}` : ''}
                        </p>
                      </div>
                      {!s && !isLoading && <span className="chip border-gold/40 text-gold">пусто</span>}
                      <ChevronRight size={17} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
