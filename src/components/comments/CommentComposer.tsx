import { Bold, EyeOff, Italic, SendHorizontal } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Spinner } from '../ui/misc'

const MAX = 4000

/** Поле ввода комментария: автоподстройка высоты, спойлеры, Ctrl+Enter. */
export function CommentComposer({
  initial = '',
  placeholder = 'Что думаете об этой главе?',
  submitLabel = 'Отправить',
  autoFocus = false,
  compact = false,
  onSubmit,
  onCancel,
}: {
  initial?: string
  placeholder?: string
  submitLabel?: string
  autoFocus?: boolean
  compact?: boolean
  onSubmit: (body: string) => Promise<boolean>
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initial)
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`
  }, [value])

  useEffect(() => {
    if (!autoFocus) return
    const el = ref.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [autoFocus])

  const wrap = (marker: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    const selected = value.slice(start, end) || 'текст'
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end)
    setValue(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length)
    })
  }

  const submit = async () => {
    const body = value.trim()
    if (!body || pending || body.length > MAX) return
    setPending(true)
    const ok = await onSubmit(body)
    setPending(false)
    if (ok) setValue('')
  }

  const tooLong = value.length > MAX

  return (
    <div className="rounded-2xl border border-line bg-bg/50 transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgb(var(--accent)/0.12)]">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void submit()
          } else if (e.key === 'Escape' && onCancel) {
            onCancel()
          }
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={MAX + 200}
        className="block w-full resize-none bg-transparent px-4 pt-3 text-[15px] leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none"
        aria-label="Текст комментария"
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <button type="button" onClick={() => wrap('||')} className="icon-btn h-8 w-auto gap-1.5 px-2 text-xs font-medium" title="Спрятать под спойлер">
          <EyeOff size={15} /> <span className="hidden sm:inline">Спойлер</span>
        </button>
        <button type="button" onClick={() => wrap('**')} className="icon-btn h-8 w-8" title="Жирный">
          <Bold size={15} />
        </button>
        <button type="button" onClick={() => wrap('*')} className="icon-btn h-8 w-8" title="Курсив">
          <Italic size={15} />
        </button>
        <span className={`ml-auto hidden pr-2 text-xs sm:inline ${tooLong ? 'text-danger' : 'text-muted'}`}>
          {value.length > MAX - 400 ? `${value.length} / ${MAX}` : 'Ctrl + Enter — отправить'}
        </span>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-quiet px-3 py-1.5">
            Отмена
          </button>
        )}
        <button type="button" onClick={() => void submit()} disabled={!value.trim() || pending || tooLong} className="btn-primary px-3.5 py-1.5 sm:ml-0">
          {pending ? <Spinner size={15} /> : <SendHorizontal size={15} />}
          <span className="hidden sm:inline">{submitLabel}</span>
        </button>
      </div>
    </div>
  )
}
