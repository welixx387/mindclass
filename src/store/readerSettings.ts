import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clamp } from '../lib/format'

export type ReaderTheme = 'auto' | 'night' | 'day' | 'sepia' | 'oled'
export type ReaderFont = 'literata' | 'pt-serif' | 'lora' | 'manrope' | 'system'

export interface ReaderSettings {
  theme: ReaderTheme
  font: ReaderFont
  size: number
  leading: number
  width: number
  gap: number
  align: 'left' | 'justify'
  indent: boolean
  autoHide: boolean
}

export const READER_DEFAULTS: ReaderSettings = {
  theme: 'auto',
  font: 'literata',
  size: 19,
  leading: 1.75,
  width: 720,
  gap: 0.7,
  align: 'left',
  indent: true,
  autoHide: true,
}

export const READER_LIMITS = {
  size: { min: 14, max: 30, step: 1 },
  leading: { min: 1.3, max: 2.3, step: 0.05 },
  width: { min: 480, max: 1000, step: 20 },
  gap: { min: 0, max: 1.6, step: 0.1 },
} as const

export const READER_FONTS: { id: ReaderFont; label: string; css: string }[] = [
  { id: 'literata', label: 'Literata', css: "'Literata'" },
  { id: 'pt-serif', label: 'PT Serif', css: "'PT Serif'" },
  { id: 'lora', label: 'Lora', css: "'Lora'" },
  { id: 'manrope', label: 'Manrope', css: "'Manrope'" },
  { id: 'system', label: 'Системный', css: 'system-ui' },
]

export const READER_THEMES: { id: ReaderTheme; label: string; swatch: string; ink: string }[] = [
  { id: 'auto', label: 'Как сайт', swatch: 'linear-gradient(135deg, #100b14 50%, #fef7fb 50%)', ink: '#888' },
  { id: 'night', label: 'Ночь', swatch: '#100b14', ink: '#e6dbe3' },
  { id: 'day', label: 'Белая комната', swatch: '#fafaf7', ink: '#1c1e24' },
  { id: 'sepia', label: 'Сепия', swatch: '#f4ecd8', ink: '#40301e' },
  { id: 'oled', label: 'Чёрный', swatch: '#000000', ink: '#c4c6ce' },
]

interface ReaderSettingsState extends ReaderSettings {
  set: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void
  bump: (key: keyof typeof READER_LIMITS, direction: 1 | -1) => void
  reset: () => void
}

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set, get) => ({
      ...READER_DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<ReaderSettings>),
      bump: (key, direction) => {
        const { min, max, step } = READER_LIMITS[key]
        const next = Math.round((get()[key] + step * direction) * 100) / 100
        set({ [key]: clamp(next, min, max) } as Partial<ReaderSettings>)
      },
      reset: () => set({ ...READER_DEFAULTS }),
    }),
    { name: 'mindclass-reader', version: 1 }
  )
)
