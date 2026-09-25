import { useEffect, useRef } from 'react'
import type { PieceName } from '../../data/catalog'
import { ChessPiece } from '../brand/ChessPiece'

const FLOATING: { piece: PieceName; top: string; left: string; size: number; duration: number; delay: number; rotate: number }[] = [
  { piece: 'knight', top: '14%', left: '6%', size: 84, duration: 11, delay: 0, rotate: -12 },
  { piece: 'rook', top: '62%', left: '3%', size: 60, duration: 13, delay: 2, rotate: 8 },
  { piece: 'queen', top: '22%', left: '88%', size: 96, duration: 12, delay: 1, rotate: 10 },
  { piece: 'pawn', top: '74%', left: '90%', size: 54, duration: 10, delay: 3, rotate: -6 },
  { piece: 'bishop', top: '46%', left: '94%', size: 48, duration: 14, delay: 4, rotate: 14 },
  { piece: 'king', top: '86%', left: '48%', size: 64, duration: 15, delay: 2.5, rotate: -4 },
]

/**
 * Фон сайта: медленно плывущая сетка «доски», светящиеся сферы, парящие
 * фигуры и мягкий прожектор за курсором.
 */
export function AnimatedBackground() {
  const spot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        spot.current?.style.setProperty('--x', `${e.clientX}px`)
        spot.current?.style.setProperty('--y', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="orb h-[46vw] w-[46vw] max-h-[620px] max-w-[620px]"
        style={{ top: '-18%', left: '-10%', background: 'rgb(var(--accent) / 0.16)', animation: 'orb-a 20s ease-in-out infinite' }}
      />
      <div
        className="orb h-[40vw] w-[40vw] max-h-[560px] max-w-[560px]"
        style={{ top: '8%', right: '-14%', background: 'rgb(var(--year-2) / 0.13)', animation: 'orb-b 24s ease-in-out infinite' }}
      />
      <div className="bg-grid absolute inset-0" />
      <div
        ref={spot}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(420px circle at var(--x, 50%) var(--y, -20%), rgb(var(--accent) / 0.07), transparent 70%)',
        }}
      />
      {FLOATING.map((f, i) => (
        <div
          key={i}
          className="absolute hidden text-ink md:block"
          style={
            {
              top: f.top,
              left: f.left,
              opacity: 0.06,
              '--r': `${f.rotate}deg`,
              animation: `float-piece ${f.duration}s ease-in-out ${f.delay}s infinite`,
            } as React.CSSProperties
          }
        >
          <ChessPiece piece={f.piece} size={f.size} strokeWidth={1.1} />
        </div>
      ))}
      <div className="bg-noise absolute inset-0" />
    </div>
  )
}
