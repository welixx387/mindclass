/** @type {import('tailwindcss').Config} */
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Unbounded', 'Manrope', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Literata', 'PT Serif', 'Georgia', 'serif'],
        quote: ['"Cormorant Garamond"', 'Literata', 'Georgia', 'serif'],
      },
      colors: {
        bg: rgb('bg'),
        elev: rgb('bg-elev'),
        surface: rgb('surface'),
        'surface-2': rgb('surface-2'),
        line: rgb('line'),
        ink: rgb('ink'),
        'ink-2': rgb('ink-2'),
        muted: rgb('muted'),
        accent: rgb('accent'),
        gold: rgb('gold'),
        success: rgb('success'),
        danger: rgb('danger'),
        y1: rgb('year-1'),
        y2: rgb('year-2'),
      },
      opacity: {
        12: '0.12',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 10px 40px -10px rgb(var(--accent) / 0.55)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 20px 50px -25px rgb(0 0 0 / 0.6)',
        pop: '0 24px 60px -20px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(var(--line) / 0.9)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}
