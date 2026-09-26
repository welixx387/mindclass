import { memo, useId, useMemo, useState } from 'react'
import { useVolumeCovers } from '../../api/site'
import { getYear, volumeIndexInYear, type Volume } from '../../data/catalog'
import { WIKI_COVERS } from '../../data/wikiCovers'

/**
 * Обложка тома, нарисованная кодом: горошек, глянцевый блик, лента с годом,
 * большой номер и орнамент-розетка, у каждого тома свой. Основные тома — насыщенные (1 год — сиреневый,
 * 2 год — розовый), половинные (сборники историй) — светлые.
 * Фоном становится картинка: своя из «Админки → Обложки», иначе `cover` из
 * каталога, иначе обложка издания с вики. Надписи остаются поверх неё. Если
 * картинка не загрузилась, берётся следующая, а без картинок — узор.
 */

const YEAR_HUE: Record<number, number> = { 1: 268, 2: 332, 3: 20 }

const W = 300
const H = 420

// Центр орнамента.
const CX = W / 2
const CY = 214

/** Розетка: тонкие эллипсы вокруг общего центра, как гильош на банкноте. */
function Rosette({
  r,
  petals,
  squash,
  color,
  width,
  turn = 0,
}: {
  r: number
  petals: number
  /** Насколько сплющен каждый эллипс: чем меньше, тем тоньше лепестки. */
  squash: number
  color: string
  width: number
  turn?: number
}) {
  const step = 180 / petals
  return (
    <g fill="none" stroke={color} strokeWidth={width}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx={CX} cy={CY} rx={r} ry={r * squash} transform={`rotate(${turn + i * step} ${CX} ${CY})`} />
      ))}
    </g>
  )
}

// Вместе с числом лепестков даёт 12 разных розеток.
const SQUASH = [0.34, 0.2, 0.5]

// Россыпь мелкого декора — кольца и точки: у каждого тома своя, но всегда одинаковая.
function decor(index: number) {
  const spots = [
    { x: 40, y: 150, s: 0.7 },
    { x: 248, y: 118, s: 0.55 },
    { x: 232, y: 300, s: 0.8 },
    { x: 58, y: 318, s: 0.5 },
    { x: 150, y: 88, s: 0.45 },
    { x: 262, y: 222, s: 0.6 },
  ]
  return spots.map((spot, i) => ({ ...spot, ring: (i + index) % 3 === 0 })).filter((_, i) => (i + index) % 4 !== 1)
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
  const { covers, ready } = useVolumeCovers()
  const [failed, setFailed] = useState<string[]>([])
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
          ornament: `hsl(${hue} 80% 55%)`,
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
          ornament: '#ffffff',
          dot: 'rgba(255,255,255,0.13)',
          numberFrom: '#ffffff',
          numberTo: `hsl(${hue} 100% 88%)`,
          band: '#ffffff',
          bandInk: `hsl(${hue} 70% 35%)`,
          decor: 'rgba(255,255,255,0.75)',
        }
  }, [volume.year, index, side])

  // Пока неизвестно, есть ли у тома своя картинка, не показываем ни обложку с вики,
  // ни узор, чтобы они не мелькнули перед ней.
  const image = ready ? [covers?.[volume.slug]?.url, volume.cover, WIKI_COVERS[volume.slug]].find((src) => src && !failed.includes(src)) : undefined
  const ornament = ready && !image
  // На картинке надписи всегда светлые: снизу и сверху их подкладывает затемнение.
  const text = image ? { ink: '#ffffff', soft: 'rgba(255,255,255,0.82)' } : palette

  const angle = 20 + (index % 4) * 14
  const petals = 5 + (index % 4)
  const squash = SQUASH[index % 3]
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
          <stop offset="0%" stopColor={image ? '#ffffff' : palette.numberFrom} />
          <stop offset="100%" stopColor={image ? '#ffe3f0' : palette.numberTo} />
        </linearGradient>
        <linearGradient id={`shade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.62" />
          <stop offset="30%" stopColor="#000" stopOpacity="0" />
          <stop offset="66%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.74" />
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
        {image ? (
          <>
            <image href={image} width={W} height={H} preserveAspectRatio="xMidYMid slice" onError={() => setFailed((list) => [...list, image])} />
            {showMeta && <rect width={W} height={H} fill={`url(#shade${uid})`} />}
          </>
        ) : (
          <>
            <rect width={W} height={H} fill={`url(#dots${uid})`} mask={`url(#dotsMask${uid})`} />
            <circle cx={W / 2} cy={222} r={150} fill={`url(#glow${uid})`} />

            {ornament && (
              <>
                {/* Кольца вокруг орнамента */}
                <g fill="none" stroke={side ? palette.dot : 'rgba(255,255,255,0.18)'} strokeWidth="1.2">
                  <circle cx={CX} cy={CY} r={92} />
                  <circle cx={CX} cy={CY} r={120} strokeDasharray="3 7" />
                </g>

                {/* Орнамент со свечением */}
                <g opacity={side ? 0.45 : 0.85} filter={`url(#blur${uid})`}>
                  <Rosette r={66} petals={petals} squash={squash} color={palette.glow} width={2.6} />
                </g>
                <Rosette r={66} petals={petals} squash={squash} color={palette.ornament} width={1.15} />
                <Rosette r={34} petals={petals} squash={0.34} color={palette.ornament} width={1} turn={90 / petals} />
                <circle cx={CX} cy={CY} r={8} fill="none" stroke={palette.ornament} strokeWidth={1.2} />
                <circle cx={CX} cy={CY} r={2.6} fill={palette.ornament} />

                {/* Мелкие кольца и точки */}
                {decor(index).map((d, i) =>
                  d.ring ? (
                    <circle key={i} cx={d.x} cy={d.y} r={9 * d.s} fill="none" stroke={palette.decor} strokeWidth={1.4} />
                  ) : (
                    <circle key={i} cx={d.x} cy={d.y} r={5 * d.s} fill={palette.decor} />
                  ),
                )}
              </>
            )}

            {/* Глянцевый блик */}
            <rect x={-W} y={0} width={W * 3} height={70} fill={`url(#shine${uid})`} transform={`rotate(-28 ${W / 2} ${H / 2}) translate(0 ${60 + (index % 3) * 30})`} />
          </>
        )}

        {/* Лента с годом в углу. После поворота на 45° видимая часть ленты — вокруг x = 0. */}
        {(showMeta || !image) && (
          <g transform={`translate(${W} 0) rotate(45)`}>
            <rect x={-90} y={40} width={180} height={24} fill={palette.band} opacity={side ? 0.95 : 0.92} />
            {showMeta && (
              <text x={0} y={56} fontSize="10" letterSpacing="2.4" fill={palette.bandInk} textAnchor="middle" fontWeight="700" fontFamily="Unbounded, Manrope, sans-serif">
                {(year?.short ?? '').toUpperCase()}
              </text>
            )}
          </g>
        )}
      </g>

      {showMeta && (
        <g fontFamily="Unbounded, Manrope, sans-serif">
          <text x="22" y="40" fontSize="11" letterSpacing="4" fill={text.soft} fontWeight="500">
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
            fill={text.ink}
            fontWeight="600"
          >
            {volume.theme.toUpperCase()}
          </text>
          {!longTheme && (
            <text x={W - 22} y={H - 26} fontSize="8.5" letterSpacing="2.2" fill={text.soft} textAnchor="end">
              MINDCLASS
            </text>
          )}
          {side && (
            <text x={W - 22} y={H - 44} fontSize="8.5" letterSpacing="2" fill={text.soft} textAnchor="end">
              ИСТОРИИ
            </text>
          )}
        </g>
      )}
    </svg>
  )
})
