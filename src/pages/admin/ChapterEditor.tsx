import { AnimatePresence, motion } from 'framer-motion'
import { AlignCenter, ArrowLeft, Bold, Eye, Heading2, ImagePlus, Italic, Loader2, Minus, Quote, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createChapter, deleteChapter, invalidateChapters, updateChapter, uploadIllustration } from '../../api/admin'
import { useChapter } from '../../api/chapters'
import { ChapterText } from '../../components/reader/ChapterText'
import { PageLoader } from '../../components/ui/misc'
import { confirmDialog } from '../../components/ui/Overlay'
import { toast } from '../../components/ui/Toaster'
import { getVolume, volumeFullTitle } from '../../data/catalog'
import { countWords, parseChapter } from '../../lib/markup'
import { translateError } from '../../store/auth'

const EMPTY = new Set<number>()

export default function ChapterEditor() {
  const { id: idParam } = useParams()
  const [params] = useSearchParams()
  const isNew = idParam === 'new'
  const id = isNew ? undefined : Number(idParam)
  const { data: chapter, isLoading } = useChapter(id)
  const navigate = useNavigate()

  const volumeSlug = chapter?.volume_slug ?? params.get('volume') ?? ''
  const volume = getVolume(volumeSlug)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(true)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!chapter) return
    setTitle(chapter.title)
    setContent(chapter.content)
    setPublished(chapter.is_published)
    setDirty(false)
  }, [chapter])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const blocks = useMemo(() => (tab === 'preview' ? parseChapter(content) : []), [content, tab])
  const words = useMemo(() => countWords(content), [content])

  const save = async () => {
    if (!title.trim()) return toast.error('Укажите название главы')
    if (!volume) return toast.error('Не выбран том')
    setSaving(true)
    try {
      if (isNew) {
        const created = await createChapter({ volume_slug: volume.slug, title, content, is_published: published })
        toast.success('Глава создана')
        setDirty(false)
        navigate(`/admin/chapter/${created.id}`, { replace: true })
      } else {
        await updateChapter(id!, { title: title.trim(), content, is_published: published })
        toast.success('Сохранено')
        setDirty(false)
      }
      invalidateChapters()
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const change = (value: string) => {
    setContent(value)
    setDirty(true)
  }

  /** Вставка разметки: обернуть выделение или добавить строку. */
  const insert = (kind: 'bold' | 'italic' | 'break' | 'heading' | 'quote' | 'center', extra?: string) => {
    const el = area.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const selected = content.slice(s, e)
    let text: string
    let cursor: number
    const lineStart = content.lastIndexOf('\n', s - 1) + 1
    switch (kind) {
      case 'bold':
      case 'italic': {
        const m = kind === 'bold' ? '**' : '*'
        text = content.slice(0, s) + m + (selected || 'текст') + m + content.slice(e)
        cursor = s + m.length + (selected || 'текст').length + m.length
        break
      }
      case 'heading':
      case 'quote': {
        const prefix = kind === 'heading' ? '## ' : '> '
        text = content.slice(0, lineStart) + prefix + content.slice(lineStart)
        cursor = e + prefix.length
        break
      }
      case 'center':
        text = content.slice(0, s) + `-> ${selected || 'текст'} <-` + content.slice(e)
        cursor = s + (selected || 'текст').length + 6
        break
      case 'break': {
        const line = extra ?? '***'
        const before = s > 0 && content[s - 1] !== '\n' ? '\n' : ''
        text = content.slice(0, s) + `${before}${line}\n` + content.slice(e)
        cursor = s + before.length + line.length + 1
        break
      }
    }
    change(text)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  const uploadImage = async (file: File) => {
    if (!volume) return
    setUploading(true)
    try {
      const url = await uploadIllustration(volume.slug, { type: file.type || 'image/jpeg', data: new Uint8Array(await file.arrayBuffer()) })
      insert('break', `![${file.name.replace(/\.[^.]+$/, '')}](${url})`)
      toast.success('Иллюстрация загружена')
    } catch (e) {
      toast.error('Не удалось загрузить картинку', { description: translateError(e) })
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!id) return
    const ok = await confirmDialog({
      title: 'Удалить главу?',
      description: 'Вместе с ней удалятся комментарии и закладки читателей.',
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteChapter(id)
      invalidateChapters()
      toast('Глава удалена')
      navigate(`/admin/volume/${volumeSlug}`, { replace: true })
    } catch (e) {
      toast.error('Не удалось удалить', { description: translateError(e) })
    }
  }

  if (!isNew && isLoading) return <PageLoader />
  if (!isNew && !chapter) return <p className="text-sm text-muted">Глава не найдена.</p>
  if (!volume) return <p className="text-sm text-muted">Не указан том. Откройте редактор со страницы тома.</p>

  const tools = [
    { icon: Bold, label: 'Жирный', run: () => insert('bold') },
    { icon: Italic, label: 'Курсив', run: () => insert('italic') },
    { icon: Heading2, label: 'Подзаголовок', run: () => insert('heading') },
    { icon: Quote, label: 'Врезка (переписка, записка)', run: () => insert('quote') },
    { icon: AlignCenter, label: 'По центру', run: () => insert('center') },
    { icon: Minus, label: 'Разрыв сцены', run: () => insert('break') },
  ]

  return (
    <div>
      <Link to={`/admin/volume/${volume.slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> {volumeFullTitle(volume)}
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }}
          placeholder="Название главы, например «Глава 1. Начало»"
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 font-display text-2xl font-bold tracking-tight hover:border-line focus:border-accent/60 focus:outline-none"
          maxLength={200}
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => {
              setPublished(e.target.checked)
              setDirty(true)
            }}
            className="h-4 w-4 accent-[rgb(var(--accent))]"
          />
          Опубликована
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface/70 p-1.5">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative rounded-xl px-3 py-1.5 text-sm font-semibold">
            {tab === t && <motion.span layoutId="editor-tab" className="absolute inset-0 rounded-xl bg-surface-2 ring-1 ring-line" />}
            <span className={`relative flex items-center gap-1.5 ${tab === t ? 'text-ink' : 'text-muted'}`}>
              {t === 'preview' && <Eye size={14} />}
              {t === 'edit' ? 'Текст' : 'Предпросмотр'}
            </span>
          </button>
        ))}
        {tab === 'edit' && (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            {tools.map((tool) => (
              <button key={tool.label} className="icon-btn h-8 w-8" title={tool.label} onClick={tool.run}>
                <tool.icon size={15} />
              </button>
            ))}
            <button className="icon-btn h-8 w-8" title="Вставить иллюстрацию" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadImage(file)
                e.target.value = ''
              }}
            />
          </>
        )}
        <span className="ml-auto px-2 text-xs text-muted">{words.toLocaleString('ru-RU')} слов</span>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'edit' ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <textarea
              ref={area}
              value={content}
              onChange={(e) => change(e.target.value)}
              spellCheck
              className="input mt-3 min-h-[60vh] resize-y font-serif text-[16px] leading-relaxed"
              placeholder={'Каждая строка — отдельный абзац.\n\n***  — разрыв сцены\n## Подзаголовок\n> Сообщение в чате\n**жирный**, *курсив*'}
            />
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="reader-root mt-3 rounded-3xl border border-line px-5 py-10 sm:px-12" data-reader-theme="night">
            <h1 className="mb-10 text-center font-display text-3xl font-semibold">{title || 'Без названия'}</h1>
            <div className="reader-text mx-auto max-w-[680px]">
              <ChapterText blocks={blocks} bookmarked={EMPTY} onImageClick={() => undefined} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky bottom-4 mt-5 flex items-center gap-3 rounded-2xl border border-line bg-elev/90 p-3 shadow-pop backdrop-blur">
        {!isNew && (
          <button className="btn-danger" onClick={() => void remove()}>
            <Trash2 size={15} /> Удалить
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'} · Ctrl + S</span>
        <button className="btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isNew ? 'Создать главу' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
