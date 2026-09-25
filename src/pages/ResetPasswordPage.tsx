import { motion } from 'framer-motion'
import { Loader2, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from '../components/ui/Toaster'
import { useAuth } from '../store/auth'
import { Field, PasswordInput } from './AuthPage'

/** Сюда ведёт ссылка из письма «сбросить пароль»: Supabase уже создал сессию. */
export default function ResetPasswordPage() {
  const status = useAuth((s) => s.status)
  const updatePassword = useAuth((s) => s.updatePassword)
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return setError('Пароль должен быть не короче 6 символов')
    if (password !== confirm) return setError('Пароли не совпадают')
    setPending(true)
    const err = await updatePassword(password)
    setPending(false)
    if (err) return setError(err)
    toast.success('Пароль обновлён')
    navigate('/', { replace: true })
  }

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-7 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
          <LockKeyhole size={22} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Новый пароль</h1>
        {status === 'loading' ? (
          <div className="mt-6 flex justify-center text-muted">
            <Loader2 className="animate-spin" />
          </div>
        ) : status !== 'signed-in' ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Ссылка устарела или уже была использована. Запросите новую на странице{' '}
            <Link to="/forgot" className="link">
              восстановления пароля
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Новый пароль">
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Минимум 6 символов" />
            </Field>
            <Field label="Повторите пароль" error={error}>
              <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </Field>
            <button className="btn-primary w-full py-3" disabled={pending}>
              {pending ? <Loader2 size={17} className="animate-spin" /> : 'Сохранить пароль'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
