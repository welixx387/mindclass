import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, FileUp, GripVertical, Pencil, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteChapter, invalidateChapters, reorderChapters, updateChapter } from '../../api/admin'
import { useVolumeChapters } from '../../api/chapters'
import { ImportPanel } from '../../components/admin/ImportPanel'
import { VolumeCover } from '../../components/catalog/VolumeCover'
import { confirmDialog } from '../../components/ui/Overlay'
import { toast } from '../../components/ui/Toaster'
import { getVolume, volumeFullTitle } from '../../data/catalog'
import { countLabel, readingTimeLabel, timeAgo } from '../../lib/format'
import type { ChapterMeta } from '../../lib/types'
import { translateError } from '../../store/auth'

function ChapterRow({
  chapter,
  index,
  onToggle,
  onDelete,
  onDragEnd,
}: {
  chapter: ChapterMeta
  index: number
  onToggle: () => void
  onDelete: () => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={chapter}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative flex items-center gap-3 border-b border-line/60 bg-surface px-3 py-3 last:border-b-0 sm:px-4"
      whileDrag={{ scale: 1.01, boxShadow: '0 20px 40px -20px rgb(0 0 0 / 0.5)', zIndex: 10 }}
    >
      <button
        className="cursor-grab touch-none rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
        aria-label="Перетащить"
      >
        <GripVertical size={16} />
      </button>
      <span className="w-7 shrink-0 text-center font-display text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {chapter.title}
          {!chapter.is_published && <span className="chip ml-2 border-gold/40 py-0 text-[10px] text-gold">черновик</span>}
        </p>
        <p className="text-xs text-muted">
          {countLabel(chapter.word_count, ['слово', 'слова', 'слов'])} · {readingTimeLabel(chapter.word_count)} · изменено {timeAgo(chapter.updated_at)}
        </p>
      </div>
      <button className="icon-btn h-9 w-9" onClick={onToggle} title={chapter.is_published ? 'Скрыть (в черновики)' : 'Опубликовать'}>
        {chapter.is_published ? <Eye size={16} /> : <EyeOff size={16} className="text-gold" />}
      </button>
      <Link to={`/admin/chapter/${chapter.id}`} className="icon-btn h-9 w-9" title="Редактировать">
        <Pencil size={16} />
      </Link>
      <Link to={`/read/${chapter.id}`} className="icon-btn hidden h-9 w-9 sm:inline-flex" title="Открыть в читалке">
        <ExternalLink size={16} />
      </Link>
      <button className="icon-btn h-9 w-9 hover:text-danger" onClick={onDelete} title="Удалить">
        <Trash2 size={16} />
      </button>
    </Reorder.Item>
  )
}

export default function VolumeManager() {
  const { slug } = useParams()
  const volume = getVolume(slug)
  const queryClient = useQueryClient()
  const { data: chapters, isLoading, refetch } = useVolumeChapters(volume?.slug)
  const [items, setItems] = useState<ChapterMeta[]>([])
  const [showImport, setShowImport] = useState(false)
  const orderRef = useRef<number[]>([])

  useEffect(() => {
    setItems(chapters ?? [])
    orderRef.current = (chapters ?? []).map((c) => c.id)
  }, [chapters])

  if (!volume) return <p className="text-sm text-muted">Том не найден.</p>

  const refresh = () => {
    invalidateChapters()
    void refetch()
  }

  const saveOrder = async () => {
    const ids = items.map((c) => c.id)
    if (ids.join() === orderRef.current.join()) return
    try {
      await reorderChapters(volume.slug, ids)
      orderRef.current = ids
      void queryClient.invalidateQueries({ queryKey: ['chapters'] })
      toast.success('Порядок глав сохранён')
    } catch (e) {
      toast.error('Не удалось сохранить порядок', { description: translateError(e) })
      setItems(chapters ?? [])
    }
  }

  const toggle = async (c: ChapterMeta) => {
    try {
      await updateChapter(c.id, { is_published: !c.is_published })
      refresh()
    } catch (e) {
      toast.error('Не удалось изменить', { description: translateError(e) })
    }
  }

  const remove = async (c: ChapterMeta) => {
    const ok = await confirmDialog({
      title: `Удалить «${c.title}»?`,
      description: 'Глава исчезнет вместе с комментариями к ней и закладками читателей. Это нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteChapter(c.id)
      toast('Глава удалена')
      refresh()
    } catch (e) {
      toast.error('Не удалось удалить', { description: translateError(e) })
    }
  }

  const empty = !isLoading && items.length === 0
  const words = items.reduce((s, c) => s + c.word_count, 0)

  return (
    <div>
      <Link to="/admin/volumes" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Все тома
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-5">
        <div className="w-16 overflow-hidden rounded-xl shadow-card">
          <VolumeCover volume={volume} showMeta={false} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{volumeFullTitle(volume)}</h1>
          <p className="text-sm text-ink-2">
            {volume.theme} · {countLabel(items.length, ['глава', 'главы', 'глав'])}
            {items.length > 0 && ` · ≈ ${readingTimeLabel(words)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/volume/${volume.slug}`} className="btn-ghost">
            <ExternalLink size={15} /> Страница тома
          </Link>
          <Link to={`/admin/chapter/new?volume=${volume.slug}`} className="btn-ghost">
            <Plus size={15} /> Новая глава
          </Link>
          {!empty && (
            <button className="btn-primary" onClick={() => setShowImport((v) => !v)}>
              <FileUp size={15} /> Импорт из файла
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(empty || showImport) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-8">
              <ImportPanel
                volumeSlug={volume.slug}
                existingCount={items.length}
                onDone={() => {
                  setShowImport(false)
                  refresh()
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8">
        {isLoading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : items.length > 0 ? (
          <>
            <p className="mb-3 text-xs text-muted">Перетащите главы за ручку слева, чтобы поменять порядок.</p>
            <Reorder.Group axis="y" values={items} onReorder={setItems} className="overflow-hidden rounded-2xl border border-line/70">
              {items.map((c, i) => (
                <ChapterRow key={c.id} chapter={c} index={i} onToggle={() => void toggle(c)} onDelete={() => void remove(c)} onDragEnd={() => void saveOrder()} />
              ))}
            </Reorder.Group>
          </>
        ) : null}
      </div>
    </div>
  )
}
