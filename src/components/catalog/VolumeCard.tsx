import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Check, Clock3 } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { volumeTitle, type Volume } from '../../data/catalog'
import { countLabel } from '../../lib/format'
import { VolumeCover } from './VolumeCover'

/** Карточка с наклоном вслед за курсором и бликом по поверхности обложки. */
export function TiltCard({ children, className = '', intensity = 10 }: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), { stiffness: 220, damping: 18 })
  const ry = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), { stiffness: 220, damping: 18 })
  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28), transparent 55%)`

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const rect = ref.current!.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`group/tilt relative ${className}`}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{ background: glare }}
      />
    </motion.div>
  )
}

export function VolumeCard({
  volume,
  chapters,
  completed = 0,
  index = 0,
}: {
  volume: Volume
  chapters?: number
  completed?: number
  index?: number
}) {
  const hasChapters = (chapters ?? 0) > 0
  const percent = hasChapters ? Math.round((completed / chapters!) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/volume/${volume.slug}`} className="group block focus-visible:outline-none" aria-label={`${volumeTitle(volume)} — ${volume.theme}`}>
        <TiltCard className="overflow-hidden rounded-2xl shadow-card ring-1 ring-line/60 transition-shadow duration-300 group-hover:shadow-glow group-focus-visible:shadow-glow">
          <VolumeCover volume={volume} />
          {completed > 0 && completed >= (chapters ?? Infinity) && (
            <span className="absolute right-3 top-12 inline-flex h-7 w-7 items-center justify-center rounded-full bg-success text-white shadow-lg">
              <Check size={15} strokeWidth={3} />
            </span>
          )}
        </TiltCard>
        <div className="mt-3 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-[15px] font-semibold transition-colors group-hover:text-accent">{volumeTitle(volume)}</h3>
            {volume.kind === 'side' && <span className="chip py-0.5 text-[10px]">истории</span>}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-2">{volume.theme}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            {chapters === undefined ? (
              <span className="skeleton h-3 w-16" />
            ) : hasChapters ? (
              <>
                <span>{countLabel(chapters, ['глава', 'главы', 'глав'])}</span>
                {completed > 0 && <span className="text-accent">· {percent}%</span>}
              </>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} /> скоро
              </span>
            )}
          </div>
          {hasChapters && completed > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line/70">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                whileInView={{ width: `${percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
