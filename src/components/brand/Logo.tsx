import { motion, useAnimationControls } from 'framer-motion'
import { useId } from 'react'

const HEART = 'M18 29.5C10.2 24 5.5 19.8 5.5 14.6 5.5 10.9 8.4 8 12 8c2.4 0 4.6 1.3 6 3.3C19.4 9.3 21.6 8 24 8c3.6 0 6.5 2.9 6.5 6.6 0 5.2-4.7 9.4-12.5 14.9Z'
const SPARKLE = 'M12 0c.7 6.3 5.7 11.3 12 12-6.3.7-11.3 5.7-12 12-.7-6.3-5.7-11.3-12-12C6.3 11.3 11.3 6.3 12 0Z'

/**
 * Знак MindClass: розовая плитка с сердцем и искоркой.
 * При наведении сердце «бьётся», а искорка вспыхивает.
 */
export function LogoMark({ size = 36, interactive = true }: { size?: number; interactive?: boolean }) {
  const heart = useAnimationControls()
  const spark = useAnimationControls()
  const gradient = useId().replace(/:/g, '')

  const play = () => {
    if (!interactive) return
    void heart.start({ scale: [1, 1.18, 0.95, 1.08, 1], transition: { duration: 0.8, ease: 'easeInOut' } })
    void spark.start({ scale: [0.6, 1.35, 1], rotate: [0, 90, 180], opacity: [0.6, 1, 1], transition: { duration: 0.8 } })
  }

  return (
    <span onMouseEnter={play} className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="overflow-visible">
        <defs>
          <linearGradient id={`lg${gradient}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff9cc8" />
            <stop offset="55%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="#9b1b5a" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="11" fill={`url(#lg${gradient})`} />
        <circle cx="9" cy="8" r="7" fill="white" opacity="0.18" />
        <motion.path d={HEART} fill="white" animate={heart} style={{ originX: '18px', originY: '19px' }} />
        <motion.g animate={spark} style={{ originX: '28px', originY: '9px' }}>
          <path d={SPARKLE} fill="#fff4b8" transform="translate(23.5 4.5) scale(0.375)" />
        </motion.g>
      </svg>
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
