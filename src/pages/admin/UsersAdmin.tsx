import { useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { setUserRole, useProfilesAdmin } from '../../api/admin'
import { Avatar, ClassBadge } from '../../components/ui/Avatar'
import { confirmDialog } from '../../components/ui/Overlay'
import { toast } from '../../components/ui/Toaster'
import { formatDate } from '../../lib/format'
import type { Profile, Role } from '../../lib/types'
import { translateError, useAuth } from '../../store/auth'

const ROLES: { id: Role; label: string }[] = [
  { id: 'reader', label: 'Читатель' },
  { id: 'moderator', label: 'Модератор' },
  { id: 'admin', label: 'Администратор' },
]

export default function UsersAdmin() {
  const [search, setSearch] = useState('')
  const { data: users, isLoading } = useProfilesAdmin(search)
  const me = useAuth((s) => s.profile)
  const queryClient = useQueryClient()

  const changeRole = async (user: Profile, role: Role) => {
    if (role === user.role) return
    const ok = await confirmDialog({
      title: `Сделать ${user.username} — «${ROLES.find((r) => r.id === role)?.label}»?`,
      description:
        role === 'admin'
          ? 'Администратор может загружать и удалять главы, а также назначать роли.'
          : role === 'moderator'
            ? 'Модератор может удалять любые комментарии.'
            : 'Пользователь потеряет дополнительные права.',
      confirmLabel: 'Изменить роль',
    })
    if (!ok) return
    try {
      await setUserRole(user.id, role)
      toast.success('Роль изменена')
      void queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
    } catch (e) {
      toast.error('Не удалось изменить роль', { description: translateError(e) })
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Пользователи</h1>
      <p className="mt-2 text-sm text-ink-2">Модераторы могут удалять комментарии, администраторы — ещё и управлять главами.</p>

      <label className="relative mt-6 block max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Поиск по нику" />
      </label>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line/70">
        {isLoading && !users ? (
          <div className="skeleton h-40" />
        ) : !users?.length ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Никого не нашлось.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-line/60 bg-surface/60 px-4 py-3 last:border-b-0">
              <Avatar piece={u.avatar_piece} color={u.avatar_color} size={36} />
              <div className="min-w-0 flex-1">
                <Link to={`/u/${encodeURIComponent(u.username)}`} className="flex items-center gap-2 text-sm font-semibold hover:text-accent">
                  {u.username} <ClassBadge letter={u.class_letter} />
                </Link>
                <p className="text-xs text-muted">с {formatDate(u.created_at)}</p>
              </div>
              <select
                value={u.role}
                disabled={u.id === me?.id}
                onChange={(e) => void changeRole(u, e.target.value as Role)}
                className="input w-auto py-1.5 text-sm"
                aria-label={`Роль ${u.username}`}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
