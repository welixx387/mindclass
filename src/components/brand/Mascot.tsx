import { useId } from 'react'

/**
 * Лина — собственная героиня-талисман MindClass (оригинальный персонаж,
 * не из ранобэ): тёмное каре с чёлкой, круглые очки, янтарные глаза,
 * заколка-сакура, кремовый кардиган и раскрытая книга с закладкой.
 * Нарисована векторами, моргает и чуть покачивается.
 */
export function Mascot({
  className = '',
  animated = true,
  title = 'Лина — талисман MindClass',
  viewBox = '0 0 400 500',
}: {
  className?: string
  animated?: boolean
  title?: string
  /** Кадрирование: по умолчанию вся фигура, можно взять крупнее. */
  viewBox?: string
}) {
  const id = useId().replace(/:/g, '')
  const g = (name: string) => `${name}${id}`

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={g('hair')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f2049" />
          <stop offset="55%" stopColor="#26122e" />
          <stop offset="100%" stopColor="#1a0c20" />
        </linearGradient>
        <linearGradient id={g('hairBack')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f1638" />
          <stop offset="100%" stopColor="#150a1a" />
        </linearGradient>
        <linearGradient id={g('skin')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffece3" />
          <stop offset="100%" stopColor="#ffd9ca" />
        </linearGradient>
        <radialGradient id={g('iris')} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe29a" />
          <stop offset="55%" stopColor="#f0a044" />
          <stop offset="100%" stopColor="#a4531c" />
        </radialGradient>
        <linearGradient id={g('cardigan')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6ee" />
          <stop offset="100%" stopColor="#f1ddcf" />
        </linearGradient>
        <linearGradient id={g('sweater')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c7b0ff" />
          <stop offset="100%" stopColor="#9c7cf2" />
        </linearGradient>
        <linearGradient id={g('book')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e0337f" />
          <stop offset="50%" stopColor="#ff6fae" />
          <stop offset="100%" stopColor="#e0337f" />
        </linearGradient>
        <linearGradient id={g('lens')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <g className={animated ? 'mascot-sway' : undefined}>
        {/* Волосы сзади */}
        <path
          d="M114 196C108 124 156 80 204 80c50 0 94 42 86 116-3 44 4 88 16 122-24 10-48 4-60-10v-54H154v54c-12 14-36 20-60 10 12-34 22-78 20-122Z"
          fill={`url(#${g('hairBack')})`}
        />

        {/* Туловище: кардиган и свитер */}
        <path d="M66 500c4-82 46-128 110-148l24 8 24-8c64 20 106 66 110 148Z" fill={`url(#${g('cardigan')})`} />
        <path d="M176 352c10-6 38-6 48 0l-20 148h-8Z" fill={`url(#${g('sweater')})`} />
        <path d="M176 352c-8 26-6 90 20 148M224 352c8 26 6 90-20 148" fill="none" stroke="#e6cdbd" strokeWidth="3" strokeLinecap="round" />
        <circle cx="189" cy="410" r="3.2" fill="#e7a9c2" />
        <circle cx="187" cy="440" r="3.2" fill="#e7a9c2" />

        {/* Шея */}
        <path d="M184 286v44c8 7 24 7 32 0v-44Z" fill={`url(#${g('skin')})`} />
        <path d="M184 292c8 10 24 10 32 0v14c-8 8-24 8-32 0Z" fill="#f2c2b1" />

        {/* Уши */}
        <ellipse cx="143" cy="218" rx="9" ry="14" fill="#ffd9ca" />
        <ellipse cx="257" cy="218" rx="9" ry="14" fill="#ffd9ca" />

        {/* Лицо */}
        <path
          d="M142 200c0-50 26-78 58-78s58 28 58 78c0 36-12 68-36 90-10 9-16 12-22 12s-12-3-22-12c-24-22-36-54-36-90Z"
          fill={`url(#${g('skin')})`}
        />

        {/* Румянец */}
        <ellipse cx="162" cy="252" rx="13" ry="6.5" fill="#ff8fb3" opacity="0.42" />
        <ellipse cx="238" cy="252" rx="13" ry="6.5" fill="#ff8fb3" opacity="0.42" />

        {/* Брови */}
        <path d="M160 196c8-4 18-4 26 0M214 196c8-4 18-4 26 0" fill="none" stroke="#3a1d2c" strokeWidth="2.6" strokeLinecap="round" />

        {/* Глаза */}
        <g className={animated ? 'mascot-blink' : undefined}>
          {[172, 228].map((cx, i) => (
            <g key={cx}>
              <ellipse cx={cx} cy="226" rx="14.5" ry="13" fill="#ffffff" />
              <ellipse cx={cx + (i ? -1 : 1)} cy="227" rx="10.5" ry="12.5" fill={`url(#${g('iris')})`} />
              <ellipse cx={cx + (i ? -1 : 1)} cy="228" rx="5" ry="7" fill="#4a2410" />
              <circle cx={cx + (i ? -5 : 5)} cy="221" r="3.6" fill="#ffffff" />
              <circle cx={cx + (i ? 3 : -3)} cy="233" r="1.8" fill="#ffffff" opacity="0.85" />
              <path
                d={i ? `M${cx - 16} 219c6-9 24-10 32-1l4-3` : `M${cx + 16} 219c-6-9-24-10-32-1l-4-3`}
                fill="none"
                stroke="#2a1420"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d={`M${cx - 9} 239c6 3 12 3 18 0`} fill="none" stroke="#2a1420" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
            </g>
          ))}
        </g>

        {/* Очки */}
        <g fill={`url(#${g('lens')})`} stroke="#3a1d2c" strokeWidth="2.6">
          <circle cx="172" cy="226" r="21" />
          <circle cx="228" cy="226" r="21" />
        </g>
        <path d="M193 224c4-4 10-4 14 0M151 222l-8-4M249 222l8-4" fill="none" stroke="#3a1d2c" strokeWidth="2.6" strokeLinecap="round" />

        {/* Нос и губы */}
        <path d="M199 248c2 2 3 4 1 5" fill="none" stroke="#e6a996" strokeWidth="2" strokeLinecap="round" />
        <path d="M189 267c7 6 15 6 23-3" fill="none" stroke="#c2566f" strokeWidth="2.6" strokeLinecap="round" />

        {/* Волосы спереди: макушка и ровная чёлка */}
        <path
          d="M126 206C118 138 158 96 202 96c46 0 84 42 74 110-4-14-8-22-12-28-2 18-10 32-22-8-2 24-10 42-24-2-2 26-12 46-26 0-2 26-12 44-26 2-2 24-12 40-22 8-4 12-10 22-18 28Z"
          fill={`url(#${g('hair')})`}
        />
        <path d="M126 206c-4 38 0 74 16 98 4-28 4-64 8-96ZM276 206c4 38 0 74-16 98-4-28-4-64-8-96Z" fill={`url(#${g('hair')})`} />
        <path d="M150 134c14-20 40-30 64-28-26 6-46 16-58 34Z" fill="#b184c0" opacity="0.5" />
        <path d="M224 108c12 2 24 8 32 16-10-4-20-8-32-10Z" fill="#b184c0" opacity="0.35" />
        <path d="M140 150c6-18 18-30 30-36-8 10-14 22-18 38ZM262 150c-6-18-18-30-30-36 8 10 14 22 18 38Z" fill="#6d3f7a" opacity="0.5" />

        {/* Заколка-сакура */}
        <g transform="translate(252 174) rotate(12)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-8" rx="5.5" ry="8.5" fill="#ff9cc8" transform={`rotate(${a})`} />
          ))}
          <circle r="4" fill="#ffd36e" />
        </g>

        {/* Руки и книга */}
        <path d="M76 474c6-50 26-78 56-80 8 20 12 48 14 70-14 14-44 20-70 10Z" fill={`url(#${g('cardigan')})`} />
        <path d="M324 474c-6-50-26-78-56-80-8 20-12 48-14 70 14 14 44 20 70 10Z" fill={`url(#${g('cardigan')})`} />
        <path d="M120 424c38-12 66-8 80 6 14-14 42-18 80-6v64c-38-10-66-6-80 8-14-14-42-18-80-8Z" fill={`url(#${g('book')})`} />
        <path d="M128 420c34-10 58-6 72 6v58c-14-10-38-14-72-6Z" fill="#fffaf5" />
        <path d="M272 420c-34-10-58-6-72 6v58c14-10 38-14 72-6Z" fill="#fff3ea" />
        <path d="M140 436c20-4 38-2 50 4M140 450c20-4 38-2 50 4M140 464c20-4 34-2 46 4M210 440c12-6 30-8 50-4M210 454c12-6 30-8 50-4M214 468c12-6 26-8 46-4" fill="none" stroke="#e8d4c8" strokeWidth="2" strokeLinecap="round" />
        <path d="M204 482v18l5-6 5 6v-22Z" fill="#e0337f" />
        <ellipse cx="140" cy="470" rx="15" ry="11" fill="#ffd9ca" />
        <ellipse cx="260" cy="470" rx="15" ry="11" fill="#ffd9ca" />
      </g>
    </svg>
  )
}
