import { Cake, Candy, Cherry, Flower2, Gift, Heart, Moon, Ribbon, Sparkles, Star, Trophy, type LucideProps } from 'lucide-react'
import type { MotifName } from '../../data/motifs'

const ICONS = {
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  flower: Flower2,
  ribbon: Ribbon,
  cherry: Cherry,
  candy: Candy,
  moon: Moon,
  gift: Gift,
  cake: Cake,
  trophy: Trophy,
} as const

export function Motif({ name, ...props }: { name: MotifName } & LucideProps) {
  const Icon = ICONS[name] ?? Heart
  return <Icon aria-hidden="true" {...props} />
}

/** Четырёхлучевая искорка — для фона и декора. */
export function SparkleShape({ size = 16, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d="M12 0c.7 6.3 5.7 11.3 12 12-6.3.7-11.3 5.7-12 12-.7-6.3-5.7-11.3-12-12C6.3 11.3 11.3 6.3 12 0Z" fill="currentColor" />
    </svg>
  )
}
