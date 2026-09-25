import { motion } from 'framer-motion'
import { AlignJustify, AlignLeft, Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  READER_FONTS,
  READER_LIMITS,
  READER_THEMES,
  useReaderSettings,
  type ReaderSettings,
} from '../../store/readerSettings'

function Row({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {value !== undefined && <span className="text-xs tabular-nums text-muted">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Stepper({ k, format }: { k: keyof typeof READER_LIMITS; format: (v: number) => string }) {
  const value = useReaderSettings((s) => s[k])
  const set = useReaderSettings((s) => s.set)
  const bump = useReaderSettings((s) => s.bump)
  const { min, max, step } = READER_LIMITS[k]
  return (
    <div className="flex items-center gap-3">
      <button className="icon-btn h-9 w-9 border border-line" onClick={() => bump(k, -1)} disabled={value <= min} aria-label="Меньше">
        <Minus size={15} />
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(k, Number(e.target.value) as ReaderSettings[typeof k])}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[rgb(var(--accent))]"
        aria-label={format(value)}
      />
      <button className="icon-btn h-9 w-9 border border-line" onClick={() => bump(k, 1)} disabled={value >= max} aria-label="Больше">
        <Plus size={15} />
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm text-ink-2"
    >
      {label}
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${checked ? 'right-1' : 'left-1'}`}
        />
      </span>
    </button>
  )
}

export function ReaderSettingsPanel() {
  const s = useReaderSettings()
  const font = READER_FONTS.find((f) => f.id === s.font) ?? READER_FONTS[0]

  return (
    <div className="-mt-2 divide-y divide-line/60">
      <div
        className="mb-2 rounded-2xl border border-line bg-surface-2/50 p-4 text-ink"
        style={{ fontFamily: `${font.css}, serif`, fontSize: Math.min(s.size, 22), lineHeight: s.leading, textAlign: s.align }}
      >
        Хороший текст не спорит с читателем — он просто открывается ему строка за строкой.
      </div>

      <Row label="Тема">
        <div className="grid grid-cols-5 gap-2">
          {READER_THEMES.map((t) => (
            <button key={t.id} onClick={() => s.set('theme', t.id)} className="group flex flex-col items-center gap-1.5" aria-pressed={s.theme === t.id}>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-transform group-hover:scale-105 ${
                  s.theme === t.id ? 'border-accent ring-2 ring-accent/40' : 'border-line'
                }`}
                style={{ background: t.swatch, color: t.ink }}
              >
                Аа
              </span>
              <span className="text-center text-[10.5px] leading-tight text-muted">{t.label}</span>
            </button>
          ))}
        </div>
      </Row>

      <Row label="Шрифт">
        <div className="grid grid-cols-2 gap-2">
          {READER_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => s.set('font', f.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                s.font === f.id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-2 hover:border-ink-2/40'
              }`}
              style={{ fontFamily: `${f.css}, serif` }}
            >
              <span className="block text-lg leading-none">Аа</span>
              <span className="mt-1 block font-sans text-xs">{f.label}</span>
            </button>
          ))}
        </div>
      </Row>

      <Row label="Размер текста" value={`${s.size} px`}>
        <Stepper k="size" format={(v) => `Размер ${v}`} />
      </Row>

      <Row label="Межстрочный интервал" value={s.leading.toFixed(2)}>
        <Stepper k="leading" format={(v) => `Интервал ${v}`} />
      </Row>

      <Row label="Отступ между абзацами" value={`${s.gap.toFixed(1)} em`}>
        <Stepper k="gap" format={(v) => `Отступ ${v}`} />
      </Row>

      <div className="hidden sm:block">
        <Row label="Ширина колонки" value={`${s.width} px`}>
          <Stepper k="width" format={(v) => `Ширина ${v}`} />
        </Row>
      </div>

      <Row label="Выравнивание">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'left', label: 'По левому краю', icon: AlignLeft },
              { id: 'justify', label: 'По ширине', icon: AlignJustify },
            ] as const
          ).map((a) => (
            <button
              key={a.id}
              onClick={() => s.set('align', a.id)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                s.align === a.id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-2 hover:border-ink-2/40'
              }`}
            >
              <a.icon size={15} /> {a.label}
            </button>
          ))}
        </div>
      </Row>

      <div className="py-2">
        <Toggle label="Красная строка (отступ первой строки)" checked={s.indent} onChange={(v) => s.set('indent', v)} />
        <Toggle label="Прятать панели при прокрутке" checked={s.autoHide} onChange={(v) => s.set('autoHide', v)} />
      </div>

      <div className="pt-4">
        <button className="btn-ghost w-full" onClick={s.reset}>
          <RotateCcw size={15} /> Сбросить настройки
        </button>
      </div>
    </div>
  )
}
