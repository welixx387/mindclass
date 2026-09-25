import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
// Подойдёт и старый anon key, и новый publishable key — оба публичные.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()

/**
 * Без ключей Supabase сайт работает в режиме витрины: каталог, демо-глава и
 * локальные закладки доступны, а вход, комментарии и главы из базы — нет.
 * Настройка описана в README.md и .env.example.
 */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mindclass-auth',
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase не настроен: добавьте VITE_SUPABASE_URL и ключ в переменные окружения.')
  return supabase
}

export const ILLUSTRATIONS_BUCKET = 'illustrations'
