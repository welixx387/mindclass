import { motion } from 'framer-motion'
import { Image as ImageIcon, LayoutDashboard, Library, MessageSquareWarning, ShieldAlert, Users } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { EmptyState, PageLoader } from '../../components/ui/misc'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../store/auth'

const AdminDashboard = lazy(() => import('./AdminDashboard'))
const VolumeManager = lazy(() => import('./VolumeManager'))
const ChapterEditor = lazy(() => import('./ChapterEditor'))
const UsersAdmin = lazy(() => import('./UsersAdmin'))
const ModerationAdmin = lazy(() => import('./ModerationAdmin'))
const AppearanceAdmin = lazy(() => import('./AppearanceAdmin'))

const NAV = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/volumes', label: 'Тома и главы', icon: Library },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/comments', label: 'Комментарии', icon: MessageSquareWarning },
  { to: '/admin/appearance', label: 'Оформление', icon: ImageIcon },
]

export default function AdminPage() {
  const status = useAuth((s) => s.status)
  const profile = useAuth((s) => s.profile)

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={<ShieldAlert size={24} />} title="Админ-панель недоступна">
          Сначала подключите Supabase (см. README): админ-панель хранит главы в базе данных.
        </EmptyState>
      </div>
    )
  }
  if (status === 'loading' || (status === 'signed-in' && !profile)) return <PageLoader />
  if (status === 'signed-out') return <Navigate to="/login?next=/admin" replace />
  if (profile?.role !== 'admin') {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShieldAlert size={24} />}
          title="Нужны права администратора"
          action={
            <Link to="/" className="btn-ghost">
              На главную
            </Link>
          }
        >
          <p>
            Назначить администратора можно в Supabase → SQL Editor:
            <code className="mt-3 block rounded-xl bg-surface-2 px-3 py-2 text-left text-xs text-ink">
              update public.profiles set role = 'admin' where username = '{profile?.username ?? 'ВашНик'}';
            </code>
          </p>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="container-page grid gap-8 pb-10 pt-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="eyebrow mb-4 hidden lg:block">Админ-панель</p>
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'text-ink' : 'text-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-surface-2 ring-1 ring-line" />}
                  <item.icon size={16} className={`relative ${isActive ? 'text-accent' : ''}`} />
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="volumes" element={<AdminDashboard volumesOnly />} />
            <Route path="volume/:slug" element={<VolumeManager />} />
            <Route path="chapter/:id" element={<ChapterEditor />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="comments" element={<ModerationAdmin />} />
            <Route path="appearance" element={<AppearanceAdmin />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </section>
    </div>
  )
}
