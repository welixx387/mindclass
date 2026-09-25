import type { PieceName } from '../../data/catalog'
import type { ClassLetter, ProfileSummary } from '../../lib/types'
import { ChessPiece } from '../brand/ChessPiece'

export const AVATAR_COLORS: Record<string, { label: string; from: string; to: string }> = {
  crimson: { label: 'Багровый', from: '#f0506a', to: '#8f1733' },
  gold: { label: 'Золото', from: '#f1c46b', to: '#a8650f' },
  violet: { label: 'Фиалка', from: '#b69cff', to: '#5b2fd0' },
  sapphire: { label: 'Сапфир', from: '#7c93ff', to: '#2c3aa8' },
  emerald: { label: 'Изумруд', from: '#4ade9f', to: '#067255' },
  cyan: { label: 'Лёд', from: '#5fe0f5', to: '#0b6f8a' },
  rose: { label: 'Сакура', from: '#ff9bb3', to: '#c0305e' },
  graphite: { label: 'Графит', from: '#a3a9b8', to: '#353a47' },
}

export const AVATAR_COLOR_IDS = Object.keys(AVATAR_COLORS)

export function avatarGradient(color: string): string {
  const c = AVATAR_COLORS[color] ?? AVATAR_COLORS.crimson
  return `linear-gradient(140deg, ${c.from}, ${c.to})`
}

export function Avatar({
  piece,
  color,
  size = 40,
  className = '',
  ring = false,
}: {
  piece: PieceName
  color: string
  size?: number
  className?: string
  ring?: boolean
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${
        ring ? 'ring-2 ring-bg ring-offset-2 ring-offset-accent/60' : ''
      } ${className}`}
      style={{ width: size, height: size, background: avatarGradient(color) }}
    >
      <ChessPiece piece={piece} size={size * 0.52} strokeWidth={2} />
    </span>
  )
}

export function ProfileAvatar({ profile, size = 40 }: { profile: Pick<ProfileSummary, 'avatar_piece' | 'avatar_color'> | null; size?: number }) {
  return <Avatar piece={profile?.avatar_piece ?? 'pawn'} color={profile?.avatar_color ?? 'graphite'} size={size} />
}

export const CLASS_INFO: Record<ClassLetter, { color: string; motto: string }> = {
  A: { color: '232 178 80', motto: 'Лидерство и расчёт' },
  B: { color: '99 160 255', motto: 'Единство и доверие' },
  C: { color: '176 132 255', motto: 'Сила и напор' },
  D: { color: '239 68 86', motto: 'Скрытый потенциал' },
}

export function ClassBadge({ letter, className = '' }: { letter: ClassLetter; className?: string }) {
  const rgb = CLASS_INFO[letter]?.color ?? CLASS_INFO.D.color
  return (
    <span
      title={`Класс ${letter}: ${CLASS_INFO[letter]?.motto ?? ''}`}
      className={`inline-flex h-5 items-center rounded-md px-1.5 font-display text-[10px] font-semibold tracking-wider ${className}`}
      style={{ color: `rgb(${rgb})`, background: `rgb(${rgb} / 0.13)`, boxShadow: `inset 0 0 0 1px rgb(${rgb} / 0.3)` }}
    >
      КЛАСС {letter}
    </span>
  )
}

export function RoleBadge({ role }: { role: ProfileSummary['role'] }) {
  if (role === 'reader') return null
  return (
    <span className="inline-flex h-5 items-center rounded-md bg-ink/10 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-2">
      {role === 'admin' ? 'Админ' : 'Модератор'}
    </span>
  )
}
