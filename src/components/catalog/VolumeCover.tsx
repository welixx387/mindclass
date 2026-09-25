import { memo, useId, useMemo } from 'react'
import { getYear, volumeIndexInYear, type Volume } from '../../data/catalog'
import { ChessPiece } from '../brand/ChessPiece'

/**
 * Обложка тома, нарисованная кодом: шахматная доска в перспективе, фигура
 * и номер тома. Основные тома — тёмные, половинные (сборники историй) —
 * светлые, как «белая комната». Если у тома указан `cover`, показывается картинка.
 */

const YEAR_HUE: Record<number, number> = { 1: 352, 2: 228, 3: 40 }

const W = 300
const H = 420

function projectBoard() {
  // Камера над плоскостью доски: x = cx + f·X/Z, y = horizon + f·h/Z.
  const f = 120
  const h = 1.6
  const horizon = 236
  const cx = W / 2
  const p = (X: number, Z: number) => [cx + (f * X) / Z, horizon + (f * h) / Z] as const
  const cells: { d: string; dark: boolean }[] = []
  for (let z = 1; z < 9; z++) {
    for (let x = -7; x < 7; x++) {
      const pts = [p(x, z), p(x + 1, z), p(x + 1, z + 1), p(x, z + 1)]
      cells.push({
        d: `M${pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join('L')}Z`,
        dark: (x + z) % 2 === 0,
      })
    }
  }
  return { cells, horizon }
}

const BOARD = projectBoard()

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
    const hue = (YEAR_HUE[volume.year] ?? 200) + ((index % 5) - 2) * 7
    return side
      ? {
          from: `hsl(${hue} 18% 95%)`,
          to: `hsl(${hue} 22% 84%)`,
          glow: `hsl(${hue} 85% 60%)`,
          ink: '#14151b',
          soft: 'rgba(20,21,27,0.55)',
          piece: `hsl(${hue} 70% 42%)`,
          cell: 'rgba(20,21,27,0.08)',
          line: 'rgba(20,21,27,0.12)',
          numberTo: `hsl(${hue} 70% 40%)`,
          vignette: 'rgba(240,238,232,0)',
        }
      : {
          from: `hsl(${hue} 45% 7%)`,
          to: `hsl(${hue} 62% 24%)`,
          glow: `hsl(${hue} 90% 58%)`,
          ink: '#ffffff',
          soft: 'rgba(255,255,255,0.62)',
          piece: '#ffffff',
          cell: 'rgba(255,255,255,0.07)',
          line: 'rgba(255,255,255,0.10)',
          numberTo: `hsl(${hue} 95% 82%)`,
          vignette: 'rgba(4,5,8,0.75)',
        }
  }, [volume.year, index, side])

  if (volume.cover) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <img src={volume.cover} alt={`Обложка: ${year?.short ?? ''}, том ${volume.number}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }

  const angle = 25 + (index % 4) * 12

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
        <radialGradient id={`glow${uid}`} cx="50%" cy="52%" r="45%">
          <stop offset="0%" stopColor={palette.glow} stopOpacity={side ? 0.35 : 0.55} />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="35%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id={`boardMask${uid}`}>
          <rect x="0" y={BOARD.horizon + 18} width={W} height={H} fill={`url(#fade${uid})`} />
        </mask>
        <linearGradient id={`num${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.ink} />
          <stop offset="100%" stopColor={palette.numberTo} />
        </linearGradient>
        <linearGradient id={`vig${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor={palette.vignette} stopOpacity="0" />
          <stop offset="100%" stopColor={palette.vignette} stopOpacity="1" />
        </linearGradient>
        <filter id={`blur${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#bg${uid})`} />
      <circle cx={W / 2} cy={218} r={170} fill={`url(#glow${uid})`} />

      {/* Орбиты за фигурой */}
      <g fill="none" stroke={palette.line} strokeWidth="1">
        <circle cx={W / 2} cy={210} r={96} />
        <circle cx={W / 2} cy={210} r={128} strokeDasharray="2 6" />
      </g>

      {/* Доска в перспективе */}
      <g mask={`url(#boardMask${uid})`}>
        {BOARD.cells.map((c, i) => (
          <path key={i} d={c.d} fill={c.dark ? palette.cell : 'transparent'} stroke={palette.line} strokeWidth="0.6" />
        ))}
      </g>

      {/* Фигура со свечением */}
      <g opacity={side ? 0.35 : 0.8} filter={`url(#blur${uid})`}>
        <ChessPiece piece={volume.piece} x={W / 2 - 78} y={124} width={156} height={156} color={palette.glow} strokeWidth={2} />
      </g>
      <ChessPiece piece={volume.piece} x={W / 2 - 78} y={124} width={156} height={156} color={palette.piece} strokeWidth={1.15} />

      <rect width={W} height={H} fill={`url(#vig${uid})`} />

      {showMeta && (
        <g fontFamily="Unbounded, Manrope, sans-serif">
          <text x="22" y="40" fontSize="11" letterSpacing="4" fill={palette.soft} fontWeight="500">
            ТОМ
          </text>
          <text x="18" y="108" fontSize={volume.number.length > 3 ? 62 : 76} fontWeight="700" fill={`url(#num${uid})`} letterSpacing="-2">
            {volume.number}
          </text>
          <g transform={`translate(${W - 22} 28)`}>
            <text x="0" y="12" fontSize="10.5" letterSpacing="2.5" fill={palette.soft} textAnchor="end" fontWeight="500">
              {(year?.short ?? '').toUpperCase()}
            </text>
          </g>
          <text x="22" y={H - 26} fontSize="12" letterSpacing="2.4" fill={palette.ink} fontWeight="600">
            {volume.theme.toUpperCase()}
          </text>
          <text x={W - 22} y={H - 26} fontSize="8.5" letterSpacing="2.2" fill={palette.soft} textAnchor="end">
            MINDCLASS
          </text>
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
