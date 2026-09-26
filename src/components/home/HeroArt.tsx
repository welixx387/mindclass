import { motion } from 'framer-motion'
import { BookmarkCheck, MessageCircle, Ribbon, TrendingUp } from 'lucide-react'
import { useId } from 'react'
import { HERO_ART, THEME_NAME } from '../../lib/art'
import { SparkleShape } from '../brand/Motif'
import { TiltCard } from '../catalog/VolumeCard'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Эмблема, которая показывается, пока в src/assets/art нет своего арта:
 * глянцевое сердце с бантом, орбитой искр и лёгким «глитчем».
 */
export function HeartEmblem({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="absolute inset-[12%] rounded-full border border-dashed border-white/25" style={{ animation: 'spin-slow 40s linear infinite' }} />
      <div className="absolute inset-[24%] rounded-full border border-white/15" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute inset-[12%]" style={{ animation: `spin-slow ${18 + i * 6}s linear infinite`, animationDelay: `-${i * 4}s` }}>
          <SparkleShape size={10 + i * 3} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 text-white/80" />
        </div>
      ))}
      <svg viewBox="0 0 200 180" className="relative w-[58%] drop-shadow-[0_18px_40px_rgba(255,60,150,0.55)]" style={{ animation: 'heartbeat 2.6s ease-in-out infinite' }}>
        <defs>
          <linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd1e6" />
            <stop offset="45%" stopColor="#ff5ea8" />
            <stop offset="100%" stopColor="#b3165e" />
          </linearGradient>
          <radialGradient id={`s${id}`} cx="30%" cy="25%" r="45%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M100 172C42 128 6 96 6 56 6 26 29 6 56 6c20 0 35 10 44 26C109 16 124 6 144 6c27 0 50 20 50 50 0 40-36 72-94 116Z"
          fill={`url(#h${id})`}
        />
        <path d="M100 172C42 128 6 96 6 56 6 26 29 6 56 6c20 0 35 10 44 26C109 16 124 6 144 6c27 0 50 20 50 50 0 40-36 72-94 116Z" fill={`url(#s${id})`} />
        <ellipse cx="55" cy="45" rx="22" ry="12" fill="#fff" opacity="0.45" transform="rotate(-30 55 45)" />
      </svg>
      <div className="absolute left-[22%] top-[24%] -rotate-12 rounded-full bg-white/90 p-2 text-[#e0337f] shadow-lg">
        <Ribbon size={22} strokeWidth={2.2} />
      </div>
    </div>
  )
}

function FloatingChip({ children, className, delay, float }: { children: React.ReactNode; className: string; delay: number; float: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: EASE }}
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

/** Карточка в герое главной: свой арт владельца сайта или эмблема. */
export function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-[440px] select-none px-6 py-6 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: 6, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <TiltCard intensity={9} className="rounded-[34px]">
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[34px] p-[3px] shadow-glow"
            style={{ background: 'linear-gradient(140deg, #ffd1e6, rgb(var(--accent)), rgb(var(--accent-2)))' }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[31px]" style={{ background: 'linear-gradient(160deg, #2a0f24, #150a18 60%, #24102e)' }}>
              {HERO_ART ? (
                <img src={HERO_ART} alt={THEME_NAME} className="h-full w-full object-cover" />
              ) : (
                <>
                  <div className="bg-dots absolute inset-0 opacity-80 [mask-image:none]" />
                  <HeartEmblem className="absolute inset-0" />
                </>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute right-5 top-5 font-display text-[10px] uppercase tracking-[0.25em] text-white/70">MindClass</span>
              <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 px-3.5 py-2 text-[#2c1226] shadow-lg">
                <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#e0337f]">тема оформления</p>
                <p className="font-display text-sm font-semibold">{THEME_NAME}</p>
              </div>
            </div>
          </div>
        </TiltCard>
      </motion.div>

      <FloatingChip className="-left-4 top-[7%]" delay={0.6} float={6}>
        <TrendingUp size={15} className="text-accent" />
        <span>
          Том 3 · <b className="font-semibold text-ink">64%</b>
        </span>
      </FloatingChip>
      <FloatingChip className="-right-6 top-[38%]" delay={0.9} float={7}>
        <BookmarkCheck size={15} className="text-success" />
        <span>Закладка сохранена</span>
      </FloatingChip>
      <FloatingChip className="-right-10 top-[58%]" delay={1.2} float={8}>
        <MessageCircle size={15} className="text-gold" />
        <span>
          <span className="spoiler revealed px-1">спойлер</span> скрыт от читателей
        </span>
      </FloatingChip>
    </div>
  )
}
