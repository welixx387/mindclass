import { ImageUp, Loader2, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { removeHeroArt, saveHeroArt, uploadSiteArt } from '../../api/admin'
import { queryClient } from '../../api/queryClient'
import { heroArtQueryKey, useHeroArtSetting } from '../../api/site'
import { HeroCardFace } from '../../components/home/HeroArt'
import { confirmDialog } from '../../components/ui/Overlay'
import { toast } from '../../components/ui/Toaster'
import { CAPTION_MAX, DEFAULT_CAPTION, type HeroPicture } from '../../lib/heroArt'
import { translateError } from '../../store/auth'

const ACCEPT = ['image/webp', 'image/png', 'image/jpeg', 'image/avif']
const MAX_MB = 8

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        {label}
        <span className="text-xs font-normal text-muted">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[rgb(var(--accent))]"
      />
    </label>
  )
}

/** «Оформление»: арт для карточки на главной и для страницы входа. */
export default function AppearanceAdmin() {
  const { data: current, isPending } = useHeroArtSetting()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [caption, setCaption] = useState(DEFAULT_CAPTION)
  const [focusX, setFocusX] = useState(50)
  const [focusY, setFocusY] = useState(30)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // Когда настройки пришли из базы — подставить их в форму.
  useEffect(() => {
    if (current === undefined) return
    setCaption(current?.caption ?? DEFAULT_CAPTION)
    setFocusX(current?.focusX ?? 50)
    setFocusY(current?.focusY ?? 30)
  }, [current])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      setSize(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (candidate: File | undefined) => {
    if (!candidate) return
    if (!ACCEPT.includes(candidate.type)) {
      return toast.error('Этот формат не подойдёт', { description: 'Нужна картинка WEBP, PNG, JPG или AVIF.' })
    }
    if (candidate.size > MAX_MB * 1024 * 1024) {
      return toast.error('Файл слишком большой', { description: `До ${MAX_MB} МБ. Сожмите картинку или сохраните её в WEBP.` })
    }
    setFile(candidate)
    setSize(null)
    const img = new Image()
    const url = URL.createObjectURL(candidate)
    img.onload = () => {
      setSize({ w: img.naturalWidth, h: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const save = async () => {
    setBusy('save')
    try {
      const stored = file ? await uploadSiteArt(file) : current ? { url: current.url, path: current.path } : null
      if (!stored) throw new Error('Сначала выберите картинку')
      const value = { ...stored, caption: caption.trim() || DEFAULT_CAPTION, focusX, focusY }
      await saveHeroArt(value, current?.path)
      queryClient.setQueryData(heroArtQueryKey, value)
      void queryClient.invalidateQueries({ queryKey: heroArtQueryKey })
      setFile(null)
      toast.success('Оформление сохранено', { description: 'Арт уже на главной и на странице входа.' })
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Убрать арт?',
      description: 'На главной и на странице входа снова появится талисман сайта.',
      confirmLabel: 'Убрать',
      danger: true,
    })
    if (!ok) return
    setBusy('remove')
    try {
      await removeHeroArt(current?.path)
      queryClient.setQueryData(heroArtQueryKey, null)
      void queryClient.invalidateQueries({ queryKey: heroArtQueryKey })
      setFile(null)
      toast.success('Арт убран')
    } catch (e) {
      toast.error('Не удалось убрать арт', { description: translateError(e) })
    } finally {
      setBusy(null)
    }
  }

  const src = preview ?? current?.url
  const picture: HeroPicture | null = src ? { src, caption: caption.trim() || DEFAULT_CAPTION, focusX, focusY } : null
  const dirty = Boolean(file) || (current ? caption.trim() !== current.caption || focusX !== current.focusX || focusY !== current.focusY : false)
  const small = size && Math.min(size.w, size.h) < 700

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Оформление</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        Картинка для карточки на главной странице и для страницы входа. Пока её нет, там показывается талисман сайта Лина.
      </p>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <p className="eyebrow mb-3">Так будет на главной</p>
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[30px] p-[3px] shadow-glow"
            style={{ background: 'linear-gradient(140deg, #ffd1e6, rgb(var(--accent)), rgb(var(--accent-2)))' }}
          >
            <HeroCardFace picture={isPending && !current ? undefined : picture} className="rounded-[27px]" />
          </div>
        </div>

        <div className="card space-y-6 p-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragging ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/60'
            }`}
          >
            <ImageUp size={26} className="text-accent" />
            <p className="mt-3 font-semibold">{file ? file.name : current ? 'Заменить картинку' : 'Выбрать картинку'}</p>
            <p className="mt-1 text-xs text-muted">
              {size ? `${size.w}×${size.h} · ` : ''}WEBP, PNG, JPG или AVIF до {MAX_MB} МБ. Лучше вертикальная, от 900 px по короткой стороне.
            </p>
            {small && <p className="mt-2 text-xs text-gold">Картинка маловата: на больших экранах она будет размытой.</p>}
            <input
              ref={input}
              type="file"
              accept={ACCEPT.join(',')}
              className="hidden"
              data-testid="hero-art-input"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
              Подпись на карточке
              <span className="text-xs font-normal text-muted">
                {caption.length}/{CAPTION_MAX}
              </span>
            </span>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={CAPTION_MAX} className="input" placeholder={DEFAULT_CAPTION} />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <Slider label="Кадр по горизонтали" value={focusX} onChange={setFocusX} />
            <Slider label="Кадр по вертикали" value={focusY} onChange={setFocusY} />
          </div>

          <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-2">
            Загружайте только картинки, которые вам можно публиковать: свой рисунок, заказанный арт или изображение с разрешения автора.
          </p>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={busy !== null || !src || !dirty}>
              {busy === 'save' && <Loader2 size={15} className="animate-spin" />} Сохранить
            </button>
            {file && (
              <button className="btn-ghost" onClick={() => setFile(null)} disabled={busy !== null}>
                <Undo2 size={15} /> Отменить выбор
              </button>
            )}
            {current && (
              <button className="btn-ghost hover:text-danger" onClick={() => void remove()} disabled={busy !== null}>
                {busy === 'remove' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Убрать арт
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
