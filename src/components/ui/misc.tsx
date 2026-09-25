import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-label="Загрузка" />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted">
      <Spinner size={26} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card flex flex-col items-center px-6 py-12 text-center"
    >
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
        <span className="absolute inset-0 rounded-2xl" style={{ animation: 'pulse-ring 2.4s ease-out infinite', boxShadow: '0 0 0 1px rgb(var(--accent) / 0.4)' }} />
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  )
}

/** Появление при прокрутке. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Число, которое «набегает» при появлении на экране. */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 60, damping: 18 })
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString('ru-RU'))

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function ProgressRing({ percent, size = 22, stroke = 2.5 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(100, percent) / 100) }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}
