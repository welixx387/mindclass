import { motion } from 'framer-motion'
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../store/auth'
import { Field } from './AuthPage'

export default function ForgotPasswordPage() {
  const request = useAuth((s) => s.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const err = await request(email)
    setPending(false)
    if (err) setError(err)
    else setSent(true)
  }

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-7 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">{sent ? <MailCheck size={22} /> : <KeyRound size={22} />}</div>
        <h1 className="mt-5 font-display text-2xl font-semibold">{sent ? 'Письмо отправлено' : 'Восстановление пароля'}</h1>
        {sent ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Если аккаунт с адресом <b className="text-ink">{email}</b> существует, в письме будет ссылка для смены пароля. Проверьте и папку «Спам».
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-2">Укажите email аккаунта — пришлём ссылку для создания нового пароля.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email" error={error}>
                <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" disabled={!isSupabaseConfigured} />
              </Field>
              <button className="btn-primary w-full py-3" disabled={pending || !isSupabaseConfigured}>
                {pending ? <Loader2 size={17} className="animate-spin" /> : 'Отправить ссылку'}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Ко входу
        </Link>
      </motion.div>
    </div>
  )
}
