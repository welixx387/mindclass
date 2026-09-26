import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { saveVolumeCovers, uploadSiteImage } from '../../api/admin'
import { queryClient } from '../../api/queryClient'
import { useVolumeCovers, volumeCoversQueryKey } from '../../api/site'
import { VolumeCover } from '../../components/catalog/VolumeCover'
import { confirmDialog } from '../../components/ui/Overlay'
import { PageLoader } from '../../components/ui/misc'
import { toast } from '../../components/ui/Toaster'
import { volumeFullTitle, YEARS, type Volume } from '../../data/catalog'
import { WIKI_COVERS } from '../../data/wikiCovers'
import type { VolumeCoversMap } from '../../lib/volumeCovers'
import { translateError } from '../../store/auth'

const ACCEPT = ['image/webp', 'image/png', 'image/jpeg', 'image/avif']
const MAX_MB = 8

function CoverTile({ volume, covers }: { volume: Volume; covers: VolumeCoversMap }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [dragging, setDragging] = useState(false)
  const current = covers[volume.slug]
  const title = volumeFullTitle(volume)

  const save = async (next: VolumeCoversMap, unused: string[], message: string) => {
    await saveVolumeCovers(next, unused)
    queryClient.setQueryData(volumeCoversQueryKey, next)
    void queryClient.invalidateQueries({ queryKey: volumeCoversQueryKey })
    toast.success(message, { description: `${title} · ${volume.theme}` })
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) return toast.error('Этот формат не подойдёт', { description: 'Нужна картинка WEBP, PNG, JPG или AVIF.' })
    if (file.size > MAX_MB * 1024 * 1024) return toast.error('Файл слишком большой', { description: `До ${MAX_MB} МБ.` })
    setBusy('upload')
    try {
      const stored = await uploadSiteImage(file, `covers/${volume.slug}`)
      await save({ ...covers, [volume.slug]: stored }, current ? [current.path] : [], current ? 'Обложка заменена' : 'Обложка загружена')
    } catch (e) {
      toast.error('Не удалось загрузить обложку', { description: translateError(e) })
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!current) return
    const ok = await confirmDialog({
      title: 'Убрать обложку?',
      description: `${title}: ${WIKI_COVERS[volume.slug] ? 'вернётся обложка издания с вики' : 'вместо картинки снова будет узор'}.`,
      confirmLabel: 'Убрать',
      danger: true,
    })
    if (!ok) return
    setBusy('remove')
    try {
      const next = { ...covers }
      delete next[volume.slug]
      await save(next, [current.path], 'Обложка убрана')
    } catch (e) {
      toast.error('Не удалось убрать обложку', { description: translateError(e) })
    } finally {
      setBusy(null)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void upload(e.dataTransfer.files[0])
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy !== null}
        aria-label={`${current ? 'Заменить' : 'Загрузить'} обложку: ${title}`}
        className={`group relative block w-full overflow-hidden rounded-2xl ring-2 transition-all ${
          dragging ? 'ring-accent' : 'ring-transparent hover:ring-accent/50'
        }`}
      >
        <VolumeCover volume={volume} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#2c1226]">
            <ImageUp size={14} /> {current ? 'Заменить' : 'Загрузить'}
          </span>
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 size={24} className="animate-spin" />
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(',')}
        className="hidden"
        data-testid={`cover-input-${volume.slug}`}
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Том {volume.number}</p>
          <p className="truncate text-xs text-muted">{current ? 'своя обложка' : WIKI_COVERS[volume.slug] ? 'обложка с вики' : 'узор'}</p>
        </div>
        {current && (
          <button
            type="button"
            className="icon-btn h-8 w-8 shrink-0 hover:text-danger"
            onClick={() => void remove()}
            disabled={busy !== null}
            aria-label={`Убрать обложку: ${title}`}
            title="Убрать обложку"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

/** «Обложки»: своя картинка для каждого тома, надписи остаются поверх неё. */
export default function CoversAdmin() {
  const { covers, ready } = useVolumeCovers()
  const [year, setYear] = useState(1)

  if (!ready || !covers) return <PageLoader />

  const volumes = YEARS.find((y) => y.number === year)?.volumes ?? []
  const filled = volumes.filter((v) => covers[v.slug]).length

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Обложки томов</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        Сейчас у томов стоят обложки японского издания с You-Zitsu Wiki. Чтобы поставить свою, нажмите на том или перетащите на него
        картинку: она станет фоном обложки в каталоге, на странице тома и в закладках, а надписи «Том», номер и название останутся поверх
        неё. Лучше всего подходят вертикальные картинки с пропорциями примерно 5:7, до {MAX_MB} МБ.
      </p>
      <p className="mt-3 max-w-2xl rounded-xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-2">
        Загружайте только изображения, которые вам можно публиковать.
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
          Своих обложек: {filled} из {volumes.length}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-5">
        {volumes.map((volume) => (
          <CoverTile key={volume.slug} volume={volume} covers={covers} />
        ))}
      </div>
    </div>
  )
}
