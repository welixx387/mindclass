import { motion } from 'framer-motion'
import { BookmarkCheck, MessageCircle, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useHeroArt } from '../../api/site'
import { objectPosition, type HeroPicture } from '../../lib/heroArt'
import { Mascot } from '../brand/Mascot'
import { TiltCard } from '../catalog/VolumeCard'

const EASE = [0.22, 1, 0.36, 1] as const
export const CARD_BG = 'linear-gradient(160deg, #3a1330, #1a0b1d 55%, #2a1236)'

/** Сцена с талисманом: горошек, мягкий свет и Лина с книгой. */
export function MascotScene({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 38%, rgb(255 120 185 / 0.45), transparent 62%)' }} />
      <div className="bg-dots absolute inset-0 opacity-70 [mask-image:none]" />
      <div className="absolute left-[10%] top-[16%] h-16 w-16 rounded-full bg-white/10 blur-xl" />
      <div className="absolute right-[12%] top-[30%] h-10 w-10 rounded-full bg-[#ffb3d1]/20 blur-lg" />
      <Mascot className="absolute inset-0 h-full w-full" viewBox="36 64 328 410" />
    </div>
  )
}

/** Картинка, которая плавно проявляется, когда загрузится. */
export function ArtImage({ picture, onError }: { picture: HeroPicture; onError?: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      src={picture.src}
      alt={picture.caption}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={{ objectPosition: objectPosition(picture) }}
    />
  )
}

/**
 * Что показать в карточке: арт владельца сайта или (null) талисман.
 * Если картинка не загрузилась, тоже показывается талисман.
 * undefined — настройки оформления ещё загружаются.
 */
export function useHeroPicture() {
  const art = useHeroArt()
  const [failed, setFailed] = useState<string | null>(null)
  const picture = art && art.src === failed ? null : art
  return { picture, onError: () => art && setFailed(art.src) }
}

/** Лицевая сторона карточки: арт или талисман и стикер с подписью. */
export function HeroCardFace({
  picture,
  onError,
  className = 'rounded-[31px]',
}: {
  picture: HeroPicture | null | undefined
  onError?: () => void
  className?: string
}) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: CARD_BG }}>
      {picture === undefined ? null : picture ? (
        <ArtImage key={picture.src} picture={picture} onError={onError} />
      ) : (
        <MascotScene className="absolute inset-0" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="absolute right-5 top-5 font-display text-[10px] uppercase tracking-[0.25em] text-white/70">MindClass</span>
      {picture !== undefined && (
        <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-2xl bg-white/90 px-3.5 py-2 text-[#2c1226] shadow-lg">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-[#e0337f]">{picture ? 'тема оформления' : 'талисман сайта'}</p>
          <p className="truncate font-display text-sm font-semibold">{picture ? picture.caption : 'Лина'}</p>
        </div>
      )}
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

/** Карточка в герое главной: арт владельца сайта или талисман Лина. */
export function HeroArt() {
  const { picture, onError } = useHeroPicture()

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
            <HeroCardFace picture={picture} onError={onError} />
          </div>
        </TiltCard>
      </motion.div>

      <FloatingChip className="-left-4 top-[7%]" delay={0.6} float={6}>
        <TrendingUp size={15} className="text-accent" />
        <span>
          Том 3 · <b className="font-semibold text-ink">64%</b>
        </span>
      </FloatingChip>
      <FloatingChip className="-right-16 top-[34%]" delay={0.9} float={7}>
        <BookmarkCheck size={15} className="text-success" />
        <span>Закладка сохранена</span>
      </FloatingChip>
      <FloatingChip className="-right-20 top-[62%]" delay={1.2} float={8}>
        <MessageCircle size={15} className="text-gold" />
        <span>
          <span className="spoiler revealed px-1">спойлер</span> скрыт от читателей
        </span>
      </FloatingChip>
    </div>
  )
}
