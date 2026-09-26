import { motion, useAnimationControls } from 'framer-motion'
import { useId } from 'react'

const LETTER = 'M7.5 25.5V11.5l7.5 9 7.5-9v14'

/**
 * Знак MindClass: розовая плитка с монограммой «M.».
 * При наведении буква прорисовывается заново, а точка подпрыгивает.
 */
export function LogoMark({ size = 36, interactive = true }: { size?: number; interactive?: boolean }) {
  const letter = useAnimationControls()
  const dot = useAnimationControls()
  const gradient = useId().replace(/:/g, '')

  const play = () => {
    if (!interactive) return
    void letter.start({ pathLength: [0.05, 1], transition: { duration: 0.7, ease: 'easeInOut' } })
    void dot.start({ y: [0, -7, 0, -2.5, 0], transition: { duration: 0.8, delay: 0.3, ease: 'easeOut' } })
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
        <motion.path
          d={LETTER}
          fill="none"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 1 }}
          animate={letter}
        />
        <motion.circle cx="28" cy="24.6" r="2.7" fill="#fff4b8" animate={dot} />
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
