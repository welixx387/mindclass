import { useEffect, useRef } from 'react'
import { SparkleShape } from '../brand/Motif'

// Лепестки: позиция по горизонтали, размер, скорость, задержка, амплитуда покачивания.
const PETALS = [
  { left: '4%', size: 14, duration: 17, delay: 0, sway: 50, alpha: 0.5 },
  { left: '13%', size: 10, duration: 21, delay: 6, sway: -40, alpha: 0.4 },
  { left: '24%', size: 16, duration: 19, delay: 11, sway: 60, alpha: 0.45 },
  { left: '37%', size: 11, duration: 23, delay: 3, sway: -55, alpha: 0.35 },
  { left: '49%', size: 13, duration: 18, delay: 14, sway: 45, alpha: 0.45 },
  { left: '61%', size: 9, duration: 22, delay: 8, sway: -35, alpha: 0.4 },
  { left: '72%', size: 15, duration: 20, delay: 2, sway: 55, alpha: 0.5 },
  { left: '83%', size: 12, duration: 24, delay: 12, sway: -45, alpha: 0.4 },
  { left: '93%', size: 14, duration: 18, delay: 5, sway: 40, alpha: 0.45 },
]

const SPARKLES = [
  { top: '12%', left: '8%', size: 14, delay: 0 },
  { top: '28%', left: '90%', size: 18, delay: 1.4 },
  { top: '52%', left: '4%', size: 12, delay: 2.2 },
  { top: '68%', left: '86%', size: 16, delay: 3.1 },
  { top: '84%', left: '14%', size: 12, delay: 0.8 },
  { top: '40%', left: '50%', size: 10, delay: 4 },
]

/**
 * Фон сайта: розовый горошек, мягкие светящиеся сферы, падающие лепестки,
 * мерцающие искры и прожектор за курсором.
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
        style={{ top: '-18%', left: '-10%', background: 'rgb(var(--accent) / 0.2)', animation: 'orb-a 20s ease-in-out infinite' }}
      />
      <div
        className="orb h-[40vw] w-[40vw] max-h-[560px] max-w-[560px]"
        style={{ top: '6%', right: '-14%', background: 'rgb(var(--accent-2) / 0.14)', animation: 'orb-b 24s ease-in-out infinite' }}
      />
      <div
        className="orb h-[30vw] w-[30vw] max-h-[420px] max-w-[420px]"
        style={{ bottom: '-12%', left: '30%', background: 'rgb(var(--gold) / 0.1)', animation: 'orb-a 28s ease-in-out infinite reverse' }}
      />
      <div className="bg-dots absolute inset-0" />
      <div
        ref={spot}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(420px circle at var(--x, 50%) var(--y, -20%), rgb(var(--accent) / 0.08), transparent 70%)',
        }}
      />
      <div className="motion-reduce:hidden">
        {PETALS.map((p, i) => (
          <span
            key={i}
            className={`petal ${i % 3 === 2 ? 'hidden md:block' : ''}`}
            style={
              {
                left: p.left,
                '--size': `${p.size}px`,
                '--duration': `${p.duration}s`,
                '--delay': `-${p.delay}s`,
                '--sway': `${p.sway}px`,
                '--alpha': p.alpha,
              } as React.CSSProperties
            }
          />
        ))}
        {SPARKLES.map((s, i) => (
          <SparkleShape
            key={i}
            size={s.size}
            className="absolute hidden text-accent md:block"
            style={{ top: s.top, left: s.left, opacity: 0, animation: `twinkle 4.8s ease-in-out ${s.delay}s infinite` }}
          />
        ))}
      </div>
      <div className="bg-noise absolute inset-0" />
    </div>
  )
}
