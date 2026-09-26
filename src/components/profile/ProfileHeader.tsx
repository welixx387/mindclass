import { motion } from 'framer-motion'
import { BookCheck, Heart, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useProfileStats } from '../../api/profiles'
import { formatDate } from '../../lib/format'
import type { Profile } from '../../lib/types'
import { Avatar, avatarGradient, ClassBadge, RoleBadge } from '../ui/Avatar'
import { CountUp } from '../ui/misc'

export function ProfileHeader({ profile, actions }: { profile: Profile; actions?: ReactNode }) {
  const { data: stats } = useProfileStats(profile.id)
  const items = [
    { icon: BookCheck, label: 'глав прочитано', value: stats?.chapters_read ?? 0 },
    { icon: MessageCircle, label: 'комментариев', value: stats?.comments ?? 0 },
    { icon: Heart, label: 'лайков получено', value: stats?.likes ?? 0 },
  ]

  return (
    <section className="card relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-28 opacity-50" style={{ background: avatarGradient(profile.avatar_color) }} />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-surface" />
      <div className="relative flex flex-col gap-6 p-6 pt-12 sm:flex-row sm:items-end sm:p-8 sm:pt-14">
        <motion.div initial={{ scale: 0.6, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
          <Avatar name={profile.username} color={profile.avatar_color} size={96} className="ring-4 ring-surface" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight">{profile.username}</h1>
            <ClassBadge letter={profile.class_letter} />
            <RoleBadge role={profile.role} />
          </div>
          <p className="mt-1 text-sm text-muted">В MindClass с {formatDate(profile.created_at)}</p>
          {profile.bio && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{profile.bio}</p>}
        </div>
        {actions}
      </div>
      <div className="relative grid grid-cols-3 border-t border-line/60">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1 px-2 py-5 text-center sm:flex-row sm:justify-center sm:gap-3">
            <item.icon size={18} className="text-accent" />
            <div>
              <CountUp value={item.value} className="font-display text-xl font-semibold" />
              <p className="text-xs text-muted">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
