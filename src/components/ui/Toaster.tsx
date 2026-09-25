import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { create } from 'zustand'

type Tone = 'default' | 'success' | 'error'

interface Toast {
  id: number
  title: string
  description?: string
  tone: Tone
  action?: { label: string; onClick: () => void }
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => number
  dismiss: (id: number) => void
}

let nextId = 1

const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-3), { ...toast, id }] })
    if (toast.duration > 0) setTimeout(() => get().dismiss(id), toast.duration)
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export function toast(
  title: string,
  options: { description?: string; tone?: Tone; action?: Toast['action']; duration?: number } = {}
) {
  return useToasts.getState().push({
    title,
    description: options.description,
    tone: options.tone ?? 'default',
    action: options.action,
    duration: options.duration ?? (options.tone === 'error' ? 6000 : 3800),
  })
}

toast.success = (title: string, options: Parameters<typeof toast>[1] = {}) => toast(title, { ...options, tone: 'success' })
toast.error = (title: string, options: Parameters<typeof toast>[1] = {}) => toast(title, { ...options, tone: 'error' })

const ICONS = { default: Info, success: CheckCircle2, error: AlertTriangle }
const TONE_CLASS = { default: 'text-ink-2', success: 'text-success', error: 'text-danger' }

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="glass pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line/80 px-4 py-3 shadow-pop"
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${TONE_CLASS[t.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-accent hover:bg-accent/10"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button onClick={() => dismiss(t.id)} className="shrink-0 rounded-md p-0.5 text-muted hover:text-ink" aria-label="Закрыть">
                <X size={15} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
