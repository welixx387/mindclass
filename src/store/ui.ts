import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SiteTheme = 'dark' | 'light'

interface UiState {
  theme: SiteTheme
  searchOpen: boolean
  setTheme: (theme: SiteTheme) => void
  toggleTheme: () => void
  setSearchOpen: (open: boolean) => void
}

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      searchOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
    }),
    {
      // Ключ читается и в index.html — чтобы тема применялась до отрисовки.
      name: 'mindclass-ui',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)

export function applyTheme(theme: SiteTheme) {
  const root = document.documentElement
  root.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme === 'dark' ? '#07080c' : '#f5f5f2')
}
