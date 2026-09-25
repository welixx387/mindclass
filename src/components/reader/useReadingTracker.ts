import { useMotionValue, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface Options {
  container: RefObject<HTMLElement | null>
  /** Меняется при смене настроек текста — нужно перемерить абзацы. */
  layoutKey: string
  autoHide: boolean
  onSave: (paragraph: number, percent: number) => void
}

export interface ReadingState {
  progress: MotionValue<number>
  percent: number
  paragraph: number
  chromeVisible: boolean
  setChromeVisible: (v: boolean) => void
  /** Абзац, который сейчас у верхнего края экрана. */
  currentParagraph: () => number
  /** Сохранить прямо сейчас (при уходе со страницы). */
  flush: () => void
  /** Отметить, что пользователь действительно читал — до этого прогресс не пишется. */
  markEngaged: () => void
}

const TOP_OFFSET = 96
const SAVE_EVERY_MS = 5000

export function useReadingTracker({ container, layoutKey, autoHide, onSave }: Options): ReadingState {
  const progress = useMotionValue(0)
  const [percent, setPercent] = useState(0)
  const [paragraph, setParagraph] = useState(0)
  const [chromeVisible, setChromeVisible] = useState(true)

  const offsets = useRef<number[]>([])
  const bounds = useRef({ start: 0, end: 1 })
  const state = useRef({ percent: 0, paragraph: 0, lastY: 0, engaged: false, lastSaved: 0, savedPercent: -1, savedParagraph: -1 })
  const saveRef = useRef(onSave)
  saveRef.current = onSave

  const measure = useCallback(() => {
    const root = container.current
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('[data-i]')
    const scrollY = window.scrollY
    offsets.current = Array.from(nodes, (n) => n.getBoundingClientRect().top + scrollY)
    const rect = root.getBoundingClientRect()
    const start = rect.top + scrollY - TOP_OFFSET
    const end = rect.bottom + scrollY - window.innerHeight
    bounds.current = { start, end: Math.max(end, start + 1) }
  }, [container])

  const locate = useCallback(() => {
    const list = offsets.current
    const y = window.scrollY + TOP_OFFSET + 8
    let lo = 0
    let hi = list.length - 1
    let found = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (list[mid] <= y) {
        found = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return found
  }, [])

  const save = useCallback((force = false) => {
    const s = state.current
    if (!s.engaged) return
    const now = Date.now()
    const changed = Math.abs(s.percent - s.savedPercent) >= 0.5 || s.paragraph !== s.savedParagraph
    if (!changed || (!force && now - s.lastSaved < SAVE_EVERY_MS)) return
    s.lastSaved = now
    s.savedPercent = s.percent
    s.savedParagraph = s.paragraph
    saveRef.current(s.paragraph, s.percent)
  }, [])

  const update = useCallback(() => {
    const { start, end } = bounds.current
    const y = window.scrollY
    const p = Math.min(1, Math.max(0, (y - start) / (end - start)))
    progress.set(p)
    const s = state.current
    const rounded = Math.round(p * 1000) / 10
    s.percent = rounded
    setPercent((prev) => (Math.abs(prev - rounded) >= 1 || rounded === 100 || rounded === 0 ? rounded : prev))
    const current = locate()
    if (current !== s.paragraph) {
      s.paragraph = current
      setParagraph(current)
    }
    const dy = y - s.lastY
    if (Math.abs(dy) > 40) s.engaged = true
    if (autoHide) {
      if (y < 120 || p > 0.995) setChromeVisible(true)
      else if (dy > 12) setChromeVisible(false)
      else if (dy < -12) setChromeVisible(true)
    }
    if (Math.abs(dy) > 12) s.lastY = y
    save()
  }, [autoHide, locate, progress, save])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      update()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') save(true)
    }
    const onUnload = () => save(true)

    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onUnload)

    // Картинки и шрифты догружаются — позиции абзацев меняются.
    const ro = new ResizeObserver(() => measure())
    if (container.current) ro.observe(container.current)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onUnload)
      ro.disconnect()
    }
  }, [measure, update, save, container])

  useEffect(() => {
    // Настройки шрифта изменились — перемерить после перерисовки.
    const t = setTimeout(() => {
      measure()
      update()
    }, 60)
    return () => clearTimeout(t)
  }, [layoutKey, measure, update])

  useEffect(() => () => save(true), [save])

  return {
    progress,
    percent,
    paragraph,
    chromeVisible,
    setChromeVisible,
    currentParagraph: () => state.current.paragraph,
    flush: () => save(true),
    markEngaged: () => {
      state.current.engaged = true
    },
  }
}
