import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, LogIn, LogOut, Menu, Moon, Search, Settings2, Shield, Sun, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { Logo } from '../brand/Logo'
import { Avatar, ClassBadge } from '../ui/Avatar'

const NAV = [
  { to: '/', label: 'Главная', end: true },
  { to: '/year/1', label: '1 год' },
  { to: '/year/2', label: '2 год' },
  { to: '/bookmarks', label: 'Закладки' },
]

export function ThemeToggle() {
  const theme = useUi((s) => s.theme)
  const toggle = useUi((s) => s.toggleTheme)
  return (
    <button onClick={toggle} className="icon-btn relative overflow-hidden" aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} title="Сменить тему">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -20, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: 20, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function UserMenu() {
  const profile = useAuth((s) => s.profile)
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!profile) return <span className="skeleton h-9 w-9 rounded-full" />

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 transition-transform hover:scale-105"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню профиля"
      >
        <Avatar piece={profile.avatar_piece} color={profile.avatar_color} size={36} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border border-line bg-elev p-2 shadow-pop"
          >
            <div className="flex items-center gap-3 px-3 pb-3 pt-2">
              <Avatar piece={profile.avatar_piece} color={profile.avatar_color} size={40} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile.username}</p>
                <ClassBadge letter={profile.class_letter} className="mt-1" />
              </div>
            </div>
            <div className="my-1 h-px bg-line/70" />
            <Link to="/profile" className={item} onClick={() => setOpen(false)} role="menuitem">
              <User size={16} /> Профиль
            </Link>
            <Link to="/bookmarks" className={item} onClick={() => setOpen(false)} role="menuitem">
              <Bookmark size={16} /> Закладки
            </Link>
            <Link to="/profile#settings" className={item} onClick={() => setOpen(false)} role="menuitem">
              <Settings2 size={16} /> Настройки
            </Link>
            {profile.role === 'admin' && (
              <Link to="/admin" className={item} onClick={() => setOpen(false)} role="menuitem">
                <Shield size={16} /> Админка
              </Link>
            )}
            <div className="my-1 h-px bg-line/70" />
            <button
              className={`${item} text-danger hover:text-danger`}
              role="menuitem"
              onClick={async () => {
                setOpen(false)
                await signOut()
                navigate('/')
              }}
            >
              <LogOut size={16} /> Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const status = useAuth((s) => s.status)
  const setSearchOpen = useUi((s) => s.setSearchOpen)
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [location.pathname])

  const loginHref = `/login?next=${encodeURIComponent(location.pathname + location.search)}`

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled || mobileOpen ? 'glass border-b border-line/60' : 'border-b border-transparent'
      }`}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0" aria-label="MindClass — на главную">
          <Logo />
        </Link>

        <nav className="relative ml-4 hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative rounded-full px-3.5 py-2 text-sm font-medium">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className={`relative transition-colors ${isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-xl border border-line/80 bg-surface/60 pl-3 pr-2 text-sm text-muted transition-colors hover:border-ink-2/30 hover:text-ink sm:flex"
            aria-label="Поиск"
          >
            <Search size={16} />
            <span className="pr-6">Поиск</span>
            <kbd className="rounded-md border border-line bg-bg/60 px-1.5 py-0.5 font-sans text-[11px] text-muted">Ctrl K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="icon-btn sm:hidden" aria-label="Поиск">
            <Search size={18} />
          </button>
          <ThemeToggle />
          {status === 'signed-in' && <UserMenu />}
          {status === 'signed-out' && (
            <Link to={loginHref} className="btn-primary ml-1 hidden px-4 py-2 sm:inline-flex">
              <LogIn size={16} /> Войти
            </Link>
          )}
          {status === 'loading' && <span className="skeleton ml-1 h-9 w-9 rounded-full" />}
          <button className="icon-btn md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Меню" aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
            aria-label="Мобильная навигация"
          >
            <div className="container-page flex flex-col gap-1 pb-4">
              {NAV.map((item, i) => (
                <motion.div key={item.to} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[15px] font-medium ${isActive ? 'bg-surface-2 text-ink' : 'text-ink-2'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
              {status === 'signed-out' && (
                <Link to={loginHref} className="btn-primary mt-2">
                  <LogIn size={16} /> Войти или зарегистрироваться
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
