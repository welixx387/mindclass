import { motion } from 'framer-motion'
import { BookOpen, Check, History, Loader2, LogOut, MessageCircle, Settings2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useProgressList } from '../api/library'
import { ChessPiece, PIECE_NAMES, PIECE_ORDER } from '../components/brand/ChessPiece'
import { CommentFeed } from '../components/profile/CommentFeed'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { AVATAR_COLOR_IDS, AVATAR_COLORS, CLASS_INFO } from '../components/ui/Avatar'
import { EmptyState, PageLoader } from '../components/ui/misc'
import { toast } from '../components/ui/Toaster'
import { getVolume, volumeFullTitle, type PieceName } from '../data/catalog'
import { DEMO_CHAPTER } from '../data/demoChapter'
import { timeAgo } from '../lib/format'
import type { ClassLetter } from '../lib/types'
import { useAuth } from '../store/auth'
import { Field, PasswordInput } from './AuthPage'

type Tab = 'history' | 'comments' | 'settings'

function ReadingHistory() {
  const { data } = useProgressList()
  const items = (data ?? []).slice(0, 30)
  if (!items.length) {
    return (
      <EmptyState
        icon={<BookOpen size={24} />}
        title="Вы ещё ничего не читали"
        action={
          <Link to="/year/1" className="btn-primary">
            Открыть каталог
          </Link>
        }
      >
        Как только вы откроете главу, она появится здесь вместе с прогрессом.
      </EmptyState>
    )
  }
  return (
    <ul className="space-y-2">
      {items.map((p, i) => {
        const volume = getVolume(p.volume_slug)
        const demo = p.chapter_id < 0
        return (
          <motion.li key={p.chapter_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
            <Link to={demo ? '/demo?continue=1' : `/read/${p.chapter_id}?continue=1`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-accent/35">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold group-hover:text-accent">{demo ? DEMO_CHAPTER.title : p.chapter_title ?? 'Глава'}</p>
                <p className="truncate text-xs text-muted">
                  {volume ? volumeFullTitle(volume) : 'Демо'} · {timeAgo(p.updated_at)}
                </p>
              </div>
              {p.completed ? (
                <span className="chip border-success/30 text-success">
                  <Check size={12} /> прочитано
                </span>
              ) : (
                <div className="flex w-28 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.percent}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-muted">{Math.round(p.percent)}%</span>
                </div>
              )}
            </Link>
          </motion.li>
        )
      })}
    </ul>
  )
}

function SettingsForm() {
  const profile = useAuth((s) => s.profile)!
  const user = useAuth((s) => s.user)
  const updateProfile = useAuth((s) => s.updateProfile)
  const updateEmail = useAuth((s) => s.updateEmail)
  const updatePassword = useAuth((s) => s.updatePassword)
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()

  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio)
  const [classLetter, setClassLetter] = useState<ClassLetter>(profile.class_letter)
  const [piece, setPiece] = useState<PieceName>(profile.avatar_piece)
  const [color, setColor] = useState(profile.avatar_color)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [email, setEmail] = useState(user?.email ?? '')
  const [emailPending, setEmailPending] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setSavingProfile(true)
    const err = await updateProfile({ username: username.trim(), bio: bio.trim(), class_letter: classLetter, avatar_piece: piece, avatar_color: color })
    setSavingProfile(false)
    if (err) setProfileError(err)
    else toast.success('Профиль сохранён')
  }

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault()
    setEmailPending(true)
    const err = await updateEmail(email)
    setEmailPending(false)
    if (err) toast.error('Не удалось сменить email', { description: err })
    else toast.success('Почти готово', { description: 'Подтвердите новый адрес по ссылке из письма.' })
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Пароль должен быть не короче 6 символов')
    setPasswordPending(true)
    const err = await updatePassword(password)
    setPasswordPending(false)
    if (err) toast.error('Не удалось сменить пароль', { description: err })
    else {
      setPassword('')
      toast.success('Пароль обновлён')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={saveProfile} className="card space-y-5 p-6">
        <h3 className="font-display text-lg font-semibold">Профиль</h3>
        <Field label="Ник" error={profileError}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" maxLength={24} required />
        </Field>
        <Field label="О себе" hint={`${bio.length}/280`}>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input resize-none" rows={3} maxLength={280} placeholder="Любимый том, любимый персонаж, теория…" />
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">Класс</p>
          <div className="grid grid-cols-4 gap-2">
            {(['A', 'B', 'C', 'D'] as ClassLetter[]).map((letter) => {
              const rgb = CLASS_INFO[letter].color
              const active = classLetter === letter
              return (
                <button
                  type="button"
                  key={letter}
                  onClick={() => setClassLetter(letter)}
                  className="rounded-xl border py-2 font-display text-lg font-bold transition-colors"
                  style={{ color: `rgb(${rgb})`, borderColor: active ? `rgb(${rgb})` : 'rgb(var(--line))', background: active ? `rgb(${rgb} / 0.12)` : 'transparent' }}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Аватар</p>
          <div className="grid grid-cols-6 gap-2">
            {PIECE_ORDER.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPiece(p)}
                title={PIECE_NAMES[p]}
                className={`flex aspect-square items-center justify-center rounded-xl border transition-colors ${piece === p ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink-2 hover:text-ink'}`}
              >
                <ChessPiece piece={p} size={20} />
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_COLOR_IDS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={AVATAR_COLORS[c].label}
                title={AVATAR_COLORS[c].label}
                className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                style={{ background: `linear-gradient(140deg, ${AVATAR_COLORS[c].from}, ${AVATAR_COLORS[c].to})` }}
              />
            ))}
          </div>
        </div>
        <button className="btn-primary" disabled={savingProfile}>
          {savingProfile && <Loader2 size={15} className="animate-spin" />} Сохранить профиль
        </button>
      </form>

      <div className="space-y-6">
        <form onSubmit={saveEmail} className="card space-y-4 p-6">
          <h3 className="font-display text-lg font-semibold">Email</h3>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
          <button className="btn-ghost" disabled={emailPending || email.trim() === user?.email}>
            {emailPending && <Loader2 size={15} className="animate-spin" />} Сменить email
          </button>
        </form>
        <form onSubmit={savePassword} className="card space-y-4 p-6">
          <h3 className="font-display text-lg font-semibold">Пароль</h3>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Новый пароль" />
          <button className="btn-ghost" disabled={passwordPending || !password}>
            {passwordPending && <Loader2 size={15} className="animate-spin" />} Сменить пароль
          </button>
        </form>
        <button
          className="btn-danger w-full"
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
        >
          <LogOut size={16} /> Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const status = useAuth((s) => s.status)
  const profile = useAuth((s) => s.profile)
  const location = useLocation()
  const [tab, setTab] = useState<Tab>(location.hash === '#settings' ? 'settings' : 'history')

  useEffect(() => {
    if (location.hash === '#settings') setTab('settings')
  }, [location.hash])

  if (status === 'disabled') {
    return (
      <div className="container-page py-16">
        <EmptyState icon={<Settings2 size={24} />} title="Профили появятся после подключения базы">
          Пока сайт работает без Supabase, аккаунты недоступны. Закладки и прогресс сохраняются в этом браузере.
        </EmptyState>
      </div>
    )
  }
  if (status === 'loading' || (status === 'signed-in' && !profile)) return <PageLoader />
  if (status === 'signed-out') return <Navigate to="/login?next=/profile" replace />

  const tabs: { id: Tab; label: string; icon: typeof History }[] = [
    { id: 'history', label: 'История чтения', icon: History },
    { id: 'comments', label: 'Комментарии', icon: MessageCircle },
    { id: 'settings', label: 'Настройки', icon: Settings2 },
  ]

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <ProfileHeader profile={profile!} />

      <div id="settings" className="mb-8 mt-10 flex gap-1 overflow-x-auto border-b border-line/60">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-1 text-sm font-semibold">
            <t.icon size={15} className={tab === t.id ? 'text-accent' : 'text-muted'} />
            <span className={tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'}>{t.label}</span>
            {tab === t.id && <motion.span layoutId="profile-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {tab === 'history' && <ReadingHistory />}
        {tab === 'comments' && <CommentFeed userId={profile!.id} />}
        {tab === 'settings' && <SettingsForm />}
      </motion.div>
    </div>
  )
}
