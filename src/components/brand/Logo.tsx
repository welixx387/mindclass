import { motion, useAnimationControls } from 'framer-motion'
import { ChessKnight } from 'lucide-react'
import { useId } from 'react'

/**
 * Знак MindClass: плитка доски с конём. При наведении конь делает ход
 * буквой «Г» — единственная фигура, которая умеет перепрыгивать через других.
 */
export function LogoMark({ size = 36, interactive = true }: { size?: number; interactive?: boolean }) {
  const controls = useAnimationControls()
  const gradient = useId()

  const jump = () => {
    if (!interactive) return
    void controls.start({
      x: [0, 0, 5, 0],
      y: [0, -9, -9, 0],
      rotate: [0, -8, 6, 0],
      transition: { duration: 0.7, times: [0, 0.35, 0.65, 1], ease: 'easeInOut' },
    })
  }

  return (
    <span
      onMouseEnter={jump}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[30%]"
      style={{ width: size, height: size }}
    >
      <svg className="absolute inset-0" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="#7c1d2e" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" fill={`url(#${gradient})`} />
        <rect x="0" y="0" width="18" height="18" fill="rgba(255,255,255,0.10)" />
        <rect x="18" y="18" width="18" height="18" fill="rgba(255,255,255,0.10)" />
      </svg>
      <motion.span animate={controls} className="relative text-white">
        <ChessKnight size={size * 0.58} strokeWidth={2.1} aria-hidden="true" />
      </motion.span>
    </span>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 36} />
      <span className="font-display text-[17px] font-semibold tracking-tight">
        <span className="text-ink">Mind</span>
        <span className="text-gradient">Class</span>
      </span>
    </span>
  )
}
