import { QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { migrateGuestLibrary } from './api/library'
import { queryClient } from './api/queryClient'
import { AnimatedBackground } from './components/layout/AnimatedBackground'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { SearchPalette } from './components/layout/SearchPalette'
import { PageLoader } from './components/ui/misc'
import { ConfirmHost } from './components/ui/Overlay'
import { toast, Toaster } from './components/ui/Toaster'
import { isSupabaseConfigured } from './lib/supabase'
import { HomePage } from './pages/HomePage'
import { useAuth } from './store/auth'
import { applyTheme, useUi } from './store/ui'

const YearPage = lazy(() => import('./pages/YearPage'))
const VolumePage = lazy(() => import('./pages/VolumePage'))
const ReaderPage = lazy(() => import('./pages/ReaderPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UserPage = lazy(() => import('./pages/UserPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function SetupBanner() {
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('mc-setup-hidden') === '1')
  if (isSupabaseConfigured || hidden) return null
  return (
    <div className="relative z-50 border-b border-gold/30 bg-gold/10 text-[13px] text-ink-2">
      <div className="container-page flex items-center gap-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
        <p className="flex-1">
          Режим витрины: база Supabase не подключена, поэтому вход, комментарии и главы из базы недоступны. Как подключить — в
          README.
        </p>
        <button
          onClick={() => {
            sessionStorage.setItem('mc-setup-hidden', '1')
            setHidden(true)
          }}
          className="rounded-md p-1 text-muted hover:text-ink"
          aria-label="Скрыть"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

/** Переносит гостевые закладки в аккаунт сразу после входа. */
function GuestMigration() {
  const userId = useAuth((s) => (s.status === 'signed-in' ? s.user?.id : undefined))
  useEffect(() => {
    if (!userId) return
    migrateGuestLibrary(userId)
      .then((count) => {
        if (count > 0) {
          void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
          void queryClient.invalidateQueries({ queryKey: ['progress'] })
          toast.success('Закладки перенесены в аккаунт', { description: 'Теперь они доступны на любом устройстве.' })
        }
      })
      .catch(() => undefined)
  }, [userId])
  return null
}

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.slice(1))
  let tries = 0
  const attempt = () => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (tries++ < 20) setTimeout(attempt, 150)
  }
  attempt()
}

function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isReader = location.pathname.startsWith('/read/') || location.pathname === '/demo'
  const isAuth = /^\/(login|register|forgot|reset-password)/.test(location.pathname)

  return (
    <>
      {!isReader && <AnimatedBackground />}
      {!isReader && <SetupBanner />}
      {!isReader && <Header />}
      <main className={isReader ? '' : 'min-h-[70vh]'}>{children}</main>
      {!isReader && !isAuth && <Footer />}
    </>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  // Внутри читалки смена главы не должна перерисовывать всю страницу с анимацией.
  const key = location.pathname.startsWith('/read/') ? '/read' : location.pathname

  useEffect(() => {
    if (location.hash) scrollToHash(location.hash)
  }, [location.hash, location.pathname])

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        if (!window.location.hash) window.scrollTo({ top: 0 })
      }}
    >
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/year/:year" element={<YearPage />} />
            <Route path="/volume/:slug" element={<VolumePage />} />
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route path="/demo" element={<ReaderPage demo />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/u/:username" element={<UserPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const theme = useUi((s) => s.theme)
  const init = useAuth((s) => s.init)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => init(), [init])

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Shell>
            <AnimatedRoutes />
          </Shell>
          <SearchPalette />
          <GuestMigration />
          <Toaster />
          <ConfirmHost />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  )
}
