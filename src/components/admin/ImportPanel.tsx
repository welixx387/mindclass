import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardPaste, FileUp, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { importChapters, type ImportMode, type ImportProgress } from '../../api/admin'
import { ACCEPTED_FILES, importFiles, type ImportResult } from '../../lib/importers'
import { parsePlainText } from '../../lib/importers/text'
import { countLabel } from '../../lib/format'
import { translateError } from '../../store/auth'
import { confirmDialog } from '../ui/Overlay'
import { toast } from '../ui/Toaster'

const STAGE_LABEL: Record<ImportProgress['stage'], string> = {
  images: 'Загрузка иллюстраций',
  chapters: 'Сохранение глав',
  cleanup: 'Удаление лишних глав',
  done: 'Готово',
}

function words(text: string) {
  return (text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').match(/[\p{L}\p{N}]+/gu) ?? []).length
}

export function ImportPanel({ volumeSlug, existingCount, onDone }: { volumeSlug: string; existingCount: number; onDone: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileLabel, setFileLabel] = useState('')
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState<ImportMode>(existingCount ? 'append' : 'replace')
  const [publish, setPublish] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setParsing(true)
    try {
      const parsed = await importFiles(files)
      if (!parsed.chapters.length) throw new Error('В файле не нашлось текста')
      setResult(parsed)
      setFileLabel(files.length === 1 ? files[0].name : `${files.length} файлов`)
    } catch (e) {
      toast.error('Не удалось прочитать файл', { description: translateError(e) })
    } finally {
      setParsing(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFiles(Array.from(e.dataTransfer.files))
  }

  const usePasted = () => {
    if (!pasteText.trim()) return
    setResult(parsePlainText(pasteText, 'Глава'))
    setFileLabel('вставленный текст')
    setPasteOpen(false)
  }

  const update = (index: number, patch: Partial<ImportResult['chapters'][number]>) =>
    setResult((r) => (r ? { ...r, chapters: r.chapters.map((c, i) => (i === index ? { ...c, ...patch } : c)) } : r))

  const selected = result?.chapters.filter((c) => c.include) ?? []
  const imageCount = new Set(selected.flatMap((c) => [...c.content.matchAll(/\]\((mc-image:[^)]+)\)/g)].map((m) => m[1]))).size

  const run = async () => {
    if (!result || !selected.length) return
    if (mode === 'replace' && existingCount > 0) {
      const extra = existingCount - selected.length
      const ok = await confirmDialog({
        title: 'Заменить главы тома?',
        description:
          `Текст глав с 1 по ${Math.min(existingCount, selected.length)} будет заменён новым (их комментарии и закладки сохранятся).` +
          (extra > 0 ? ` Ещё ${countLabel(extra, ['глава', 'главы', 'глав'])} будет удалено вместе с обсуждениями.` : ''),
        confirmLabel: 'Заменить',
        danger: extra > 0,
      })
      if (!ok) return
    }
    try {
      setProgress({ stage: 'images', done: 0, total: 1 })
      const stats = await importChapters({ volumeSlug, chapters: result.chapters, images: result.images, mode, publish, onProgress: setProgress })
      toast.success('Главы загружены', {
        description: [
          stats.created && `новых: ${stats.created}`,
          stats.updated && `обновлено: ${stats.updated}`,
          stats.deleted && `удалено: ${stats.deleted}`,
          stats.imageErrors && `не загрузилось иллюстраций: ${stats.imageErrors}`,
        ]
          .filter(Boolean)
          .join(', '),
      })
      setResult(null)
      onDone()
    } catch (e) {
      toast.error('Импорт прервался', { description: translateError(e) })
    } finally {
      setProgress(null)
    }
  }

  if (progress) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 100
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-accent" />
          <p className="font-semibold">{STAGE_LABEL[progress.stage]}</p>
          <span className="ml-auto text-sm text-muted">
            {progress.done} / {progress.total}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/50 hover:bg-surface-2/40'
          }`}
        >
          <motion.div animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            {parsing ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={26} />}
          </motion.div>
          <p className="mt-4 font-display text-base font-semibold">{parsing ? 'Читаю файл…' : 'Перетащите файл тома или нажмите, чтобы выбрать'}</p>
          <p className="mt-1.5 max-w-md text-sm text-muted">EPUB, FB2 (в том числе .fb2.zip), TXT или MD. Можно выбрать несколько файлов — по одному на главу.</p>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED_FILES}
            multiple
            hidden
            onChange={(e) => {
              void handleFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>
        <button className="btn-quiet mt-3" onClick={() => setPasteOpen((v) => !v)}>
          <ClipboardPaste size={15} /> Вставить текст вручную
        </button>
        <AnimatePresence>
          {pasteOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                className="input mt-2 font-serif"
                placeholder={'Пролог\nТекст пролога…\n\nГлава 1. Название\nТекст первой главы…'}
              />
              <button className="btn-primary mt-3" onClick={usePasted} disabled={!pasteText.trim()}>
                Разобрать на главы
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-4">
        <FileUp size={18} className="text-accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{result.bookTitle ?? fileLabel}</p>
          <p className="text-xs text-muted">
            Найдено {countLabel(result.chapters.length, ['глава', 'главы', 'глав'])}
            {result.images.size > 0 && ` · ${countLabel(result.images.size, ['иллюстрация', 'иллюстрации', 'иллюстраций'])}`}
          </p>
        </div>
        <button className="icon-btn" onClick={() => setResult(null)} aria-label="Отменить импорт">
          <X size={18} />
        </button>
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-1 border-b border-line/70 bg-gold/10 px-5 py-3 text-sm text-ink-2">
          {result.warnings.map((w, i) => (
            <p key={i} className="flex gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" /> {w}
            </p>
          ))}
        </div>
      )}

      <ol className="max-h-[440px] divide-y divide-line/60 overflow-y-auto">
        {result.chapters.map((c, i) => (
          <li key={i} className={`px-5 py-3 transition-opacity ${c.include ? '' : 'opacity-50'}`}>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={c.include} onChange={(e) => update(i, { include: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--accent))]" aria-label="Импортировать главу" />
              <input value={c.title} onChange={(e) => update(i, { title: e.target.value })} className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-semibold hover:bg-surface-2 focus:bg-surface-2 focus:outline-none" />
              <span className="hidden shrink-0 text-xs text-muted sm:inline">{countLabel(words(c.content), ['слово', 'слова', 'слов'])}</span>
              {c.content.includes('](mc-image:') && <ImageIcon size={14} className="shrink-0 text-muted" />}
              <button className="icon-btn h-8 w-8 shrink-0" onClick={() => setExpanded(expanded === i ? null : i)} aria-label="Показать начало">
                <ChevronDown size={16} className={`transition-transform ${expanded === i ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <AnimatePresence>
              {expanded === i && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-bg/60 p-3 font-serif text-[13px] leading-relaxed text-ink-2"
                >
                  {c.content.slice(0, 1500) || '(пусто)'}
                  {c.content.length > 1500 && '…'}
                </motion.pre>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ol>

      <div className="space-y-4 border-t border-line/70 px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { id: 'append', title: 'Добавить в конец', text: 'Новые главы встанут после существующих.' },
              { id: 'replace', title: 'Заменить главы тома', text: 'Главы заменяются по порядку, комментарии к ним сохраняются.' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-2xl border p-3 text-left transition-colors ${mode === m.id ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-2/40'}`}
            >
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="mt-0.5 text-xs text-muted">{m.text}</p>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          Сразу опубликовать (иначе главы сохранятся черновиками)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={() => void run()} disabled={!selected.length}>
            <CheckCircle2 size={16} /> Импортировать {countLabel(selected.length, ['главу', 'главы', 'глав'])}
          </button>
          {imageCount > 0 && <span className="text-xs text-muted">и {countLabel(imageCount, ['иллюстрацию', 'иллюстрации', 'иллюстраций'])}</span>}
        </div>
      </div>
    </div>
  )
}
