import { memo, useId, useMemo } from 'react'
import { getYear, volumeIndexInYear, type Volume } from '../../data/catalog'
import { Motif } from '../brand/Motif'

/**
 * Обложка тома, нарисованная кодом: горошек, глянцевый блик, лента с годом,
 * большой номер и значок тома. Основные тома — насыщенные (1 год — сиреневый,
 * 2 год — розовый), половинные (сборники историй) — светлые.
 * Если у тома указан `cover`, показывается картинка.
 */

const YEAR_HUE: Record<number, number> = { 1: 268, 2: 332, 3: 20 }

const W = 300
const H = 420

const SPARKLE_PATH = 'M12 0c.7 6.3 5.7 11.3 12 12-6.3.7-11.3 5.7-12 12-.7-6.3-5.7-11.3-12-12C6.3 11.3 11.3 6.3 12 0Z'
const HEART_PATH = 'M12 21C5 16 1 12.4 1 8 1 4.7 3.6 2 6.8 2c2.1 0 3.9 1.1 5.2 2.9C13.3 3.1 15.1 2 17.2 2 20.4 2 23 4.7 23 8c0 4.4-4 8-11 13Z'

// Россыпь мелкого декора: у каждого тома своя, но всегда одинаковая.
function decor(index: number) {
  const spots = [
    { x: 40, y: 150, s: 0.7 },
    { x: 248, y: 118, s: 0.55 },
    { x: 232, y: 300, s: 0.8 },
    { x: 58, y: 318, s: 0.5 },
    { x: 150, y: 88, s: 0.45 },
    { x: 262, y: 222, s: 0.6 },
  ]
  return spots.map((spot, i) => ({ ...spot, heart: (i + index) % 3 === 0 })).filter((_, i) => (i + index) % 4 !== 1)
}

export const VolumeCover = memo(function VolumeCover({
  volume,
  className = '',
  showMeta = true,
}: {
  volume: Volume
  className?: string
  showMeta?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const index = volumeIndexInYear(volume)
  const year = getYear(volume.year)
  const side = volume.kind === 'side'

  const palette = useMemo(() => {
    const hue = (YEAR_HUE[volume.year] ?? 300) + ((index % 5) - 2) * 6
    return side
      ? {
          from: `hsl(${hue} 60% 98%)`,
          to: `hsl(${hue} 70% 90%)`,
          glow: `hsl(${hue} 90% 66%)`,
          ink: `hsl(${hue} 45% 20%)`,
          soft: `hsl(${hue} 30% 38% / 0.8)`,
          motif: `hsl(${hue} 80% 55%)`,
          dot: `hsl(${hue} 85% 62% / 0.28)`,
          numberFrom: `hsl(${hue} 70% 58%)`,
          numberTo: `hsl(${hue} 65% 38%)`,
          band: `hsl(${hue} 85% 60%)`,
          bandInk: '#ffffff',
          decor: `hsl(${hue} 85% 66% / 0.8)`,
        }
      : {
          from: `hsl(${hue} 55% 14%)`,
          to: `hsl(${hue} 75% 42%)`,
          glow: `hsl(${hue} 95% 70%)`,
          ink: '#ffffff',
          soft: 'rgba(255,255,255,0.72)',
          motif: '#ffffff',
          dot: 'rgba(255,255,255,0.13)',
          numberFrom: '#ffffff',
          numberTo: `hsl(${hue} 100% 88%)`,
          band: '#ffffff',
          bandInk: `hsl(${hue} 70% 35%)`,
          decor: 'rgba(255,255,255,0.75)',
        }
  }, [volume.year, index, side])

  if (volume.cover) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <img src={volume.cover} alt={`Обложка: ${year?.short ?? ''}, том ${volume.number}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }

  const angle = 20 + (index % 4) * 14
  // Длинная тема («Культурный фестиваль») занимает всю нижнюю строку.
  const longTheme = volume.theme.length > 13

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`block h-auto w-full ${className}`}
      role="img"
      aria-label={`Обложка: ${year?.short ?? ''}, том ${volume.number}`}
    >
      <defs>
        <linearGradient id={`bg${uid}`} gradientTransform={`rotate(${angle} .5 .5)`}>
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.glow} stopOpacity={side ? 0.45 : 0.6} />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
        <pattern id={`dots${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" fill={palette.dot} />
          <circle cx="13" cy="13" r="1.6" fill={palette.dot} />
        </pattern>
        <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`dotsMask${uid}`}>
          <rect width={W} height={H} fill={`url(#fade${uid})`} />
        </mask>
        <linearGradient id={`shine${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="48%" stopColor="white" stopOpacity={side ? 0.35 : 0.14} />
          <stop offset="52%" stopColor="white" stopOpacity={side ? 0.35 : 0.14} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`num${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.numberFrom} />
          <stop offset="100%" stopColor={palette.numberTo} />
        </linearGradient>
        <filter id={`blur${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <clipPath id={`clip${uid}`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip${uid})`}>
        <rect width={W} height={H} fill={`url(#bg${uid})`} />
        <rect width={W} height={H} fill={`url(#dots${uid})`} mask={`url(#dotsMask${uid})`} />
        <circle cx={W / 2} cy={222} r={150} fill={`url(#glow${uid})`} />

        {/* Кольца вокруг значка */}
        <g fill="none" stroke={side ? palette.dot : 'rgba(255,255,255,0.18)'} strokeWidth="1.2">
          <circle cx={W / 2} cy={214} r={92} />
          <circle cx={W / 2} cy={214} r={120} strokeDasharray="3 7" />
        </g>

        {/* Значок тома со свечением */}
        <g opacity={side ? 0.45 : 0.85} filter={`url(#blur${uid})`}>
          <Motif name={volume.motif} x={W / 2 - 70} y={144} width={140} height={140} color={palette.glow} strokeWidth={2.2} />
        </g>
        <Motif name={volume.motif} x={W / 2 - 70} y={144} width={140} height={140} color={palette.motif} strokeWidth={1.25} />

        {/* Мелкие сердечки и искры */}
        {decor(index).map((d, i) => (
          <path
            key={i}
            d={d.heart ? HEART_PATH : SPARKLE_PATH}
            fill={palette.decor}
            transform={`translate(${d.x} ${d.y}) scale(${d.s}) translate(-12 -12)`}
          />
        ))}

        {/* Глянцевый блик */}
        <rect x={-W} y={0} width={W * 3} height={70} fill={`url(#shine${uid})`} transform={`rotate(-28 ${W / 2} ${H / 2}) translate(0 ${60 + (index % 3) * 30})`} />

        {/* Лента с годом в углу */}
        {/* После поворота на 45° видимая часть ленты — вокруг x = 0. */}
        <g transform={`translate(${W} 0) rotate(45)`}>
          <rect x={-90} y={40} width={180} height={24} fill={palette.band} opacity={side ? 0.95 : 0.92} />
          {showMeta && (
            <text x={0} y={56} fontSize="10" letterSpacing="2.4" fill={palette.bandInk} textAnchor="middle" fontWeight="700" fontFamily="Unbounded, Manrope, sans-serif">
              {(year?.short ?? '').toUpperCase()}
            </text>
          )}
        </g>
      </g>

      {showMeta && (
        <g fontFamily="Unbounded, Manrope, sans-serif">
          <text x="22" y="40" fontSize="11" letterSpacing="4" fill={palette.soft} fontWeight="500">
            ТОМ
          </text>
          <text x="18" y="108" fontSize={volume.number.length > 3 ? 62 : 76} fontWeight="700" fill={`url(#num${uid})`} letterSpacing="-2">
            {volume.number}
          </text>
          <text
            x="22"
            y={H - 26}
            fontSize={longTheme ? 10.5 : 12}
            letterSpacing={longTheme ? 1.6 : 2.4}
            fill={palette.ink}
            fontWeight="600"
          >
            {volume.theme.toUpperCase()}
          </text>
          {!longTheme && (
            <text x={W - 22} y={H - 26} fontSize="8.5" letterSpacing="2.2" fill={palette.soft} textAnchor="end">
              MINDCLASS
            </text>
          )}
          {side && (
            <text x={W - 22} y={H - 44} fontSize="8.5" letterSpacing="2" fill={palette.soft} textAnchor="end">
              ИСТОРИИ
            </text>
          )}
        </g>
      )}
    </svg>
  )
})
