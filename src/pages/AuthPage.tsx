import { AnimatePresence, motion } from 'framer-motion'
import { Check, Eye, EyeOff, Loader2, MailCheck, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { isUsernameAvailable } from '../api/profiles'
import { ChessPiece, PIECE_NAMES, PIECE_ORDER } from '../components/brand/ChessPiece'
import { LogoMark } from '../components/brand/Logo'
import { Avatar, AVATAR_COLOR_IDS, AVATAR_COLORS, CLASS_INFO } from '../components/ui/Avatar'
import type { PieceName } from '../data/catalog'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ClassLetter } from '../lib/types'
import { useAuth } from '../store/auth'

const EASE = [0.22, 1, 0.36, 1] as const
const USERNAME_RE = /^[A-Za-zА-Яа-яЁё0-9_.-]{3,24}$/

function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export function Field({ label, hint, children, error }: { label: string; hint?: ReactNode; children: ReactNode; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 block text-xs text-danger">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  )
}

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={6}
        className="input pr-11"
      />
      <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function passwordScore(pw: string): number {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-ZА-ЯЁ]/.test(pw) && /[a-zа-яё]/.test(pw)) score++
  if (/\d/.test(pw) && /[^\p{L}\d]/u.test(pw)) score++
  return score
}

function Strength({ password }: { password: string }) {
  const score = passwordScore(password)
  const labels = ['Слишком короткий', 'Слабый', 'Нормальный', 'Хороший', 'Отличный']
  const colors = ['rgb(var(--danger))', 'rgb(var(--danger))', 'rgb(var(--gold))', 'rgb(var(--success))', 'rgb(var(--success))']
  if (!password) return null
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} className="h-1 flex-1 rounded-full" animate={{ background: i < score ? colors[score] : 'rgb(var(--line))' }} />
        ))}
      </div>
      <span className="text-[11px] text-muted">{labels[score]}</span>
    </div>
  )
}

function ArtPanel() {
  const pieces: { piece: PieceName; x: string; y: string; size: number; delay: number }[] = [
    { piece: 'king', x: '50%', y: '44%', size: 150, delay: 0.2 },
    { piece: 'knight', x: '24%', y: '64%', size: 90, delay: 0.35 },
    { piece: 'queen', x: '76%', y: '62%', size: 100, delay: 0.45 },
    { piece: 'pawn', x: '34%', y: '28%', size: 56, delay: 0.55 },
    { piece: 'rook', x: '70%', y: '26%', size: 64, delay: 0.6 },
  ]
  return (
    <div className="relative hidden overflow-hidden rounded-[32px] border border-line/70 bg-surface/60 lg:block">
      <div className="bg-grid absolute inset-0 opacity-80" />
      <div className="orb left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgb(var(--accent) / 0.25)' }} />
      {pieces.map((p) => (
        <motion.div
          key={p.piece}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-ink"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: p.piece === 'king' ? 0.9 : 0.35, y: 0, scale: 1 }}
          transition={{ delay: p.delay, duration: 0.9, ease: EASE }}
        >
          <div style={{ animation: `float-piece ${8 + p.size / 30}s ease-in-out infinite` }}>
            <ChessPiece piece={p.piece} size={p.size} strokeWidth={p.piece === 'king' ? 1.2 : 1} />
          </div>
        </motion.div>
      ))}
      <div className="absolute inset-x-0 bottom-0 p-10">
        <p className="font-quote text-3xl italic leading-snug text-ink">«Знание — сила.»</p>
        <p className="mt-2 font-display text-xs uppercase tracking-[0.3em] text-muted">— Фрэнсис Бэкон</p>
      </div>
    </div>
  )
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const status = useAuth((s) => s.status)
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  if (status === 'signed-in') return <Navigate to={next} replace />

  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] gap-8 py-8 lg:grid-cols-2 lg:py-10">
      <ArtPanel />
      <div className="flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark size={52} />
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">{mode === 'login' ? 'С возвращением' : 'Зачисление в MindClass'}</h1>
            <p className="mt-2 text-sm text-ink-2">
              {mode === 'login' ? 'Войдите, чтобы комментировать и хранить закладки в облаке.' : 'Аккаунт нужен для комментариев и синхронизации закладок.'}
            </p>
          </div>

          <div className="relative mb-6 grid grid-cols-2 rounded-2xl border border-line bg-surface/70 p-1">
            {(['login', 'register'] as const).map((m) => (
              <Link key={m} to={`/${m}${params.toString() ? `?${params}` : ''}`} replace className="relative rounded-xl py-2.5 text-center text-sm font-semibold">
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-xl bg-elev shadow ring-1 ring-line" transition={{ type: 'spring', stiffness: 460, damping: 34 }} />}
                <span className={`relative ${mode === m ? 'text-ink' : 'text-muted hover:text-ink'}`}>{m === 'login' ? 'Вход' : 'Регистрация'}</span>
              </Link>
            ))}
          </div>

          {!isSupabaseConfigured ? (
            <div className="card p-5 text-sm leading-relaxed text-ink-2">
              Вход и регистрация заработают после подключения Supabase: добавьте <code className="text-ink">VITE_SUPABASE_URL</code> и ключ в переменные окружения (см.
              README). Пока можно читать демо-главу и ставить закладки — они сохранятся в браузере.
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'register' ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'register' ? -16 : 16 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {mode === 'login' ? <LoginForm next={next} /> : <RegisterForm next={next} />}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function FormError({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function LoginForm({ next }: { next: string }) {
  const signIn = useAuth((s) => s.signIn)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    const err = await signIn(email, password)
    setPending(false)
    if (err) setError(err)
    else navigate(next, { replace: true })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
      </Field>
      <Field
        label="Пароль"
        hint={
          <Link to="/forgot" className="text-accent hover:underline">
            Забыли пароль?
          </Link>
        }
      >
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <FormError error={error} />
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? <Loader2 size={17} className="animate-spin" /> : 'Войти'}
      </button>
    </form>
  )
}

function RegisterForm({ next }: { next: string }) {
  const signUp = useAuth((s) => s.signUp)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [classLetter, setClassLetter] = useState<ClassLetter>('D')
  const [piece, setPiece] = useState<PieceName>('knight')
  const [color, setColor] = useState('crimson')
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    const name = username.trim()
    if (!name) return setAvailability('idle')
    if (!USERNAME_RE.test(name)) return setAvailability('invalid')
    setAvailability('checking')
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const free = await isUsernameAvailable(name)
        if (!cancelled) setAvailability(free ? 'free' : 'taken')
      } catch {
        if (!cancelled) setAvailability('idle')
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [username])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!USERNAME_RE.test(username.trim())) return setError('Ник: 3–24 символа — буквы, цифры, «_», «.» или «-»')
    if (availability === 'taken') return setError('Этот ник уже занят')
    if (password.length < 6) return setError('Пароль должен быть не короче 6 символов')
    if (password !== confirm) return setError('Пароли не совпадают')
    setPending(true)
    const result = await signUp({ email, password, username: username.trim(), classLetter, avatarPiece: piece, avatarColor: color })
    setPending(false)
    if (result.error) setError(result.error)
    else if (result.needsConfirmation) setSentTo(email.trim())
    else navigate(next, { replace: true })
  }

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <MailCheck size={26} />
        </div>
        <h2 className="mt-5 font-display text-lg font-semibold">Проверьте почту</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Мы отправили письмо на <b className="text-ink">{sentTo}</b>. Перейдите по ссылке из письма, чтобы подтвердить адрес, а затем войдите.
        </p>
        <Link to="/login" className="btn-primary mt-6">
          Ко входу
        </Link>
      </motion.div>
    )
  }

  const availabilityHint = {
    idle: null,
    checking: <Loader2 size={13} className="animate-spin" />,
    free: (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={13} /> свободен
      </span>
    ),
    taken: (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={13} /> занят
      </span>
    ),
    invalid: <span className="text-danger">3–24 символа</span>,
  }[availability]

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card flex items-center gap-4 p-4">
        <motion.div key={`${piece}-${color}`} initial={{ scale: 0.7, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}>
          <Avatar piece={piece} color={color} size={56} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{username.trim() || 'Ваш ник'}</p>
          <p className="text-xs text-muted">
            Класс {classLetter} · {PIECE_NAMES[piece]}
          </p>
        </div>
      </div>

      <Field label="Ник" hint={availabilityHint}>
        <input required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="input" placeholder="Например, kiyotaka_fan" autoComplete="username" maxLength={24} />
      </Field>
      <Field label="Email">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Минимум 6 символов" />
        </Field>
        <Field label="Повторите пароль">
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
      </div>
      <Strength password={password} />

      <div>
        <p className="mb-2 text-sm font-semibold">Ваш класс</p>
        <div className="grid grid-cols-4 gap-2">
          {(['A', 'B', 'C', 'D'] as ClassLetter[]).map((letter) => {
            const active = classLetter === letter
            const rgb = CLASS_INFO[letter].color
            return (
              <button
                type="button"
                key={letter}
                onClick={() => setClassLetter(letter)}
                title={CLASS_INFO[letter].motto}
                className="rounded-xl border py-2.5 font-display text-lg font-bold transition-all"
                style={{
                  color: `rgb(${rgb})`,
                  borderColor: active ? `rgb(${rgb})` : 'rgb(var(--line))',
                  background: active ? `rgb(${rgb} / 0.12)` : 'transparent',
                  transform: active ? 'translateY(-2px)' : undefined,
                }}
              >
                {letter}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">{CLASS_INFO[classLetter].motto}. Класс виден рядом с ником в комментариях.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Фигура и цвет аватара</p>
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
              title={AVATAR_COLORS[c].label}
              aria-label={AVATAR_COLORS[c].label}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: `linear-gradient(140deg, ${AVATAR_COLORS[c].from}, ${AVATAR_COLORS[c].to})` }}
            />
          ))}
        </div>
      </div>

      <FormError error={error} />
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? <Loader2 size={17} className="animate-spin" /> : 'Создать аккаунт'}
      </button>
      <p className="text-center text-xs text-muted">Регистрируясь, вы обещаете не публиковать спойлеры без тега ||спойлер||.</p>
    </form>
  )
}
