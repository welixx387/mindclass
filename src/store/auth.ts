import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ClassLetter, Profile } from '../lib/types'
import type { PieceName } from '../data/catalog'

export type AuthStatus = 'disabled' | 'loading' | 'signed-in' | 'signed-out'

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Неверный email или пароль'],
  [/user already registered/i, 'Этот email уже зарегистрирован — попробуйте войти'],
  [/email not confirmed/i, 'Email ещё не подтверждён — проверьте почту'],
  [/password should be at least/i, 'Пароль должен быть не короче 6 символов'],
  [/weak and easy to guess|pwned/i, 'Пароль слишком простой — придумайте другой'],
  [/unable to validate email|invalid format|email address .* is invalid/i, 'Некорректный email'],
  [/email rate limit|over_email_send_rate_limit/i, 'Слишком много писем. Попробуйте чуть позже'],
  [/for security purposes, you can only request this after (\d+) seconds/i, 'Повторить можно через $1 сек.'],
  [/new password should be different/i, 'Новый пароль должен отличаться от старого'],
  [/signups? not allowed|signup is disabled/i, 'Регистрация сейчас закрыта'],
  [/database error saving new user/i, 'Не удалось создать профиль. Попробуйте другой ник'],
  [/auth session missing|jwt expired|invalid jwt/i, 'Сессия истекла — войдите снова'],
  [/duplicate key|23505|profiles_username_lower_idx/i, 'Этот ник уже занят'],
  [/profiles_username_format/i, 'Ник: 3–24 символа — буквы, цифры, «_», «.», «-»'],
  [/failed to fetch|networkerror|network request failed|load failed/i, 'Нет связи с сервером. Проверьте интернет'],
]

export function translateError(error: unknown): string {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Неизвестная ошибка'
  for (const [re, text] of MESSAGES) {
    const m = re.exec(message)
    if (m) return text.replace('$1', m[1] ?? '')
  }
  return message
}

export interface SignUpInput {
  email: string
  password: string
  username: string
  classLetter: ClassLetter
  avatarPiece: PieceName
  avatarColor: string
}

type ProfilePatch = Partial<Pick<Profile, 'username' | 'class_letter' | 'avatar_piece' | 'avatar_color' | 'bio'>>

interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: Profile | null
  /** Пользователь пришёл по ссылке «сбросить пароль» из письма. */
  recovery: boolean
  init: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  updateEmail: (email: string) => Promise<string | null>
  updateProfile: (patch: ProfilePatch) => Promise<string | null>
  refreshProfile: () => Promise<void>
}

let initialized = false

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, username, class_letter, avatar_piece, avatar_color, bio, role, created_at')
    .eq('id', userId)
    .maybeSingle()
  return (data as Profile | null) ?? null
}

export const useAuth = create<AuthState>()((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'disabled',
  session: null,
  user: null,
  profile: null,
  recovery: false,

  init: () => {
    if (!supabase || initialized) return
    initialized = true

    const apply = async (session: Session | null) => {
      if (!session) {
        set({ status: 'signed-out', session: null, user: null, profile: null })
        return
      }
      const sameUser = get().user?.id === session.user.id
      set({ status: 'signed-in', session, user: session.user })
      if (!sameUser || !get().profile) {
        // Профиль создаётся триггером сразу после регистрации; на всякий случай
        // повторяем запрос, если он ещё не успел появиться.
        let profile = await loadProfile(session.user.id)
        if (!profile) {
          await new Promise((r) => setTimeout(r, 600))
          profile = await loadProfile(session.user.id)
        }
        if (get().user?.id === session.user.id) set({ profile })
      }
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true })
      // Колбэк не должен ждать запросов к базе — иначе клиент может зависнуть.
      setTimeout(() => void apply(session), 0)
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return 'Вход недоступен: Supabase не настроен'
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? translateError(error) : null
  },

  signUp: async ({ email, password, username, classLetter, avatarPiece, avatarColor }) => {
    if (!supabase) return { error: 'Регистрация недоступна: Supabase не настроен', needsConfirmation: false }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username: username.trim(),
          class_letter: classLetter,
          avatar_piece: avatarPiece,
          avatar_color: avatarColor,
        },
      },
    })
    if (error) return { error: translateError(error), needsConfirmation: false }
    // Если в проекте включено подтверждение email, сессии ещё нет.
    return { error: null, needsConfirmation: !data.session }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ status: 'signed-out', session: null, user: null, profile: null, recovery: false })
  },

  requestPasswordReset: async (email) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error ? translateError(error) : null
  },

  updatePassword: async (password) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) set({ recovery: false })
    return error ? translateError(error) : null
  },

  updateEmail: async (email) => {
    if (!supabase) return 'Supabase не настроен'
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/profile` }
    )
    return error ? translateError(error) : null
  },

  updateProfile: async (patch) => {
    const { profile } = get()
    if (!supabase || !profile) return 'Нужно войти в аккаунт'
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', profile.id)
      .select('id, username, class_letter, avatar_piece, avatar_color, bio, role, created_at')
      .single()
    if (error) return translateError(error)
    set({ profile: data as Profile })
    return null
  },

  refreshProfile: async () => {
    const id = get().user?.id
    if (!id) return
    set({ profile: await loadProfile(id) })
  },
}))

export function useIsAdmin(): boolean {
  return useAuth((s) => s.profile?.role === 'admin')
}

export function useIsStaff(): boolean {
  return useAuth((s) => s.profile?.role === 'admin' || s.profile?.role === 'moderator')
}

/** Ключ для кэша запросов: у гостя и у каждого пользователя — свои данные. */
export function useViewerKey(): string {
  return useAuth((s) => (s.status === 'signed-in' && s.user ? s.user.id : 'guest'))
}
