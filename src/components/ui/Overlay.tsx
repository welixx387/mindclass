import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}

function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        ref.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
}

/** Фокус внутрь окна при открытии и обратно — при закрытии. */
function useFocusReturn(open: boolean, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[autofocus], input, textarea, select, button:not([data-close])')
      ;(el ?? panel.current)?.focus({ preventScroll: true })
    }, 30)
    return () => {
      clearTimeout(t)
      previous?.focus?.({ preventScroll: true })
    }
  }, [open, panel])
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useEscape(open, onClose)
  useFocusReturn(open, panel)

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6" initial="closed" animate="open" exit="closed">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            variants={{
              open: { opacity: 1, y: 0, scale: 1 },
              closed: { opacity: 0, y: 30, scale: 0.97 },
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-elev p-5 shadow-pop outline-none sm:rounded-3xl sm:p-7 ${
              wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title ? <h2 className="font-display text-lg font-semibold">{title}</h2> : <span />}
              <button data-close className="icon-btn -mr-2 -mt-2 h-9 w-9" onClick={onClose} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  className = '',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  side?: 'right' | 'left'
  className?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  useLockBody(open)
  useEscape(open, onClose)
  useFocusReturn(open, panel)
  const offset = side === 'right' ? '100%' : '-100%'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90]" initial="closed" animate="open" exit="closed">
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
            onClick={onClose}
          />
          <motion.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            variants={{ open: { x: 0 }, closed: { x: offset } }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className={`absolute bottom-0 top-0 flex w-[min(420px,92vw)] flex-col border-line bg-elev shadow-pop outline-none ${
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
            } ${className}`}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-4">
              <div className="font-display text-base font-semibold">{title}</div>
              <button data-close className="icon-btn h-9 w-9" onClick={onClose} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ------------------------------ Подтверждение ------------------------------ */

interface ConfirmRequest {
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

const useConfirmStore = create<{ request: ConfirmRequest | null; set: (r: ConfirmRequest | null) => void }>()((set) => ({
  request: null,
  set: (request) => set({ request }),
}))

export function confirmDialog(options: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.getState().set({ ...options, resolve }))
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request)
  const set = useConfirmStore((s) => s.set)
  const close = (ok: boolean) => {
    request?.resolve(ok)
    set(null)
  }
  return (
    <Modal open={Boolean(request)} onClose={() => close(false)} title={request?.title}>
      {request?.description && <p className="text-sm leading-relaxed text-ink-2">{request.description}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => close(false)}>
          Отмена
        </button>
        <button autoFocus className={request?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>
          {request?.confirmLabel ?? 'Подтвердить'}
        </button>
      </div>
    </Modal>
  )
}
