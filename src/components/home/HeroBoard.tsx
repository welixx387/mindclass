import { AnimatePresence, motion } from 'framer-motion'
import { BookmarkCheck, MessageCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PieceName } from '../../data/catalog'
import { ChessPiece } from '../brand/ChessPiece'

/**
 * Живая доска в герое главной страницы: несколько фигур разыгрывают
 * короткую комбинацию, затем позиция возвращается к началу.
 */

type Side = 'w' | 'b'
interface PieceState {
  id: string
  piece: PieceName
  side: Side
  square: string | null
}

const START: PieceState[] = [
  { id: 'wk', piece: 'king', side: 'w', square: 'g1' },
  { id: 'wr', piece: 'rook', side: 'w', square: 'f1' },
  { id: 'wn', piece: 'knight', side: 'w', square: 'f3' },
  { id: 'wb', piece: 'bishop', side: 'w', square: 'c4' },
  { id: 'wp1', piece: 'pawn', side: 'w', square: 'e4' },
  { id: 'wp2', piece: 'pawn', side: 'w', square: 'd3' },
  { id: 'bk', piece: 'king', side: 'b', square: 'g8' },
  { id: 'bq', piece: 'queen', side: 'b', square: 'd8' },
  { id: 'br', piece: 'rook', side: 'b', square: 'f8' },
  { id: 'bp1', piece: 'pawn', side: 'b', square: 'f7' },
  { id: 'bp2', piece: 'pawn', side: 'b', square: 'e5' },
  { id: 'bn', piece: 'knight', side: 'b', square: 'c6' },
]

// Ход: [id фигуры, поле назначения, id съеденной фигуры?]
const MOVES: [string, string, string?][] = [
  ['wn', 'g5'],
  ['bq', 'e7'],
  ['wb', 'f7', 'bp1'],
  ['br', 'f7', 'wb'],
  ['wn', 'f7', 'br'],
  ['bk', 'f7', 'wn'],
  ['wp2', 'd4'],
]

const FILES = 'abcdefgh'

function squareToXY(square: string) {
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1])
  return { x: file, y: 8 - rank }
}

function positionAfter(step: number): PieceState[] {
  const state = START.map((p) => ({ ...p }))
  for (let i = 0; i < step; i++) {
    const [id, to, captured] = MOVES[i]
    if (captured) state.find((p) => p.id === captured)!.square = null
    state.find((p) => p.id === id)!.square = to
  }
  return state
}

export function HeroBoard() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const delay = step === MOVES.length ? 2600 : step === 0 ? 1400 : 1500
    const t = setTimeout(() => setStep((s) => (s >= MOVES.length ? 0 : s + 1)), delay)
    return () => clearTimeout(t)
  }, [step])

  const pieces = positionAfter(step)
  const last = step > 0 ? MOVES[step - 1] : null
  const lastFrom = last ? positionAfter(step - 1).find((p) => p.id === last[0])?.square : null
  const highlight = new Set([last?.[1], lastFrom].filter(Boolean) as string[])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px] select-none">
      <div className="absolute inset-[12%]" style={{ perspective: '1100px' }}>
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          initial={{ rotateX: 70, rotateZ: -60, opacity: 0, scale: 0.8 }}
          animate={{ rotateX: 56, rotateZ: -42, opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Толщина доски */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              transform: 'translateZ(-14px)',
              background: 'linear-gradient(135deg, rgb(var(--accent) / 0.55), rgb(var(--year-2) / 0.35))',
              filter: 'blur(0.5px)',
              boxShadow: '0 60px 80px -30px rgb(0 0 0 / 0.7)',
            }}
          />
          <div className="absolute inset-0 grid grid-cols-8 overflow-hidden rounded-xl ring-1 ring-white/10">
            {Array.from({ length: 64 }, (_, i) => {
              const x = i % 8
              const y = Math.floor(i / 8)
              const square = `${FILES[x]}${8 - y}`
              const dark = (x + y) % 2 === 1
              const lit = highlight.has(square)
              return (
                <div
                  key={square}
                  className="relative transition-colors duration-500"
                  style={{
                    background: lit
                      ? 'rgb(var(--accent) / 0.55)'
                      : dark
                        ? 'rgb(var(--surface-2))'
                        : 'rgb(var(--ink) / 0.14)',
                  }}
                />
              )
            })}
          </div>

          {/* Фигуры стоят вертикально — обратный поворот */}
          {pieces.map((p) => {
            if (!p.square) return null
            const { x, y } = squareToXY(p.square)
            return (
              <motion.div
                key={p.id}
                className="absolute h-[12.5%] w-[12.5%]"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ left: `${x * 12.5}%`, top: `${y * 12.5}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              >
                <div
                  className="absolute bottom-[30%] left-1/2 flex items-end justify-center"
                  style={{ transform: 'translateX(-50%) rotateZ(42deg) rotateX(-56deg)', transformOrigin: 'bottom center' }}
                >
                  <ChessPiece
                    piece={p.piece}
                    size={40}
                    strokeWidth={1.8}
                    color={p.side === 'w' ? 'rgb(var(--piece-light))' : 'rgb(var(--accent))'}
                    fill={p.side === 'w' ? 'rgb(var(--piece-light) / 0.18)' : 'rgb(var(--accent) / 0.25)'}
                    style={{ filter: 'drop-shadow(0 6px 6px rgb(0 0 0 / 0.45))' }}
                  />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Плавающие подсказки интерфейса */}
      <FloatingCard className="left-0 top-[8%]" delay={0.6} float={6}>
        <TrendingUp size={15} className="text-accent" />
        <span>
          Том 3 · <b className="font-semibold text-ink">64%</b>
        </span>
      </FloatingCard>
      <FloatingCard className="right-0 top-[38%]" delay={0.9} float={8}>
        <BookmarkCheck size={15} className="text-success" />
        <span>Закладка сохранена</span>
      </FloatingCard>
      <FloatingCard className="bottom-[6%] left-[6%]" delay={1.2} float={7}>
        <MessageCircle size={15} className="text-gold" />
        <span>
          <span className="spoiler revealed px-1">спойлер</span> скрыт от читателей
        </span>
      </FloatingCard>

      <AnimatePresence>
        {last && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 right-[8%] font-display text-xs tracking-widest text-muted"
          >
            {step}. {pieceLetter(pieces.find((p) => p.id === last[0])!.piece)}
            {last[2] ? '×' : ''}
            {last[1]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function pieceLetter(piece: PieceName) {
  return { king: 'Кр', queen: 'Ф', rook: 'Л', bishop: 'С', knight: 'К', pawn: '' }[piece]
}

function FloatingCard({
  children,
  className,
  delay,
  float,
}: {
  children: React.ReactNode
  className: string
  delay: number
  float: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-10 hidden sm:block ${className}`}
    >
      <div
        className="glass flex items-center gap-2 whitespace-nowrap rounded-2xl border border-line/80 px-3.5 py-2.5 text-[13px] text-ink-2 shadow-pop"
        style={{ animation: `float-card ${float}s ease-in-out ${delay}s infinite` }}
      >
        {children}
      </div>
    </motion.div>
  )
}
