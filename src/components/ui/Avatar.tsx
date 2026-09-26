import type { AvatarMotif } from '../../data/motifs'
import type { ClassLetter, ProfileSummary } from '../../lib/types'
import { Motif } from '../brand/Motif'

export const AVATAR_COLORS: Record<string, { label: string; from: string; to: string }> = {
  rose: { label: 'Сакура', from: '#ffb3d1', to: '#e0337f' },
  crimson: { label: 'Малина', from: '#ff6f98', to: '#a3124a' },
  peach: { label: 'Персик', from: '#ffd2b0', to: '#f07a4f' },
  lilac: { label: 'Сирень', from: '#e2c6ff', to: '#8f55e8' },
  violet: { label: 'Фиалка', from: '#b69cff', to: '#5b2fd0' },
  sapphire: { label: 'Сапфир', from: '#9fb0ff', to: '#3a47c2' },
  cyan: { label: 'Лёд', from: '#9df0ff', to: '#1b8fb0' },
  emerald: { label: 'Мята', from: '#9ff2cb', to: '#119270' },
  gold: { label: 'Золото', from: '#ffe19a', to: '#c7841a' },
  graphite: { label: 'Графит', from: '#b9b1c2', to: '#4a4152' },
}

export const AVATAR_COLOR_IDS = Object.keys(AVATAR_COLORS)

export function avatarGradient(color: string): string {
  const c = AVATAR_COLORS[color] ?? AVATAR_COLORS.rose
  return `linear-gradient(140deg, ${c.from}, ${c.to})`
}

export function Avatar({
  motif,
  color,
  size = 40,
  className = '',
}: {
  motif: AvatarMotif
  color: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${className}`}
      style={{ width: size, height: size, background: avatarGradient(color) }}
    >
      <span className="pointer-events-none absolute -left-1/4 -top-1/4 h-3/4 w-3/4 rounded-full bg-white/25 blur-[6px]" />
      <Motif name={motif} size={size * 0.5} strokeWidth={2.2} className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
    </span>
  )
}

export function ProfileAvatar({ profile, size = 40 }: { profile: Pick<ProfileSummary, 'avatar_piece' | 'avatar_color'> | null; size?: number }) {
  return <Avatar motif={profile?.avatar_piece ?? 'heart'} color={profile?.avatar_color ?? 'graphite'} size={size} />
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
